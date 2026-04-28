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
  const toSafeNumber = (value: unknown) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const renderDealerMetricName = (name: unknown, total: number) => {
    const label = String(name || '-')

    return (
      <div className="table-stack-cell">
        <div className="table-stack-primary" title={label}>{label}</div>
        <div className="table-stack-secondary">{total.toLocaleString('id-ID')} total orders</div>
      </div>
    )
  }
  const renderMetric = (value: number, tone: 'total' | 'approved' | 'rejected' | 'warning') => (
    <span className={`table-metric-pill ${tone}`}>{value.toLocaleString('id-ID')}</span>
  )
  const renderRate = (rate: unknown) => {
    const pct = Math.max(0, Math.min(100, toSafeNumber(rate) * 100))

    return (
      <div className="table-rate-cell">
        <div className="table-rate-head">
          <span>{pct.toFixed(1)}%</span>
        </div>
        <div className="table-rate-track" aria-hidden="true">
          <div className="table-rate-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }
  const formatLeadTimeHours = (value: unknown) => {
    const seconds = toSafeNumber(value)
    if (!seconds) return '-'
    return `${(seconds / 3600).toFixed(2)} hours`
  }

  return (
    <div className="business-detail-shell">
      <div className="header business-detail-header">
        <div className="business-detail-heading">
          <div className="business-detail-eyebrow">Finance Profile</div>
          <div className="business-detail-title">Finance Company Details</div>
          <div className="business-detail-subtitle">Company identity, coverage area, and dealer performance summary.</div>
        </div>
        <div className="business-detail-actions">
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`${financeBasePath}/companies/${selectedId}/edit`, { state: { company: selectedCompany } })}>
              Edit Finance Company
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate(financeBasePath)}>Back</button>
        </div>
      </div>

      <div className="page business-detail-page">
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
                {companySummaryLoading && (
                  <div className="business-empty-focus compact">
                    <div className="business-empty-icon">...</div>
                    <div>
                      <div className="business-empty-title">Loading performance summary</div>
                      <div className="business-empty-copy">Preparing dealer coverage and finance performance metrics.</div>
                    </div>
                  </div>
                )}
                {!companySummaryLoading && !companySummary && (
                  <div className="business-empty-focus compact">
                    <div className="business-empty-icon">i</div>
                    <div>
                      <div className="business-empty-title">No performance data yet</div>
                      <div className="business-empty-copy">Performance metrics will appear after matching order data is available.</div>
                    </div>
                  </div>
                )}

                {!companySummaryLoading && companySummary && (
                  <>
                    <div className="business-summary-row business-dealer-detail-summary-row business-detail-kpi-grid">
                      <div className="business-summary-item business-detail-kpi-card">
                        <div className="business-dealer-detail-stat-label">Total Orders</div>
                        <div className="business-dealer-detail-stat-value">{companySummary.total_orders}</div>
                      </div>
                      <div className="business-summary-item business-detail-kpi-card">
                        <div className="business-dealer-detail-stat-label">Approval Rate</div>
                        <div className="business-dealer-detail-stat-value">{`${(companySummary.approval_rate * 100).toFixed(1)}%`}</div>
                      </div>
                      <div className="business-summary-item business-detail-kpi-card">
                        <div className="business-dealer-detail-stat-label">Lead Avg (s)</div>
                        <div className="business-dealer-detail-stat-value">
                          {companySummary.lead_time_seconds_avg != null ? companySummary.lead_time_seconds_avg.toFixed(1) : '-'}
                        </div>
                      </div>
                      <div className="business-summary-item business-detail-kpi-card">
                        <div className="business-dealer-detail-stat-label">Rescue FC2</div>
                        <div className="business-dealer-detail-stat-value">{companySummary.rescue_approved_fc2}</div>
                      </div>
                    </div>

                    <div className="business-detail-active-pill">
                      Active dealers: {companySummary.active_dealers} of {dealers.length}
                    </div>

                    <div className="table-responsive business-detail-table-wrap">
                      <table className="table metric-table" style={{ minWidth: 720 }}>
                        <thead>
                          <tr>
                            <th>Dealer</th>
                            <th>Total Order</th>
                            <th>Approval Rate</th>
                            <th>Lead Avg</th>
                            <th>Rescue FC2</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companySummary.dealer_rows.map((row: any) => {
                            const total = toSafeNumber(row.total_orders)

                            return (
                              <tr key={row.dealer_id}>
                                <td>{renderDealerMetricName(row.dealer_name, total)}</td>
                                <td className="table-metric-cell">{renderMetric(total, 'total')}</td>
                                <td>{renderRate(row.approval_rate)}</td>
                                <td><span className="table-lead-value">{formatLeadTimeHours(row.lead_time_seconds_avg)}</span></td>
                                <td className="table-metric-cell">{renderMetric(toSafeNumber(row.rescue_approved_fc2), 'warning')}</td>
                              </tr>
                            )
                          })}
                          {companySummary.dealer_rows.length === 0 && (
                            <tr>
                              <td className="table-state-cell" colSpan={5}>
                                <div className="table-empty-panel">
                                  <div className="business-empty-title">No dealer performance rows</div>
                                  <div className="business-empty-copy">Dealer performance rows will appear when this finance company has order activity.</div>
                                </div>
                              </td>
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
