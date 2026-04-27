function DetailTable({ rows }: { rows: Array<{ label: string; value: any }> }) {
  return (
    <table className="table responsive-detail polished-detail-table" style={{ marginTop: 10 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: '36%', textTransform: 'none', letterSpacing: 'normal' }}>{row.label}</th>
            <td style={{ wordBreak: 'break-word' }}>
              <span className="detail-value-strong">{row.value ?? '-'}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

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
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Job & Net Income Details</div>
          <div style={{ color: '#64748b' }}>Combined job and net income configuration</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/jobs/${selectedId}/edit`, { state: { item: selectedItem } })}>
              Edit
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/jobs')}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedItem && <div className="alert">Data not found.</div>}
        {selectedItem && (
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Job & Net Income Information</h3>
            {detailLoading && <div style={{ color: '#64748b', marginBottom: 10 }}>Loading latest relation data...</div>}
            <DetailTable
              rows={[
                { label: 'Job Name', value: detailJobName },
                { label: 'Net Income', value: formatRupiah(detailNetIncomeValue) },
                { label: 'Coverage Area Count', value: detailAreaRows.length },
                { label: 'Created At', value: detailCreatedAt },
                { label: 'Updated At', value: detailUpdatedAt },
              ]}
            />

            <h3 style={{ marginTop: 14 }}>Coverage Areas</h3>
            <div className="table-responsive">
              <table className="table metric-table" style={{ marginTop: 10, minWidth: 520 }}>
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>No</th>
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
