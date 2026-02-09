#!/usr/bin/env python3
import sys, json, re, ssl
import urllib.request, urllib.parse
from playwright.sync_api import sync_playwright

HEADERS_SET = {
    "Provinsi",
    "Harga Rata-Rata",
    "Disparitas Terhadap HET(%)",
    "Disparitas Terhadap HET(%) 🔼",
    "Disparitas Terhadap HET(%) 🔽",
}

NOISE_PREFIXES = (
    "beranda",
    "regulasi",
    "profil",
    "peta status harga pangan",
    "grafik perkembangan harga pangan",
    "informasi harga pangan strategis",
    "jenis data panel",
    "konsumen",
    "produsen",
    "pilih wilayah",
    "tampilkan",
    "harga rata-rata komoditas",
    "* harga dibandingkan",
    "peta harga nasional",
    "periode ",
    "intervensi:",
    "provinsi",
    "zona ",
)

CHANGE_RE = re.compile(r"^Harga\s+(Naik|Turun|Tetap)\b", re.I)
PRICE_RE = re.compile(r"^(?:Rp\s*)?[0-9][0-9\.\,]*$", re.I)
API_ENDPOINT = "https://api-panelhargav2.badanpangan.go.id/api/front/harga-pangan-informasi"

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept": "application/json,text/plain,*/*",
}

def clean_int_rp(s: str):
    if not s:
        return None
    s = s.strip()
    if s in ("-", "—"):
        return None
    digits = re.sub(r"[^\d]", "", s)
    return int(digits) if digits else None

def normalize_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def parse_percent_from_change(s: str):
    if not s:
        return None
    m = re.search(r"\(([-+]?\d+(?:[.,]\d+)?)%\)", s)
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", "."))
    except Exception:
        return None

def parse_price_value(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        iv = int(value)
        return iv if iv > 0 else None
    if isinstance(value, str):
        return clean_int_rp(value)
    return None

def line_is_noise(line: str) -> bool:
    if not line:
        return True
    s = normalize_spaces(line)
    if not s:
        return True
    if s in HEADERS_SET:
        return True
    if s.startswith("Disparitas Terhadap HET"):
        return True
    low = s.lower()
    for p in NOISE_PREFIXES:
        if low.startswith(p):
            return True
    return False

def looks_like_commodity_name(line: str) -> bool:
    s = normalize_spaces(line)
    if not s or line_is_noise(s):
        return False
    if len(s) < 3 or len(s) > 70:
        return False
    if "\t" in s:
        return False
    if PRICE_RE.match(s):
        return False
    if not re.search(r"[A-Za-z]", s):
        return False
    return True

def looks_like_price(line: str) -> bool:
    s = normalize_spaces(line)
    if not PRICE_RE.match(s):
        return False
    # Hindari false positive seperti "2026" (tahun) saat tidak ada prefix Rp.
    if not s.lower().startswith("rp"):
        if "." not in s and "," not in s:
            return False
    return True

def looks_like_change(line: str) -> bool:
    return bool(CHANGE_RE.match(normalize_spaces(line)))

JS_GET_CONTAINER_LINES = r"""
() => {
  const wantHeaders = ["Provinsi", "Harga Rata-Rata", "Disparitas"];
  const norm = (t) => (t || "").replace(/\s+/g," ").trim();
  const countPrice = (t) => {
    const m = (t || "").match(/(?:Rp\s*)?[0-9]{1,3}(?:[.,][0-9]{3})+/g);
    return m ? m.length : 0;
  };

  const all = Array.from(document.querySelectorAll("*")).filter(el => el instanceof HTMLElement);

  function hasHeaders(el){
    const t = norm(el.innerText);
    return wantHeaders.every(h => t.includes(h));
  }

  // Find container that includes those headers.
  // Pick the candidate that most likely holds price rows.
  const candidates = all.filter(el => hasHeaders(el));
  let container = null;
  let bestScore = -1;
  for (const el of candidates) {
    const t = el.innerText || "";
    const score = countPrice(t) * 100 - Math.min(t.length, 20000) / 20000;
    if (score > bestScore) {
      bestScore = score;
      container = el;
    }
  }
  if (!container) return { found:false, lines:[], reason:"container_not_found" };

  // Take innerText lines (not normalized to single spaces; keep line breaks)
  const rawLines = (container.innerText || "").split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  return {
    found: true,
    containerTextSample: norm(container.innerText).slice(0, 200),
    lines: rawLines
  };
}
"""

def parse_rows_from_lines(lines):
    cleaned = []
    for ln in lines:
        ln2 = normalize_spaces(ln)
        if line_is_noise(ln2):
            continue
        cleaned.append(ln2)

    rows = []
    i = 0
    while i < len(cleaned):
        ln = cleaned[i]

        if not looks_like_commodity_name(ln):
            i += 1
            continue

        komoditas = ln
        # Cari harga dalam 5 baris berikutnya (toleran kalau ada noise).
        j = i + 1
        while j < len(cleaned) and j <= i+5 and not looks_like_price(cleaned[j]):
            if looks_like_commodity_name(cleaned[j]):
                break
            j += 1
        if j >= len(cleaned) or not looks_like_price(cleaned[j]):
            i += 1
            continue
        harga_txt = cleaned[j]

        # Setelah harga, status Harga Naik/Turun/Tetap bersifat opsional.
        disp_txt = ""
        k = j + 1
        while k < len(cleaned) and k <= j+4 and not looks_like_change(cleaned[k]):
            if looks_like_commodity_name(cleaned[k]):
                break
            k += 1
        if k < len(cleaned) and looks_like_change(cleaned[k]):
            disp_txt = cleaned[k]

        harga = clean_int_rp(harga_txt)
        if harga is None:
            i = j + 1
            continue

        rows.append({
            "wilayah": komoditas,
            "name": komoditas,
            "harga_text": harga_txt,
            "harga": harga,
            "price": harga,
            "disparitas_text": disp_txt,
            "disparitas": parse_percent_from_change(disp_txt),
        })

        i = (k + 1) if disp_txt else (j + 1)

    return rows, cleaned

def iter_dicts(node):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from iter_dicts(v)
        return
    if isinstance(node, list):
        for item in node:
            yield from iter_dicts(item)

def extract_rows_from_api_payload(payload):
    name_keys = (
        "name", "nama", "komoditas", "commodity", "wilayah", "title", "label", "provinsi",
    )
    price_keys = (
        "price", "harga", "harga_rata_rata", "avg_price", "nilai", "value", "harga_konsumen", "harga_produsen",
    )

    rows = []
    seen = set()

    for item in iter_dicts(payload):
        name = ""
        for key in name_keys:
            val = item.get(key)
            if isinstance(val, str) and looks_like_commodity_name(val):
                name = normalize_spaces(val)
                break
        if not name:
            continue

        price = None
        price_text = ""
        for key in price_keys:
            if key not in item:
                continue
            raw_price = item.get(key)
            parsed = parse_price_value(raw_price)
            if parsed is not None:
                price = parsed
                price_text = normalize_spaces(str(raw_price))
                break
        if price is None:
            continue

        key = (name.lower(), int(price))
        if key in seen:
            continue
        seen.add(key)

        rows.append({
            "wilayah": name,
            "name": name,
            "harga_text": price_text,
            "harga": int(price),
            "price": int(price),
            "disparitas_text": "",
            "disparitas": None,
        })

    return rows

def fetch_rows_from_api():
    query = urllib.parse.urlencode({
        "province_id": "",
        "city_id": "",
        "level_harga_id": "1",
    })
    url = f"{API_ENDPOINT}?{query}"
    req = urllib.request.Request(url, headers=HTTP_HEADERS, method="GET")
    with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=30) as resp:
        body = resp.read().decode("utf-8", errors="ignore")
    payload = json.loads(body)
    rows = extract_rows_from_api_payload(payload)
    return rows, payload

def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "https://panelharga.badanpangan.go.id/beranda"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            locale="id-ID",
            extra_http_headers={
                "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
            }
        )

        page.goto(url, wait_until="networkidle", timeout=60000)

        # Klik "Tampilkan" kalau ada
        try:
            page.get_by_role("button", name=re.compile(r"Tampilkan", re.I)).click(timeout=4000)
            page.wait_for_timeout(1500)
        except Exception:
            pass

        # Pastikan header muncul
        page.wait_for_selector("text=Provinsi", timeout=60000)
        # Pada beberapa environment data komoditas muncul lebih lambat.
        try:
            page.wait_for_function(r"() => /(?:Rp\s*)?[0-9]{1,3}(?:[.,][0-9]{3})+/.test(document.body.innerText)", timeout=15000)
        except Exception:
            pass

        raw = page.evaluate(JS_GET_CONTAINER_LINES)

        lines = raw.get("lines", []) if isinstance(raw, dict) else []
        rows, cleaned = parse_rows_from_lines(lines)
        api_error = None
        used_api_fallback = False
        api_rows_count = 0
        if len(rows) == 0:
            try:
                api_rows, _ = fetch_rows_from_api()
                if api_rows:
                    rows = api_rows
                    used_api_fallback = True
                    api_rows_count = len(api_rows)
            except Exception as e:
                api_error = str(e)

        out = {
            "url": url,
            "found_container": raw.get("found") if isinstance(raw, dict) else False,
            "debug_reason": raw.get("reason") if isinstance(raw, dict) else None,
            "debug_container_sample": raw.get("containerTextSample") if isinstance(raw, dict) else None,
            "debug_lines_count": len(lines),
            "debug_cleaned_preview": cleaned[:25],  # biar gampang debug kalau format berubah
            "debug_api_fallback_used": used_api_fallback,
            "debug_api_rows_count": api_rows_count,
            "debug_api_error": api_error,
            "rows": rows
        }

        print(json.dumps(out, ensure_ascii=False, indent=2))
        browser.close()

if __name__ == "__main__":
    main()
