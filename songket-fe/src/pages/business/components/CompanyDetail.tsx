import { DetailTable, Metric, formatDateTime } from './financeHelpers'

type CompanyDetailProps = {
  canManage: boolean
  companySummary: any
  companySummaryLoading: boolean
  dealers: any[]
  financeBasePath: string
  navigate: (path: string, options?: any) => void
  selectedCompany: any
  selectedCompanyDistrictName: string
  selectedCompanyProvinceName: string
  selectedCompanyRegencyName: string
  selectedId: string
}

export default function CompanyDetail({
  canManage,
  companySummary,
  companySummaryLoading,
  dealers,
  financeBasePath,
  navigate,
  selectedCompany,
  selectedCompanyDistrictName,
  selectedCompanyProvinceName,
  selectedCompanyRegencyName,
  selectedId,
}: CompanyDetailProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Finance Company</div>
          <div style={{ color: '#64748b' }}>Company profile and performance summary</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManage && selectedId && (
            <button className="btn" onClick={() => navigate(`${financeBasePath}/companies/${selectedId}/edit`, { state: { company: selectedCompany } })}>
              Edit Finance Company
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate(financeBasePath)}>Kembali</button>
        </div>
      </div>

      <div className="page">
        {!selectedCompany && <div className="alert">Finance company tidak ditemukan.</div>}
        {selectedCompany && (
          <>
            <div className="card" style={{ maxWidth: 960 }}>
              <h3>Finance Company Information</h3>
              <DetailTable
                rows={[
                  { label: 'Name', value: selectedCompany.name || '-' },
                  { label: 'Phone', value: selectedCompany.phone || '-' },
                  { label: 'Province', value: selectedCompanyProvinceName },
                  { label: 'Regency / City', value: selectedCompanyRegencyName },
                  { label: 'District', value: selectedCompanyDistrictName },
                  { label: 'Village', value: selectedCompany.village || '-' },
                  { label: 'Address', value: selectedCompany.address || '-' },
                  { label: 'Created At', value: formatDateTime(selectedCompany.created_at) },
                  { label: 'Updated At', value: formatDateTime(selectedCompany.updated_at) },
                ]}
              />
            </div>

            <div className="card">
              <h3>Finance Performence Summary</h3>
              {companySummaryLoading && <div className="muted">Loading performance summary...</div>}
              {!companySummaryLoading && !companySummary && <div className="muted">No performance data yet.</div>}

              {!companySummaryLoading && companySummary && (
                <>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
                    <Metric label="Total Order" value={companySummary.total_orders} />
                    <Metric label="Approval Rate" value={`${(companySummary.approval_rate * 100).toFixed(1)}%`} />
                    <Metric label="Lead Avg (s)" value={companySummary.lead_time_seconds_avg != null ? companySummary.lead_time_seconds_avg.toFixed(1) : '-'} />
                    <Metric label="Rescue FC2" value={companySummary.rescue_approved_fc2} />
                  </div>

                  <div style={{ marginTop: 10, color: '#64748b', fontSize: 12 }}>
                    Dealer aktif: {companySummary.active_dealers} dari {dealers.length} dealer
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Dealer</th>
                          <th>Total Order</th>
                          <th>Approval Rate</th>
                          <th>Lead Avg (s)</th>
                          <th>Rescue FC2</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companySummary.dealer_rows.map((row: any) => (
                          <tr key={row.dealer_id}>
                            <td>{row.dealer_name}</td>
                            <td>{row.total_orders}</td>
                            <td>{(row.approval_rate * 100).toFixed(1)}%</td>
                            <td>{row.lead_time_seconds_avg != null ? row.lead_time_seconds_avg.toFixed(1) : '-'}</td>
                            <td>{row.rescue_approved_fc2}</td>
                          </tr>
                        ))}
                        {companySummary.dealer_rows.length === 0 && (
                          <tr>
                            <td colSpan={5}>No dealer performance data yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
