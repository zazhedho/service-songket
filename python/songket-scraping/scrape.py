#!/usr/bin/env python3
import sys, json, requests
from bs4 import BeautifulSoup

def scrape_url(url: str):
    out = []
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
    except Exception as e:
        return out

    ct = r.headers.get("content-type", "")
    if "json" in ct:
        try:
            data = r.json()
        except Exception:
            return out
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get("data") or data.get("items") or data.get("rows") or []
        else:
            items = []
        for m in items:
            if not isinstance(m, dict):
                continue
            name = m.get("name") or m.get("nama") or m.get("komoditas") or m.get("commodity")
            price = m.get("price") or m.get("harga")
            unit = m.get("unit") or m.get("satuan")
            if name and price:
                out.append({"name": name, "price": float(price), "unit": unit, "source_url": url})
        return out

    # HTML fallback: look for table rows with name/price
    soup = BeautifulSoup(r.text, "html.parser")
    rows = soup.select("table tr")
    for tr in rows:
        cols = [c.get_text(strip=True) for c in tr.find_all(["td", "th"])]
        if len(cols) < 2:
            continue
        name = cols[0]
        try:
            price_val = float(cols[1].replace(",", "").replace(".", "").replace("Rp", "").replace(" ", ""))
        except Exception:
            continue
        unit = cols[2] if len(cols) > 2 else None
        if name and price_val:
            out.append({"name": name, "price": price_val, "unit": unit, "source_url": url})
    return out

def main():
    urls = sys.argv[1:]
    if not urls:
        print("[]")
        return
    result = []
    for u in urls:
        result.extend(scrape_url(u))
    print(json.dumps(result))

if __name__ == "__main__":
    main()
