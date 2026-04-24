import { formatDateTime } from './financeHelpers'

type CompanyDetailProps = {
  canUpdate: boolean
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
  canUpdate,
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
  const phoneText = selectedCompany?.phone?.trim() || 'Phone not set'
  const locationSummary = [selectedCompanyDistrictName, selectedCompanyRegencyName, selectedCompanyProvinceName]
    .filter((item) => item && item !== '-')
    .join(', ') || '-'

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Finance Company Details</div>
          <div style={{ color: '#64748b' }}>Company profile and performance summary.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`${financeBasePath}/companies/${selectedId}/edit`, { state: { company: selectedCompany } })}>
              Edit Finance Company
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate(financeBasePath)}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedCompany && <div className="alert">Finance company not found.</div>}
        {selectedCompany && (
          <>
            <div className="card business-dealer-detail-hero">
              <div className="business-dealer-detail-hero-main">
                <div className="business-dealer-detail-kicker">Finance Company</div>
                <div className="business-dealer-detail-name">{selectedCompany.name || '-'}</div>
                <div className="business-dealer-detail-note">{locationSummary}</div>
              </div>
              <div className="business-dealer-detail-badges">
                <span className="business-dealer-detail-badge muted">{phoneText}</span>
                <span className="business-dealer-detail-badge muted">
                  {companySummaryLoading ? 'Loading performance' : `${companySummary?.active_dealers || 0} active dealers`}
                </span>
              </div>
            </div>

            <div className="business-dealer-grid business-dealer-detail-layout">
              <div className="card business-section">
                <div className="business-section-head">
                  <h3 className="business-section-title">Company Information</h3>
                  <span className="business-section-side">Profile</span>
                </div>
                <div className="business-dealer-detail-card">
                  <div className="business-dealer-detail-grid">
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Company Name</div>
                      <div className="business-dealer-detail-value">{selectedCompany.name || '-'}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Phone</div>
                      <div className="business-dealer-detail-value">{selectedCompany.phone || '-'}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Created At</div>
                      <div className="business-dealer-detail-value">{formatDateTime(selectedCompany.created_at)}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Updated At</div>
                      <div className="business-dealer-detail-value">{formatDateTime(selectedCompany.updated_at)}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Address</div>
                      <div className="business-dealer-detail-value">{selectedCompany.address || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card business-section">
                <div className="business-section-head">
                  <h3 className="business-section-title">Location Information</h3>
                  <span className="business-section-side">Area</span>
                </div>
                <div className="business-dealer-detail-card">
                  <div className="business-dealer-detail-grid">
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Province</div>
                      <div className="business-dealer-detail-value">{selectedCompanyProvinceName}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Regency / City</div>
                      <div className="business-dealer-detail-value">{selectedCompanyRegencyName}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">District</div>
                      <div className="business-dealer-detail-value">{selectedCompanyDistrictName}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Village</div>
                      <div className="business-dealer-detail-value">{selectedCompany.village || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card business-section">
              <div className="business-section-head">
                <h3 className="business-section-title">Finance Performance Summary</h3>
                <span className="business-section-side">Performance</span>
              </div>
              <div className="business-dealer-detail-card">
                {companySummaryLoading && <div className="muted">Loading performance summary...</div>}
                {!companySummaryLoading && !companySummary && <div className="muted">No performance data yet.</div>}

                {!companySummaryLoading && companySummary && (
                  <>
                    <div className="business-summary-row business-dealer-detail-summary-row" style={{ padding: 0, marginBottom: 12 }}>
                      <div className="business-summary-item">
                        <div className="business-dealer-detail-stat-label">Total Orders</div>
                        <div className="business-dealer-detail-stat-value">{companySummary.total_orders}</div>
                      </div>
                      <div className="business-summary-item">
                        <div className="business-dealer-detail-stat-label">Approval Rate</div>
                        <div className="business-dealer-detail-stat-value">{`${(companySummary.approval_rate * 100).toFixed(1)}%`}</div>
                      </div>
                      <div className="business-summary-item">
                        <div className="business-dealer-detail-stat-label">Lead Avg (s)</div>
                        <div className="business-dealer-detail-stat-value">
                          {companySummary.lead_time_seconds_avg != null ? companySummary.lead_time_seconds_avg.toFixed(1) : '-'}
                        </div>
                      </div>
                      <div className="business-summary-item">
                        <div className="business-dealer-detail-stat-label">Rescue FC2</div>
                        <div className="business-dealer-detail-stat-value">{companySummary.rescue_approved_fc2}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 12, color: '#64748b', fontSize: 12 }}>
                      Active dealers: {companySummary.active_dealers} of {dealers.length}
                    </div>

                    <div className="table-responsive">
                      <table className="table table-list">
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
            </div>
          </>
        )}
      </div>
    </div>
  )
}
