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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Create Manual Commodity Price</div>
          <div style={{ color: '#64748b' }}>Form page is separated from the price table</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/prices')}>Back to Table</button>
      </div>

      <div className="page">
        {!canImport && <div className="alert">No permission to create manual prices.</div>}

        <div className="card" style={{ maxWidth: 820 }}>
          <div className="grid" style={{ gap: 10 }}>
            <div>
              <label>Commodity Name</label>
              <input value={manual.name} onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))} placeholder="Example: Medium Rice" />
            </div>
            <div>
              <label>Unit</label>
              <input value={manual.unit} onChange={(e) => setManual((m) => ({ ...m, unit: e.target.value }))} placeholder="kg/liter/bundle" />
            </div>
            <div>
              <label>Price (IDR)</label>
              <input
                value={manual.price}
                onChange={(e) => setManual((m) => ({ ...m, price: formatRupiahInput(e.target.value) }))}
                placeholder="IDR 10,000"
              />
            </div>
            <div>
              <label>Source URL</label>
              <input value={manual.source_url} onChange={(e) => setManual((m) => ({ ...m, source_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn" onClick={() => void submitManual()}>Save</button>
            <button className="btn-ghost" onClick={() => navigate('/prices')}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
