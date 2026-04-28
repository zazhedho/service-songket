type NetIncomeDetailProps = {
  areaLabel: (area: any) => string
  canUpdate: boolean
  formatDate: (value?: string) => string
  formatRupiah: (value: number) => string
  jobName: (id: string, fallback?: string) => string
  navigate: (path: string, options?: any) => void
  selectedId: string
  selectedItem: any
}

export default function NetIncomeDetail({
  areaLabel,
  canUpdate,
  formatDate,
  formatRupiah,
  jobName,
  navigate,
  selectedId,
  selectedItem,
}: NetIncomeDetailProps) {
  const areaRows = Array.isArray(selectedItem?.area_net_income) ? selectedItem.area_net_income : []

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Net Income Details</div>
          <div style={{ color: '#64748b' }}>Net income summary per job and area</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/net-income/${selectedId}/edit`, { state: { item: selectedItem } })}>
              Edit
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/net-income')}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedItem && <div className="alert">Net income data not found.</div>}
        {selectedItem && (
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Net Income Information</h3>
            <table className="table responsive-detail polished-detail-table" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Job</th>
                  <td><span className="detail-value-strong">{jobName(selectedItem.job_id, selectedItem.job_name)}</span></td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Net Income</th>
                  <td><span className="table-metric-pill total">{formatRupiah(Number(selectedItem.net_income || 0))}</span></td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Area Coverage</th>
                  <td>
                    {areaRows.length > 0 ? (
                      <div className="detail-chip-list">
                        {areaRows.map((area: any, index: number) => (
                          <span key={`${area.province_code || area.province_id || 'province'}-${area.regency_code || area.regency_id || index}`} className="detail-chip">
                            {areaLabel(area)}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Created At</th>
                  <td><span className="detail-value-strong">{formatDate(selectedItem.created_at)}</span></td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Updated At</th>
                  <td><span className="detail-value-strong">{formatDate(selectedItem.updated_at)}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
