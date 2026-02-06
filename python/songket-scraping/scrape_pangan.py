#!/usr/bin/env python3
import sys, json, re, ssl, time, html
import argparse
import urllib.request, urllib.parse

CTX = ssl.create_default_context()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36"
    ),
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept": "text/html,application/json,*/*;q=0.8",
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
            last = e
            time.sleep(sleep_base * (2 ** i))
    raise last

def base_from_url(url: str) -> str:
    p = urllib.parse.urlparse(url)
    scheme = p.scheme or "https"
    return f"{scheme}://{p.netloc}"

def abs_url(href: str, base: str) -> str:
    if not href:
        return ""
    href = html.unescape(href.strip())
    if href.startswith("http://") or href.startswith("https://"):
        return href
    if href.startswith("//"):
        scheme = urllib.parse.urlparse(base).scheme or "https"
        return scheme + ":" + href
    return urllib.parse.urljoin(base + "/", href)

# -----------------------------
# DISCOVER: scan HTML + JS untuk URL yang mengandung "/api/"
# (bukan cuma /api di host yang sama)
# -----------------------------
def extract_script_srcs(html_text: str):
    srcs = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html_text, flags=re.I)
    srcs = [html.unescape(s) for s in srcs]
    # uniq preserving order
    seen = set()
    out = []
    for s in srcs:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out

def find_api_urls_anywhere(text: str, base: str):
    """
    Cari kandidat URL API dari text (HTML/JS):
    - absolut: https://.../api/...
    - relatif: /api/... (akan dijadikan absolute pakai base)
    - plus: domain api-panelhargav2... yang kamu sebut
    """
    text = html.unescape(text)
    out = set()

    # absolute URL yang punya /api/
    for m in re.finditer(r'https?://[a-zA-Z0-9\.\-\_]+(?:\:\d+)?/api/[^\s"\'<>\\]+', text):
        out.add(m.group(0))

    # relative /api/...
    for m in re.finditer(r'\/api\/[a-zA-Z0-9\-\_\/\.\?\=\&%]+', text):
        out.add(abs_url(m.group(0), base))

    # heuristik: kalau ada domain api-panelhargav2 tapi tanpa /api/ tertangkap aneh
    for m in re.finditer(r'https?://api-panelhargav2\.badanpangan\.go\.id[^\s"\'<>\\]+', text):
        out.add(m.group(0))

    # bersihin trailing yang kepotong HTML entity
    cleaned = set()
    for u in out:
        u = u.replace("&amp;", "&")
        cleaned.add(u)

    return sorted(cleaned)

def discover_endpoints(page_url: str, max_js=15):
    base = base_from_url(page_url)
    final_url, data_bytes, ct, status = fetch(page_url, timeout=25, max_retries=2)
    html_text = data_bytes.decode(_guess_charset(ct), errors="ignore")

    candidates = set()

    # dari HTML
    for u in find_api_urls_anywhere(html_text, base):
        candidates.add(u)

    # scan JS (yang lokal dulu; tapi tetap boleh CDN)
    script_srcs = extract_script_srcs(html_text)
    script_urls = [abs_url(s, base) for s in script_srcs][:max_js]

    for js_url in script_urls:
        try:
            _, js_bytes, js_ct, _ = fetch(js_url, timeout=25, max_retries=1)
            js_text = js_bytes.decode(_guess_charset(js_ct), errors="ignore")
            for u in find_api_urls_anywhere(js_text, base):
                candidates.add(u)
        except Exception:
            continue

    return {
        "page": page_url,
        "base": base,
        "script_srcs_scanned": script_urls,
        "api_candidates": sorted(candidates),
    }

# -----------------------------
# CALL API
# -----------------------------
def call_api(endpoint: str, params: dict | None = None):
    endpoint = endpoint.replace("&amp;", "&")
    if params:
        q = urllib.parse.urlencode({k: v for k, v in params.items()})
        url = endpoint + ("&" if "?" in endpoint else "?") + q
    else:
        url = endpoint

    final_url, data_bytes, ct, status = fetch(url, timeout=25, max_retries=2)
    text = data_bytes.decode(_guess_charset(ct), errors="ignore")
    try:
        return {"url": final_url, "status": status, "json": json.loads(text)}
    except Exception:
        return {"url": final_url, "status": status, "text": text[:2000]}

# helper khusus endpoint yang kamu kasih
def call_harga_pangan_informasi(
    level_harga_id="1",
    province_id="",
    city_id="",
    endpoint="https://api-panelhargav2.badanpangan.go.id/api/front/harga-pangan-informasi"
):
    params = {
        "province_id": province_id,
        "city_id": city_id,
        "level_harga_id": level_harga_id
    }
    return call_api(endpoint, params=params)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url", help="Contoh: https://panelharga.badanpangan.go.id/beranda")
    ap.add_argument("--discover", action="store_true", help="Scan HTML+JS untuk menemukan kandidat URL API")
    ap.add_argument("--call", default="", help="Panggil endpoint API tertentu (GET)")
    ap.add_argument("--params", default="{}", help='Params GET dalam JSON string. Contoh: \'{"a":"1"}\'')
    ap.add_argument("--harga-pangan", action="store_true", help="Shortcut panggil /api/front/harga-pangan-informasi")
    ap.add_argument("--level_harga_id", default="1", help="Default 1")
    ap.add_argument("--province_id", default="", help="Kosong = nasional/semua (tergantung API)")
    ap.add_argument("--city_id", default="", help="Kosong = semua")
    args = ap.parse_args()

    if args.discover:
        info = discover_endpoints(args.url)
        print(json.dumps(info, ensure_ascii=False, indent=2))
        return

    if args.harga_pangan:
        res = call_harga_pangan_informasi(
            level_harga_id=args.level_harga_id,
            province_id=args.province_id,
            city_id=args.city_id,
        )
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return

    if args.call:
        try:
            params = json.loads(args.params) if args.params else {}
            if not isinstance(params, dict):
                raise ValueError("params harus object/dict")
        except Exception as e:
            print(json.dumps({"error": f"params JSON invalid: {e}"}, ensure_ascii=False))
            sys.exit(1)

        res = call_api(args.call, params=params)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return

    print(json.dumps({
        "error": "Pilih mode: --discover atau --call atau --harga-pangan",
        "examples": [
            "./scrape_pangan.py https://panelharga.badanpangan.go.id/beranda --discover",
            "./scrape_pangan.py https://panelharga.badanpangan.go.id/beranda --harga-pangan --level_harga_id=1",
            "./scrape_pangan.py https://panelharga.badanpangan.go.id/beranda --call https://api-panelhargav2.badanpangan.go.id/api/front/harga-pangan-informasi --params '{\"province_id\":\"\",\"city_id\":\"\",\"level_harga_id\":\"1\"}'"
        ]
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
