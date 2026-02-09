#!/usr/bin/env python3
import sys, json, re
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
PRICE_RE = re.compile(r"^Rp\s*[0-9][0-9\.\,]*$", re.I)

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
    return bool(PRICE_RE.match(normalize_spaces(line)))

def looks_like_change(line: str) -> bool:
    return bool(CHANGE_RE.match(normalize_spaces(line)))

JS_GET_CONTAINER_LINES = r"""
() => {
  const wantHeaders = ["Provinsi", "Harga Rata-Rata", "Disparitas"];
  const norm = (t) => (t || "").replace(/\s+/g," ").trim();

  const all = Array.from(document.querySelectorAll("*")).filter(el => el instanceof HTMLElement);

  function hasHeaders(el){
    const t = norm(el.innerText);
    return wantHeaders.every(h => t.includes(h));
  }

  // Find container that includes those headers
  let container = all.find(el => hasHeaders(el)) || null;
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
        # Cari harga dalam 3 baris berikutnya (toleran kalau ada noise).
        j = i + 1
        while j < len(cleaned) and j <= i+3 and not looks_like_price(cleaned[j]):
            if looks_like_commodity_name(cleaned[j]):
                break
            j += 1
        if j >= len(cleaned) or not looks_like_price(cleaned[j]):
            i += 1
            continue
        harga_txt = cleaned[j]

        # Setelah harga, wajib ada status Harga Naik/Turun/Tetap.
        k = j + 1
        while k < len(cleaned) and k <= j+3 and not looks_like_change(cleaned[k]):
            if looks_like_commodity_name(cleaned[k]):
                break
            k += 1
        if k >= len(cleaned) or not looks_like_change(cleaned[k]):
            i = j + 1
            continue
        disp_txt = cleaned[k]

        harga = clean_int_rp(harga_txt)
        if harga is None:
            i = k + 1
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

        i = k + 1

    return rows, cleaned

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

        raw = page.evaluate(JS_GET_CONTAINER_LINES)

        lines = raw.get("lines", []) if isinstance(raw, dict) else []
        rows, cleaned = parse_rows_from_lines(lines)

        out = {
            "url": url,
            "found_container": raw.get("found") if isinstance(raw, dict) else False,
            "debug_reason": raw.get("reason") if isinstance(raw, dict) else None,
            "debug_container_sample": raw.get("containerTextSample") if isinstance(raw, dict) else None,
            "debug_lines_count": len(lines),
            "debug_cleaned_preview": cleaned[:25],  # biar gampang debug kalau format berubah
            "rows": rows
        }

        print(json.dumps(out, ensure_ascii=False, indent=2))
        browser.close()

if __name__ == "__main__":
    main()
