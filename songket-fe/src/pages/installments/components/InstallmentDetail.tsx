type InstallmentDetailProps = {
  areaLabel: (motor?: any) => string
  canUpdate: boolean
  formatDate: (value?: string) => string
  formatRupiah: (value: number) => string
  navigate: (path: string, options?: any) => void
  selectedId: string
  selectedItem: any
}

export default function InstallmentDetail({
  areaLabel,
  canUpdate,
  formatDate,
  formatRupiah,
  navigate,
  selectedId,
  selectedItem,
}: InstallmentDetailProps) {
  const motor = selectedItem?.motor_type

  return (
    <div className="motor-installment-shell">
      <div className="header motor-installment-header">
        <div className="motor-installment-heading">
          <div className="motor-installment-eyebrow">Installment Profile</div>
          <div className="motor-installment-title">Motor Type & Installment Details</div>
          <div className="motor-installment-subtitle">Review product identity, OTR, installment amount, and area coverage.</div>
        </div>
        <div className="motor-installment-actions">
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/installments/${selectedId}/edit`, { state: { item: selectedItem } })}>
              Edit
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/installments')}>Back</button>
        </div>
      </div>

      <div className="page motor-installment-page">
        {!selectedItem && <div className="alert">Data not found.</div>}
        {selectedItem && (
          <div className="card motor-installment-detail-card">
            <div className="motor-installment-detail-hero">
              <div>
                <div className="motor-installment-detail-kicker">Installment</div>
                <div className="motor-installment-detail-name">{motor?.name || '-'}</div>
                <div className="motor-installment-detail-note">
                  {[motor?.brand, motor?.model, motor?.type].filter(Boolean).join(' / ') || '-'}
                </div>
              </div>
              <div className="motor-installment-detail-price">
                <span>Installment</span>
                <strong>{formatRupiah(Number(selectedItem.amount || 0))}</strong>
              </div>
            </div>

            <div className="motor-installment-detail-grid">
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">OTR</div>
                <div className="motor-installment-detail-value">{formatRupiah(Number(motor?.otr || 0))}</div>
              </div>
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Brand</div>
                <div className="motor-installment-detail-value">{motor?.brand || '-'}</div>
              </div>
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Model</div>
                <div className="motor-installment-detail-value">{motor?.model || '-'}</div>
              </div>
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Variant</div>
                <div className="motor-installment-detail-value">{motor?.type || '-'}</div>
              </div>
              <div className="motor-installment-detail-item">
                <div className="motor-installment-detail-label">Area</div>
                <div className="motor-installment-detail-value">{areaLabel(motor)}</div>
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
