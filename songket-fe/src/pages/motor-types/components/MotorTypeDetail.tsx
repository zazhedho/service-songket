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
          <div className="card" style={{ maxWidth: 860 }}>
            <h3 style={{ marginTop: 0 }}>Motor Type Information</h3>
            <table className="table" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Motor Type</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.name || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Brand</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.brand || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Model</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.model || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Variant</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.type || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>OTR</th>
                  <td style={{ fontWeight: 600 }}>{formatRupiah(selectedItem.otr || 0)}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Province</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.province_name || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Regency / City</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.regency_name || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Updated At</th>
                  <td style={{ fontWeight: 600 }}>{formatDate(selectedItem.updated_at)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
