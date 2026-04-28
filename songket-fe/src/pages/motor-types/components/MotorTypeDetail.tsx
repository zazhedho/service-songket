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
    <div className="motor-installment-shell">
      <div className="header motor-installment-header">
        <div className="motor-installment-heading">
          <div className="motor-installment-eyebrow">Product Profile</div>
          <div className="motor-installment-title">Motor Type Details</div>
          <div className="motor-installment-subtitle">Review product identity, OTR value, and area coverage.</div>
        </div>
        <div className="motor-installment-actions">
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/motor-types/${selectedId}/edit`, { state: { motorType: selectedItem } })}>
              Edit
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Back</button>
        </div>
      </div>

      <div className="page motor-installment-page">
        {!selectedItem && <div className="alert">Motor type data not found.</div>}
        {selectedItem && (
          <div className="card motor-installment-detail-card">
            <div className="motor-installment-detail-hero">
              <div>
                <div className="motor-installment-detail-kicker">Motor Type</div>
                <div className="motor-installment-detail-name">{selectedItem.name || '-'}</div>
                <div className="motor-installment-detail-note">
                  {[selectedItem.brand, selectedItem.model, selectedItem.type].filter(Boolean).join(' / ') || '-'}
                </div>
              </div>
              <div className="motor-installment-detail-price">
                <span>OTR</span>
                <strong>{formatRupiah(selectedItem.otr || 0)}</strong>
              </div>
            </div>

            <div className="motor-installment-detail-grid">
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Brand</div>
                <div className="motor-installment-detail-value">{selectedItem.brand || '-'}</div>
              </div>
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Model</div>
                <div className="motor-installment-detail-value">{selectedItem.model || '-'}</div>
              </div>
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Variant</div>
                <div className="motor-installment-detail-value">{selectedItem.type || '-'}</div>
              </div>
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Regency / City</div>
                <div className="motor-installment-detail-value">{selectedItem.regency_name || '-'}</div>
              </div>
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Province</div>
                <div className="motor-installment-detail-value">{selectedItem.province_name || '-'}</div>
              </div>
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Updated At</div>
                <div className="motor-installment-detail-value">{formatDate(selectedItem.updated_at)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
