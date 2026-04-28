type JobDetailProps = {
  canUpdate: boolean
  detailAreaRows: any[]
  detailCreatedAt: string
  detailJobName: string
  detailLoading: boolean
  detailNetIncomeValue: number
  detailUpdatedAt: string
  formatRupiah: (value: number) => string
  navigate: (path: string, options?: any) => void
  selectedId: string
  selectedItem: any
}

export default function JobDetail({
  canUpdate,
  detailAreaRows,
  detailCreatedAt,
  detailJobName,
  detailLoading,
  detailNetIncomeValue,
  detailUpdatedAt,
  formatRupiah,
  navigate,
  selectedId,
  selectedItem,
}: JobDetailProps) {
  return (
    <div className="job-net-shell">
      <div className="header job-net-header">
        <div className="job-net-heading">
          <div className="job-net-eyebrow">Income Profile</div>
          <div className="job-net-title">Job & Net Income Details</div>
          <div className="job-net-subtitle">Review job identity, income value, and area coverage.</div>
        </div>
        <div className="job-net-actions">
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/jobs/${selectedId}/edit`, { state: { item: selectedItem } })}>
              Edit
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/jobs')}>Back</button>
        </div>
      </div>

      <div className="page job-net-page">
        {!selectedItem && <div className="alert">Data not found.</div>}
        {selectedItem && (
          <div className="card job-net-detail-card">
            <div className="job-net-detail-hero">
              <div>
                <div className="job-net-detail-kicker">Job</div>
                <div className="job-net-detail-name">{detailJobName}</div>
                <div className="job-net-detail-note">{detailAreaRows.length} coverage area{detailAreaRows.length === 1 ? '' : 's'}</div>
              </div>
              <div className="job-net-detail-income">
                <span>Net Income</span>
                <strong>{formatRupiah(detailNetIncomeValue)}</strong>
              </div>
            </div>

            {detailLoading && <div className="job-net-inline-state">Loading latest relation data...</div>}

            <div className="job-net-detail-grid">
              <div className="job-net-detail-item">
                <div className="job-net-detail-label">Job Name</div>
                <div className="job-net-detail-value">{detailJobName}</div>
              </div>
              <div className="job-net-detail-item">
                <div className="job-net-detail-label">Coverage Area Count</div>
                <div className="job-net-detail-value">{detailAreaRows.length}</div>
              </div>
              <div className="job-net-detail-item">
                <div className="job-net-detail-label">Created At</div>
                <div className="job-net-detail-value">{detailCreatedAt}</div>
              </div>
              <div className="job-net-detail-item">
                <div className="job-net-detail-label">Updated At</div>
                <div className="job-net-detail-value">{detailUpdatedAt}</div>
              </div>
            </div>

            <div className="job-net-section-head">
              <h3>Coverage Areas</h3>
              <span>{detailAreaRows.length} areas</span>
            </div>
            <div className="table-responsive job-net-detail-table-wrap">
              <table className="table metric-table job-net-area-table">
                <thead>
                  <tr>
                    <th className="job-net-area-number-col">No</th>
                    <th>Area</th>
                  </tr>
                </thead>
                <tbody>
                  {detailAreaRows.map((area: any, index: number) => (
                    <tr key={`${area.province_code}-${area.regency_code}-${index}`}>
                      <td className="table-metric-cell">
                        <span className="table-metric-pill total">{index + 1}</span>
                      </td>
                      <td>
                        <div className="table-stack-cell">
                          <div className="table-stack-primary">{area.regency_name || '-'}</div>
                          <div className="table-stack-secondary">{area.province_name || '-'}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {detailAreaRows.length === 0 && (
                    <tr>
                      <td colSpan={2}>
                        <div className="table-empty-panel">No coverage areas.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
