type PriceDetailProps = {
  formatRupiah: (value: number) => string
  navigate: (path: string) => void
  selectedPrice: any
}

export default function PriceDetail({
  formatRupiah,
  navigate,
  selectedPrice,
}: PriceDetailProps) {
  const sourceUrl = String(selectedPrice?.source_url || '').trim()
  const sourceHost = (() => {
    if (!sourceUrl) return '-'
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, '') || sourceUrl
    } catch {
      return sourceUrl
    }
  })()

  return (
    <div className="price-shell">
      <div className="header price-header">
        <div className="price-heading">
          <div className="price-eyebrow">Price Profile</div>
          <div className="price-title">Commodity Price Details</div>
          <div className="price-subtitle">Review commodity, price, source, and collection time.</div>
        </div>
        <div className="price-actions">
          <button className="btn-ghost" onClick={() => navigate('/prices')}>Back</button>
        </div>
      </div>

      <div className="page price-page">
        {!selectedPrice && <div className="alert">Price data not found.</div>}
        {selectedPrice && (
          <div className="card price-detail-card">
            <div className="price-detail-hero">
              <div>
                <div className="price-detail-kicker">Commodity</div>
                <div className="price-detail-name">{selectedPrice.commodity?.name || '-'}</div>
                <div className="price-detail-note">{selectedPrice.commodity?.unit || 'Unit not available'}</div>
              </div>
              <div className="price-detail-value-card">
                <span>Price</span>
                <strong>{formatRupiah(selectedPrice.price)}</strong>
              </div>
            </div>

            <div className="price-detail-grid">
              <div className="price-detail-item">
                <div className="price-detail-label">Unit</div>
                <div className="price-detail-value">{selectedPrice.commodity?.unit || '-'}</div>
              </div>
              <div className="price-detail-item">
                <div className="price-detail-label">Collected At</div>
                <div className="price-detail-value">{selectedPrice.collected_at ? new Date(selectedPrice.collected_at).toLocaleString('en-US') : '-'}</div>
              </div>
              <div className="price-detail-item wide">
                <div className="price-detail-label">Source URL</div>
                <div className="price-detail-value">
                  {sourceUrl ? (
                    <div className="table-stack-cell">
                      <a className="detail-link table-url-link" href={sourceUrl} target="_blank" rel="noreferrer">
                        {sourceHost}
                      </a>
                      <div className="table-stack-secondary table-url-wrap" title={sourceUrl}>
                        {sourceUrl}
                      </div>
                    </div>
                  ) : '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
