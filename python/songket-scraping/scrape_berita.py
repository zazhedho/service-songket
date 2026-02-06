#!/usr/bin/env python3
import os, sys, json, re, ssl, time, argparse
import urllib.request, urllib.parse, urllib.error
from html.parser import HTMLParser

try:
    import certifi
except Exception:
    certifi = None


def env_true(name: str, default=False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "y", "on")


def build_ssl_context():
    if env_true("SCRAPE_BERITA_INSECURE_SSL", False):
        return ssl._create_unverified_context()
    if certifi is not None:
        try:
            return ssl.create_default_context(cafile=certifi.where())
        except Exception:
            pass
    return ssl.create_default_context()


CTX = build_ssl_context()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36"
    ),
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "close",
}

# -----------------------------
# HTTP helpers
# -----------------------------
def _read_response(resp):
    data = resp.read()
    enc = (resp.headers.get("content-encoding") or "").lower()
    if "gzip" in enc:
        import gzip
        data = gzip.decompress(data)
    ct = (resp.headers.get("content-type") or "").lower()
    return data, ct

def _guess_charset(ct: str) -> str:
    m = re.search(r"charset=([^\s;]+)", ct, flags=re.I)
    return (m.group(1).strip() if m else "utf-8")

def fetch(url: str, timeout=25, max_retries=2, sleep_base=0.6):
    last = None
    for i in range(max_retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS, method="GET")
            with urllib.request.urlopen(req, context=CTX, timeout=timeout) as resp:
                data, ct = _read_response(resp)
                return resp.geturl(), data, ct, getattr(resp, "status", 200)
        except Exception as e:
            if (
                env_true("SCRAPE_BERITA_SSL_FALLBACK_INSECURE", False)
                and isinstance(e, urllib.error.URLError)
                and isinstance(getattr(e, "reason", None), ssl.SSLCertVerificationError)
            ):
                req = urllib.request.Request(url, headers=HEADERS, method="GET")
                with urllib.request.urlopen(req, context=ssl._create_unverified_context(), timeout=timeout) as resp:
                    data, ct = _read_response(resp)
                    return resp.geturl(), data, ct, getattr(resp, "status", 200)
            last = e
            time.sleep(sleep_base * (2 ** i))
    if isinstance(last, urllib.error.URLError) and isinstance(getattr(last, "reason", None), ssl.SSLCertVerificationError):
        raise RuntimeError(
            "SSL verify failed. Install certifi or set SCRAPE_BERITA_INSECURE_SSL=true "
            "(or SCRAPE_BERITA_SSL_FALLBACK_INSECURE=true)."
        ) from last
    raise last

def base_from_url(url: str) -> str:
    p = urllib.parse.urlparse(url)
    scheme = p.scheme or "https"
    return f"{scheme}://{p.netloc}"

def abs_url(href: str, base: str) -> str:
    if not href:
        return ""
    href = href.strip()
    if href.startswith("http://") or href.startswith("https://"):
        return href
    if href.startswith("//"):
        scheme = urllib.parse.urlparse(base).scheme or "https"
        return scheme + ":" + href
    return urllib.parse.urljoin(base + "/", href)

def is_valid_image_url(u: str) -> bool:
    if not u:
        return False
    u = u.strip()
    if u.startswith("data:"):
        return False
    p = urllib.parse.urlparse(u)
    if p.scheme not in ("http", "https"):
        return False
    if not p.netloc:
        return False
    # allow common image ext, but don't require (some CDN urls no ext)
    return True

# -----------------------------
# Homepage link collector
# -----------------------------
class LinkCollector(HTMLParser):
    def __init__(self, base: str):
        super().__init__()
        self.base = base
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        href = None
        for k, v in attrs:
            if k.lower() == "href":
                href = v
                break
        if not href:
            return
        u = abs_url(href, self.base)
        if urllib.parse.urlparse(u).netloc != urllib.parse.urlparse(self.base).netloc:
            return
        self.links.append(u)

def looks_like_article_url(u: str) -> bool:
    p = urllib.parse.urlparse(u)
    path = p.path

    # exclude non-articles
    bad = ("wp-admin", "wp-login", "/tag/", "/category/", "/author/", "/page/")
    if any(b in path for b in bad):
        return False

    # typical wp date path
    if re.search(r"/\d{4}/\d{2}/\d{2}/", path):
        return True

    # long slug fallback
    slug = path.strip("/").split("/")[-1]
    if len(slug) >= 15 and "-" in slug:
        return True
    return False

def scrape_homepage_links(home_url: str, limit: int):
    base = base_from_url(home_url)
    _, data_bytes, ct, _ = fetch(home_url)
    html = data_bytes.decode(_guess_charset(ct), errors="ignore")

    lc = LinkCollector(base)
    lc.feed(html)

    seen, out = set(), []
    for u in lc.links:
        if u in seen:
            continue
        seen.add(u)
        if looks_like_article_url(u):
            out.append(u)
        if len(out) >= limit:
            break
    return out

# -----------------------------
# Article parser (clean text)
# -----------------------------
SKIP_TAGS = {
    "script", "style", "noscript", "svg", "path",
    "header", "footer", "nav", "aside",
    "form", "button", "input", "textarea", "select",
}

CONTENT_SELECTORS_HINT = (
    # WordPress common
    "entry-content",
    "post-content",
    "td-post-content",
    "elementor-widget-theme-post-content",
    "single-content",
    "post-entry",
)

