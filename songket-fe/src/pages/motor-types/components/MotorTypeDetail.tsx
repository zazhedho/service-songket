type MotorTypeDetailProps = {
  canUpdate: boolean
  formatDate: (value?: string) => string
  formatRupiah: (value: number) => string
  navigate: (path: string, options?: any) => void
  selectedId: string
  selectedItem: any
}

export default function MotorTypeDetail({
  canUpdate,
  formatDate,
  formatRupiah,
  navigate,
  selectedId,
  selectedItem,
}: MotorTypeDetailProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Type Details</div>
          <div style={{ color: '#64748b' }}>Motor type data by area</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/motor-types/${selectedId}/edit`, { state: { motorType: selectedItem } })}>
              Edit
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedItem && <div className="alert">Motor type data not found.</div>}
        {selectedItem && (
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Motor Type Information</h3>
            <div className="business-dealer-grid" style={{ padding: 0, marginTop: 10 }}>
              <table className="table responsive-detail polished-detail-table">
                <tbody>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Motor Type</th>
                    <td><span className="detail-value-strong">{selectedItem.name || '-'}</span></td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Brand</th>
                    <td><span className="detail-value-strong">{selectedItem.brand || '-'}</span></td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Model</th>
                    <td><span className="detail-value-strong">{selectedItem.model || '-'}</span></td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Variant</th>
                    <td><span className="detail-value-strong">{selectedItem.type || '-'}</span></td>
                  </tr>
                </tbody>
              </table>
              <table className="table responsive-detail polished-detail-table">
                <tbody>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>OTR</th>
                    <td><span className="table-metric-pill total">{formatRupiah(selectedItem.otr || 0)}</span></td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Province</th>
                    <td><span className="detail-value-strong">{selectedItem.province_name || '-'}</span></td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Regency / City</th>
                    <td><span className="detail-value-strong">{selectedItem.regency_name || '-'}</span></td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Updated At</th>
                    <td><span className="detail-value-strong">{formatDate(selectedItem.updated_at)}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
