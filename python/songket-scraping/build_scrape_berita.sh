#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v pyinstaller >/dev/null 2>&1; then
  echo "pyinstaller belum terpasang. Install dulu: pip install pyinstaller"
  exit 1
fi

pyinstaller --onefile --clean --name scrape_berita scrape_berita.py
mkdir -p bin
cp dist/scrape_berita bin/scrape_berita

echo "Binary berhasil dibuat: $ROOT_DIR/bin/scrape_berita"