class CleanArticleParser(HTMLParser):
    def __init__(self, base: str):
        super().__init__()
        self.base = base

        self.meta = {}
        self.title_h1 = None
        self.in_h1 = False
        self._h1_buf = []

        self.created_time_tag = None

        self.in_article = False
        self.in_content = False
        self.depth = 0

        self.skip_depth = 0  # inside SKIP_TAGS

        self.text_parts = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        t = tag.lower()
        attrs_dict = {k.lower(): v for k, v in attrs}

        # meta
        if t == "meta":
            prop = (attrs_dict.get("property") or attrs_dict.get("name") or "").lower()
            content = attrs_dict.get("content")
            if prop and content:
                if prop in ("og:title", "og:image", "article:published_time", "og:site_name"):
                    self.meta[prop] = content.strip()

        if t == "link":
            rel = (attrs_dict.get("rel") or "").lower()
            href = attrs_dict.get("href")
            if rel == "canonical" and href:
                self.meta["canonical"] = href.strip()

        if t == "h1":
            self.in_h1 = True
            self._h1_buf = []

        if t == "time":
            dt = attrs_dict.get("datetime")
            if dt and not self.created_time_tag:
                self.created_time_tag = dt.strip()

        # start <article>
        if t == "article" and not self.in_article:
            self.in_article = True
            self.depth = 1

        # detect content container inside article
        if self.in_article and (t in ("div", "section")) and not self.in_content:
            cls = (attrs_dict.get("class") or "").lower()
            if any(h in cls for h in CONTENT_SELECTORS_HINT):
                self.in_content = True
                # content depth uses same depth counter, so no separate

        # update depths
        if self.in_article and t != "article":
            self.depth += 1

        # skip zones
        if t in SKIP_TAGS:
            self.skip_depth += 1

        # images in article/content (avoid layout images outside article)
        if self.in_article and t == "img" and self.skip_depth == 0:
            src = attrs_dict.get("src") or attrs_dict.get("data-src")
            if not src:
                srcset = attrs_dict.get("srcset")
                if srcset:
                    src = srcset.split(",")[0].strip().split(" ")[0].strip()
            if src:
                u = abs_url(src, self.base)
                if is_valid_image_url(u):
                    self.images.append(u)

        # newlines for readability
        if self.in_article and self.skip_depth == 0 and t in ("p", "br", "li", "h2", "h3"):
            self.text_parts.append("\n")

    def handle_endtag(self, tag):
        t = tag.lower()

        if t == "h1" and self.in_h1:
            self.in_h1 = False
            txt = re.sub(r"\s+", " ", "".join(self._h1_buf)).strip()
            if txt and not self.title_h1:
                self.title_h1 = txt
            self._h1_buf = []

        if t in SKIP_TAGS and self.skip_depth > 0:
            self.skip_depth -= 1

        if self.in_article:
            self.depth -= 1
            if t == "article" or self.depth <= 0:
                self.in_article = False
                self.in_content = False
                self.depth = 0

        if self.in_article and self.skip_depth == 0 and t in ("p", "li"):
            self.text_parts.append("\n")

    def handle_data(self, data):
        if self.in_h1:
            self._h1_buf.append(data)

        if self.in_article and self.skip_depth == 0 and data:
            s = data.strip()
            if s:
                self.text_parts.append(s + " ")

    def build(self):
        title = self.meta.get("og:title") or self.title_h1
        created_at = self.meta.get("article:published_time") or self.created_time_tag
        foto_utama = self.meta.get("og:image")

        text = "".join(self.text_parts)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text).strip()

        # de-dupe images
        imgs, seen = [], set()
        for u in self.images:
            if u not in seen:
                seen.add(u)
                imgs.append(u)

        if not foto_utama and imgs:
            foto_utama = imgs[0]
        elif foto_utama:
            fu = abs_url(foto_utama, self.base)
            foto_utama = fu if is_valid_image_url(fu) else None

        return title, created_at, foto_utama, text, imgs

def scrape_article(url: str):
    base = base_from_url(url)
    final_url, data_bytes, ct, _ = fetch(url)
    html = data_bytes.decode(_guess_charset(ct), errors="ignore")

    ap = CleanArticleParser(base)
    ap.feed(html)
    title, created_at, foto_utama, isi, imgs = ap.build()

    # fallback title from <title>
    if not title:
        m = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.I | re.S)
        if m:
            title = re.sub(r"\s+", " ", m.group(1)).strip()

    # sumber = host
    sumber = urllib.parse.urlparse(final_url).netloc

    return {
        "judul": title,
        "isi": isi,
        "images": {
            "foto_utama": foto_utama,
            "dalam_berita": imgs,
        },
        "created_at": created_at,
        "sumber": sumber,
        "url": final_url,
    }

# -----------------------------
# CLI
# -----------------------------
def main():
    pa = argparse.ArgumentParser()
    pa.add_argument("home_url", help="https://suarantb.com/")
    pa.add_argument("--limit", type=int, default=10)
    pa.add_argument("--sleep", type=float, default=0.35)
    pa.add_argument("--only-links", action="store_true")
    args = pa.parse_args()

    links = scrape_homepage_links(args.home_url, limit=args.limit)

    if args.only_links:
        print(json.dumps(links, ensure_ascii=False, indent=2))
        return

    out = []
    for u in links:
        try:
            out.append(scrape_article(u))
        except Exception:
            continue
        time.sleep(args.sleep)

    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
