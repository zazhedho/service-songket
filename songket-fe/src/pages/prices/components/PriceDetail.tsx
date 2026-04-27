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
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Commodity Price Details</div>
          <div style={{ color: '#64748b' }}>Complete commodity price information</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/prices')}>Back</button>
      </div>

      <div className="page">
        {!selectedPrice && <div className="alert">Price data not found.</div>}
        {selectedPrice && (
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Price Information</h3>
            <table className="table responsive-detail polished-detail-table" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Commodity</th>
                  <td><span className="detail-value-strong">{selectedPrice.commodity?.name || '-'}</span></td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Price</th>
                  <td><span className="table-metric-pill total">{formatRupiah(selectedPrice.price)}</span></td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Unit</th>
                  <td><span className="detail-value-strong">{selectedPrice.commodity?.unit || '-'}</span></td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Source URL</th>
                  <td>
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
                  </td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Collected At</th>
                  <td><span className="detail-value-strong">{selectedPrice.collected_at ? new Date(selectedPrice.collected_at).toLocaleString('en-US') : '-'}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
