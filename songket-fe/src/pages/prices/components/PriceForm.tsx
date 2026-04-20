type PriceFormProps = {
  canImport: boolean
  manual: {
    name: string
    unit: string
    price: string
    source_url: string
  }
  navigate: (path: string) => void
  setManual: React.Dispatch<React.SetStateAction<{
    name: string
    unit: string
    price: string
    source_url: string
  }>>
  submitManual: () => Promise<void>
  formatRupiahInput: (value: string) => string
}

export default function PriceForm({
  canImport,
  manual,
  navigate,
  setManual,
  submitManual,
  formatRupiahInput,
}: PriceFormProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Input Manual Harga Pangan</div>
          <div style={{ color: '#64748b' }}>Halaman form terpisah dari tabel harga</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/prices')}>Kembali ke Tabel</button>
      </div>

      <div className="page">
        {!canImport && <div className="alert">Tidak ada izin input harga manual.</div>}

        <div className="card" style={{ maxWidth: 820 }}>
          <div className="grid" style={{ gap: 10 }}>
            <div>
              <label>Nama komoditas</label>
              <input value={manual.name} onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))} placeholder="Contoh: Beras Medium" />
            </div>
            <div>
              <label>Satuan</label>
              <input value={manual.unit} onChange={(e) => setManual((m) => ({ ...m, unit: e.target.value }))} placeholder="kg/liter/ikat" />
            </div>
            <div>
              <label>Harga (Rp)</label>
              <input
                value={manual.price}
                onChange={(e) => setManual((m) => ({ ...m, price: formatRupiahInput(e.target.value) }))}
                placeholder="Rp 10.000"
              />
            </div>
            <div>
              <label>Sumber URL</label>
              <input value={manual.source_url} onChange={(e) => setManual((m) => ({ ...m, source_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn" onClick={() => void submitManual()}>Simpan</button>
            <button className="btn-ghost" onClick={() => navigate('/prices')}>Batal</button>
          </div>
        </div>
      </div>
    </div>
  )
}
