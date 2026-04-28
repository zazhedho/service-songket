import { MAX_CURRENCY_INPUT_LENGTH } from '../../../utils/currency'

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
    <div className="price-shell">
      <div className="header price-header">
        <div className="price-heading">
          <div className="price-eyebrow">Manual Entry</div>
          <div className="price-title">Create Manual Commodity Price</div>
          <div className="price-subtitle">Add a commodity price row with source reference.</div>
        </div>
        <div className="price-actions">
          <button className="btn-ghost" onClick={() => navigate('/prices')}>Back to Table</button>
        </div>
      </div>

      <div className="page price-page">
        {!canImport && <div className="alert">No permission to create manual prices.</div>}

        <div className="card form-section price-form-card">
          <div className="form-section-head">
            <div>
              <h3>Price Information</h3>
              <div className="form-section-note">Use clear commodity names and include the source URL when available.</div>
            </div>
          </div>

          <div className="form-section-grid">
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
                inputMode="numeric"
                value={manual.price}
                onChange={(e) => setManual((m) => ({ ...m, price: formatRupiahInput(e.target.value) }))}
                maxLength={MAX_CURRENCY_INPUT_LENGTH}
                placeholder="IDR 10,000"
              />
            </div>
            <div>
              <label>Source URL</label>
              <input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={manual.source_url} onChange={(e) => setManual((m) => ({ ...m, source_url: e.target.value }))} placeholder="https://..." />
            </div>

            <div className="form-actions-row price-form-actions">
              <button className="btn" type="button" onClick={() => void submitManual()}>Save</button>
              <button className="btn-ghost" type="button" onClick={() => navigate('/prices')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
