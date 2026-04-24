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
            <table className="table responsive-detail" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Commodity</th>
                  <td style={{ fontWeight: 600 }}>{selectedPrice.commodity?.name || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Price</th>
                  <td style={{ fontWeight: 600 }}>{formatRupiah(selectedPrice.price)}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Unit</th>
                  <td style={{ fontWeight: 600 }}>{selectedPrice.commodity?.unit || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Source URL</th>
                  <td style={{ fontWeight: 600 }}>
                    {selectedPrice.source_url ? (
                      <a className="detail-link" href={selectedPrice.source_url} target="_blank" rel="noreferrer">
                        {selectedPrice.source_url}
                      </a>
                    ) : '-'}
                  </td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Collected At</th>
                  <td style={{ fontWeight: 600 }}>{selectedPrice.collected_at ? new Date(selectedPrice.collected_at).toLocaleString('en-US') : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
