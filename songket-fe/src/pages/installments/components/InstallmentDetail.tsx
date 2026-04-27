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
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Type & Installment Details</div>
          <div style={{ color: '#64748b' }}>Combined motor and installment configuration</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/installments/${selectedId}/edit`, { state: { item: selectedItem } })}>
              Edit
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/installments')}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedItem && <div className="alert">Data not found.</div>}
        {selectedItem && (
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Motor Type & Installment Information</h3>
            <div className="business-dealer-grid" style={{ padding: 0, marginTop: 10 }}>
              <table className="table responsive-detail polished-detail-table">
                <tbody>
                  <tr><th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Motor Type</th><td><span className="detail-value-strong">{motor?.name || '-'}</span></td></tr>
                  <tr><th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Brand</th><td><span className="detail-value-strong">{motor?.brand || '-'}</span></td></tr>
                  <tr><th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Model</th><td><span className="detail-value-strong">{motor?.model || '-'}</span></td></tr>
                  <tr><th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Variant</th><td><span className="detail-value-strong">{motor?.type || '-'}</span></td></tr>
                </tbody>
              </table>
              <table className="table responsive-detail polished-detail-table">
                <tbody>
                  <tr><th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>OTR</th><td><span className="table-metric-pill total">{formatRupiah(Number(motor?.otr || 0))}</span></td></tr>
                  <tr><th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Installment Amount</th><td><span className="table-metric-pill warning">{formatRupiah(Number(selectedItem.amount || 0))}</span></td></tr>
                  <tr><th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Area</th><td><span className="detail-value-strong">{areaLabel(motor)}</span></td></tr>
                  <tr><th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Updated At</th><td><span className="detail-value-strong">{formatDate(selectedItem.updated_at)}</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
