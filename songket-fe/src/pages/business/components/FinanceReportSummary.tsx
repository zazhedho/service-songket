import { Suspense, lazy } from 'react'
import DeferredMount from '../../../components/common/DeferredMount'
import Pagination from '../../../components/common/Pagination'
import SearchableSelect from '../../../components/common/SearchableSelect'
import Table from '../../../components/common/Table'
import { buildMonthOptions } from '../../../utils/yearOptions'

const FinanceReportDealerMap = lazy(() => import('./FinanceReportMap'))

type FinanceReportSummaryProps = {
  activeDealerName: string
  activeDealerPoint: any
  activeFinance1Name: string
  applyFilters: () => void
  dealerInput: string
  dealerMapCenter: [number, number]
  dealerMapZoom: number
  dealerMetricMaxTotal: number
  dealerMetricRows: any[]
  dealerMetrics: any
  dealerMetricsError: string
  dealerMetricsLoading: boolean
  dealerOptions: any[]
  dealerPoints: any[]
  dealerRows: any[]
  error: string
  finance1Input: string
  finance1Options: any[]
  loading: boolean
  limit: number
  masterError: string
  masterLoading: boolean
  migrationSummary: any
  monthInput: string
  navigate: (path: string, options?: any) => void
  page: number
  resetFilters: () => void
  rows: any[]
  selectedDealerId: string
  setDealer: React.Dispatch<React.SetStateAction<string>>
  setDealerInput: React.Dispatch<React.SetStateAction<string>>
  setFinance1: React.Dispatch<React.SetStateAction<string>>
  setFinance1Input: React.Dispatch<React.SetStateAction<string>>
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setMonth: React.Dispatch<React.SetStateAction<string>>
  setMonthInput: React.Dispatch<React.SetStateAction<string>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setSelectedDealerId: React.Dispatch<React.SetStateAction<string>>
  setYear: React.Dispatch<React.SetStateAction<string>>
  setYearInput: React.Dispatch<React.SetStateAction<string>>
  statusBadge: (status: string) => React.ReactNode
  summarizeLocation: (parts: unknown[]) => string
  toSafeNumber: (value: unknown) => number
  totalData: number
  totalPages: number
  truncateTableText: (value: unknown, max?: number) => string
  yearInput: string
  yearOptions: string[]
  formatCoordinate: (value: unknown) => string
  formatLeadTimeHours: (value: unknown) => string
}

export default function FinanceReportSummary({
  activeDealerName,
  activeDealerPoint,
  activeFinance1Name,
  applyFilters,
  dealerInput,
  dealerMapCenter,
  dealerMapZoom,
  dealerMetricMaxTotal,
  dealerMetricRows,
  dealerMetrics,
  dealerMetricsError,
  dealerMetricsLoading,
  dealerOptions,
  dealerPoints,
  dealerRows,
  error,
  finance1Input,
  finance1Options,
  loading,
  limit,
  masterError,
  masterLoading,
  migrationSummary,
  monthInput,
  navigate,
  page,
  resetFilters,
  rows,
  selectedDealerId,
  setDealer,
  setDealerInput,
  setFinance1,
  setFinance1Input,
  setLimit,
  setMonth,
  setMonthInput,
  setPage,
  setSelectedDealerId,
  setYear,
  setYearInput,
  statusBadge,
  summarizeLocation,
  toSafeNumber,
  totalData,
  totalPages,
  truncateTableText,
  yearInput,
  yearOptions,
  formatCoordinate,
  formatLeadTimeHours,
}: FinanceReportSummaryProps) {
  const dealerFilterOptions = [{ value: '', label: 'All Dealers' }, ...dealerOptions.map((item) => ({
    value: String(item.code || ''),
    label: String(item.name || item.code || '-'),
  }))]
  const monthOptions = buildMonthOptions()
  const monthSelectOptions = [{ value: '', label: 'All Months' }, ...monthOptions]
  const yearSelectOptions = [{ value: '', label: 'All Years' }, ...yearOptions.map((item) => ({ value: item, label: item }))]

  const finance1SelectOptions = [{ value: '', label: 'All Finance 1' }, ...finance1Options.map((item) => ({
    value: String(item.code || ''),
    label: String(item.name || item.code || '-'),
  }))]

  const renderMigrationParty = (name: unknown, status: string) => {
    const fullName = String(name || '-')

    return (
      <div className="finance-migration-party">
        <div className="finance-migration-party-name" title={fullName}>{truncateTableText(fullName, 56)}</div>
        <div className="finance-migration-party-status">{statusBadge(status)}</div>
      </div>
    )
  }

  const getMigrationStats = (item: any) => {
    const total = toSafeNumber(item.transition_total_data)
    const approved = toSafeNumber(item.total_approve_finance_2)
    const rejected = toSafeNumber(item.total_reject_finance_2)
    const pending = Math.max(0, total - approved - rejected)
    const approvedPct = total > 0 ? (approved / total) * 100 : 0
    const rejectedPct = total > 0 ? (rejected / total) * 100 : 0
    const pendingPct = total > 0 ? Math.max(0, 100 - approvedPct - rejectedPct) : 0

    return { total, approved, rejected, pending, approvedPct, rejectedPct, pendingPct }
  }

  const renderMigrationMetric = (value: number, tone: 'total' | 'approved' | 'rejected' | 'pending') => (
    <span className={`finance-migration-metric ${tone}`}>{value.toLocaleString('id-ID')}</span>
  )

  const renderPerformanceName = (name: unknown, total: number) => {
    const label = String(name || '-')

    return (
      <div className="table-stack-cell">
        <div className="table-stack-primary" title={label}>{truncateTableText(label, 48)}</div>
        <div className="table-stack-secondary">{total.toLocaleString('id-ID')} total orders</div>
      </div>
    )
  }

  const renderPerformanceMetric = (value: number, tone: 'total' | 'approved' | 'rejected' | 'warning') => (
    <span className={`table-metric-pill ${tone}`}>{value.toLocaleString('id-ID')}</span>
  )

  const renderPerformanceRate = (rate: unknown) => {
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

  const renderMigrationOutcome = (item: any) => {
    const { approvedPct, rejectedPct, pendingPct } = getMigrationStats(item)

    return (
      <div className="finance-migration-outcome">
        <div className="finance-migration-outcome-head">
          <span>{approvedPct.toFixed(1)}% approved</span>
        </div>
        <div className="finance-migration-outcome-track" aria-hidden="true">
          <span className="finance-migration-outcome-segment approved" style={{ width: `${approvedPct}%` }} />
          <span className="finance-migration-outcome-segment rejected" style={{ width: `${rejectedPct}%` }} />
          <span className="finance-migration-outcome-segment pending" style={{ width: `${pendingPct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="business-summary-shell">
      <div className="header business-summary-header">
        <div className="business-summary-heading">
          <div className="business-summary-eyebrow">Business Intelligence</div>
          <div className="business-summary-title">Business Summary</div>
          <div className="business-summary-subtitle">Dealer performance and finance migration in one focused workspace.</div>
        </div>
      </div>

      <div className="business-tabs-pane">
        <button type="button" className="business-tab-btn active" onClick={() => navigate('/business')}>
          Summary
        </button>
        <button type="button" className="business-tab-btn" onClick={() => navigate('/business/finance')}>
          Finance
        </button>
        <button type="button" className="business-tab-btn" onClick={() => navigate('/business/dealer')}>
          Dealer
        </button>
      </div>

      <div className="page business-summary-page">
        <div className="business-top-grid">
          <div className="card business-map-card">
            <div className="business-map-head">
              <h3>Dealer Map</h3>
              <div className="business-map-meta">
                <span>Focused Dealer</span>
                <strong>{activeDealerName}</strong>
              </div>
            </div>
            <div className="business-map-shell">
              <DeferredMount
                minHeight={320}
                fallback={<div className="business-map-loading">Preparing dealer map...</div>}
              >
                <Suspense fallback={<div className="business-map-loading">Loading dealer map...</div>}>
                  <FinanceReportDealerMap
                    dealerMapCenter={dealerMapCenter}
                    dealerMapZoom={dealerMapZoom}
                    dealerPoints={dealerPoints}
                    setDealerInput={setDealerInput}
                    setSelectedDealerId={setSelectedDealerId}
                    summarizeLocation={summarizeLocation}
                    truncateTableText={truncateTableText}
                  />
                </Suspense>
              </DeferredMount>
            </div>
            {dealerPoints.length === 0 && (
              <div className="business-map-hint">
                <span className="business-map-hint-dot" />
                Add dealer coordinates to show markers on the map.
              </div>
            )}
            {dealerPoints.length > 0 && (
              <div className="business-map-hint">
                <span className="business-map-hint-dot" />
                Marker selection updates dealer details and performance.
              </div>
            )}
          </div>

          <div className="card business-dealer-detail-card">
            <div className="business-map-head">
              <h3>Dealer Details</h3>
              <div className="business-map-meta">
                <span>Selection</span>
                <strong>{activeDealerPoint ? 'Map Selection' : 'No Selection'}</strong>
              </div>
            </div>

            {!activeDealerPoint && (
              <div className="business-empty-focus compact">
                <div className="business-empty-icon">⌖</div>
                <div>
                  <div className="business-empty-title">No dealer selected</div>
                  <div className="business-empty-copy">Choose a map marker to preview dealer profile and location.</div>
                </div>
              </div>
            )}

            {activeDealerPoint && (
              <div className="business-dealer-detail-grid">
                <div className="business-dealer-detail-item">
                  <div className="business-dealer-detail-label">Dealer Name</div>
                  <div className="business-dealer-detail-value">{activeDealerPoint.name || '-'}</div>
                </div>
                <div className="business-dealer-detail-item">
                  <div className="business-dealer-detail-label">Phone</div>
                  <div className="business-dealer-detail-value">{activeDealerPoint.phone || '-'}</div>
                </div>
                <div className="business-dealer-detail-item">
                  <div className="business-dealer-detail-label">Location</div>
                  <div className="business-dealer-detail-value">
                    {summarizeLocation([
                      activeDealerPoint.province,
                      activeDealerPoint.regency,
                      activeDealerPoint.district,
                      activeDealerPoint.village,
                    ])}
                  </div>
                </div>
                <div className="business-dealer-detail-item">
                  <div className="business-dealer-detail-label">Address</div>
                  <div className="business-dealer-detail-value">{activeDealerPoint.address || '-'}</div>
                </div>
                <div className="business-dealer-detail-item">
                  <div className="business-dealer-detail-label">Latitude</div>
                  <div className="business-dealer-detail-value">{formatCoordinate(activeDealerPoint._lat)}</div>
                </div>
                <div className="business-dealer-detail-item">
                  <div className="business-dealer-detail-label">Longitude</div>
                  <div className="business-dealer-detail-value">{formatCoordinate(activeDealerPoint._lng)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {masterError && <div className="alert">{masterError}</div>}
        {masterLoading && <div className="muted">Loading dealer and finance data...</div>}

        <div className="card business-filter-card business-summary-filter-card">
          <div className="compact-filter-toolbar business-summary-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <SearchableSelect
                id="business-summary-dealer-filter"
                value={dealerInput}
                options={dealerFilterOptions}
                onChange={setDealerInput}
                placeholder="Filter Dealer"
                searchPlaceholder="Search dealer..."
                emptyMessage="Dealer not found."
              />
            </div>

            <div className="compact-filter-item narrow">
              <SearchableSelect
                id="business-summary-month-filter"
                value={monthInput}
                options={monthSelectOptions}
                onChange={setMonthInput}
                placeholder="All Months"
                searchPlaceholder="Search month..."
                emptyMessage="Month not found."
              />
            </div>

            <div className="compact-filter-item narrow">
              <SearchableSelect
                id="business-summary-year-filter"
                value={yearInput}
                options={yearSelectOptions}
                onChange={setYearInput}
                placeholder="All Years"
                searchPlaceholder="Search year..."
                emptyMessage="Year not found."
              />
            </div>

            <div className="compact-filter-action">
              <button className="btn" onClick={applyFilters}>Apply</button>
              <button className="btn-ghost" onClick={resetFilters}>Reset</button>
            </div>
          </div>
        </div>

        <div className="card business-section">
          <div className="business-section-head">
            <h3 className="business-section-title">Dealer Performance</h3>
            <div className="business-section-side">{activeDealerName}</div>
          </div>

          <div className="finance-report-dealer-performance-body">
            {!selectedDealerId && !dealerInput && (
              <div className="finance-report-empty-focus">
                <div className="finance-report-empty-icon">⌖</div>
                <div>
                  <div className="finance-report-empty-title">No dealer selected</div>
                  <div className="finance-report-empty-copy">Choose a dealer from the filter or map to show focused performance metrics.</div>
                </div>
              </div>
            )}
            {activeDealerName !== 'All Dealers' && !dealerMetrics && (
              <div className="finance-report-empty-focus">
                <div className="finance-report-empty-icon">!</div>
                <div>
                  <div className="finance-report-empty-title">No metrics available</div>
                  <div className="finance-report-empty-copy">This dealer has no performance data for the selected period.</div>
                </div>
              </div>
            )}

            {dealerMetrics && (
              <div className="finance-report-dealer-kpi-grid finance-report-dealer-performance-kpis">
                <div className="finance-report-dealer-kpi-card tone-blue">
                  <div className="finance-report-dealer-kpi-label">Total Order</div>
                  <div className="finance-report-dealer-kpi-value">{toSafeNumber(dealerMetrics.total_orders)}</div>
                  <div className="finance-report-dealer-kpi-note">Orders in the active period</div>
                </div>
                <div className="finance-report-dealer-kpi-card tone-emerald">
                  <div className="finance-report-dealer-kpi-label">Approval Rate</div>
                  <div className="finance-report-dealer-kpi-value">{`${(toSafeNumber(dealerMetrics.approval_rate) * 100).toFixed(1)}%`}</div>
                  <div className="finance-report-dealer-kpi-note">Approved order ratio</div>
                </div>
                <div className="finance-report-dealer-kpi-card tone-cyan">
                  <div className="finance-report-dealer-kpi-label">Lead Time Avg</div>
                  <div className="finance-report-dealer-kpi-value">{formatLeadTimeHours(dealerMetrics.lead_time_seconds_avg)}</div>
                  <div className="finance-report-dealer-kpi-note">Average finance decision time</div>
                </div>
                <div className="finance-report-dealer-kpi-card tone-amber">
                  <div className="finance-report-dealer-kpi-label">Rescue FC2</div>
                  <div className="finance-report-dealer-kpi-value">{toSafeNumber(dealerMetrics.rescue_approved_fc2)}</div>
                  <div className="finance-report-dealer-kpi-note">Approved by Finance 2</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card business-section">
          <div className="business-section-head">
            <h3 className="business-section-title">Finance Performance</h3>
            <div className="business-section-side">{activeDealerName}</div>
          </div>

          {dealerMetricsError && <div className="alert" style={{ marginTop: 12 }}>{dealerMetricsError}</div>}
          {!dealerMetricsError && dealerMetricsLoading && <div className="muted" style={{ marginTop: 12 }}>Loading dealer performance...</div>}

          {!dealerMetricsLoading && !dealerMetricsError && (
            <div className="business-dealer-grid">
              <div className="finance-report-wide-table">
                <table className="table metric-table" style={{ minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th>Finance Company</th>
                      <th>Total</th>
                      <th>Approved</th>
                      <th>Rejected</th>
                      <th>Approve %</th>
                      <th>Lead Time</th>
                      <th>Rescue FC2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealerMetricRows.map((item) => {
                      const total = toSafeNumber(item.total_orders)
                      const approved = toSafeNumber(item.approved_count)
                      const rejected = toSafeNumber(item.rejected_count)

                      return (
                        <tr key={`dealer-metric-${item.finance_company_id}`}>
                          <td>{renderPerformanceName(item.finance_company_name, total)}</td>
                          <td className="table-metric-cell">{renderPerformanceMetric(total, 'total')}</td>
                          <td className="table-metric-cell">{renderPerformanceMetric(approved, 'approved')}</td>
                          <td className="table-metric-cell">{renderPerformanceMetric(rejected, 'rejected')}</td>
                          <td>{renderPerformanceRate(item.approval_rate)}</td>
                          <td><span className="table-lead-value">{formatLeadTimeHours(item.lead_time_seconds_avg)}</span></td>
                          <td className="table-metric-cell">{renderPerformanceMetric(toSafeNumber(item.rescue_approved_fc2), 'warning')}</td>
                        </tr>
                      )
                    })}
                    {dealerMetricRows.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="table-empty-panel">
                            <div className="business-empty-title">No finance performance rows</div>
                            <div className="business-empty-copy">Choose a dealer or adjust the period to populate this table.</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="business-summary-chart finance-performance-chart-card">
                <div className="finance-performance-chart-head">
                  <div>
                    <div className="finance-performance-chart-title">Summary Chart</div>
                    <div className="finance-performance-chart-note">Finance company order volume for the selected dealer.</div>
                  </div>
                </div>
                {dealerMetricRows.length === 0 && (
                  <div className="business-empty-focus compact">
                    <div className="business-empty-icon">≋</div>
                    <div>
                      <div className="business-empty-title">Chart is waiting for data</div>
                      <div className="business-empty-copy">Finance company bars will appear once dealer metrics are available.</div>
                    </div>
                  </div>
                )}
                {dealerMetricRows.map((item) => {
                  const total = toSafeNumber(item.total_orders)
                  const width = Math.max(8, (total / dealerMetricMaxTotal) * 100)
                  return (
                    <div key={`dealer-summary-${item.finance_company_id}`} className="finance-performance-chart-row">
                      <div className="finance-performance-chart-row-head">
                        <span title={item.finance_company_name}>{truncateTableText(item.finance_company_name, 48)}</span>
                        <strong>{total}</strong>
                      </div>
                      <div className="finance-performance-chart-track">
                        <div
                          className="finance-performance-chart-fill"
                          style={{
                            width: `${Math.min(100, width)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card business-section">
          <div className="business-section-head">
            <div>
              <h3 className="business-section-title">Finance Company Migration</h3>
              <div className="finance-migration-subtitle">Grouped by Finance 2 migration outcome.</div>
            </div>
            <div className="finance-report-filter-field">
              <label className="business-filter-label">Finance Company 1</label>
              <SearchableSelect
                id="business-summary-finance1-filter"
                value={finance1Input}
                options={finance1SelectOptions}
                onChange={(next) => {
                  setFinance1Input(next)
                  setFinance1(next)
                  setPage(1)
                }}
                placeholder="All Finance 1"
                searchPlaceholder="Search finance company..."
                emptyMessage="Finance company not found."
              />
            </div>
          </div>

          <div className="finance-migration-summary-body">
            <div className="business-summary-row finance-migration-summary-row">
              <div className="business-summary-item">
                <div className="finance-migration-summary-label">Total Groups</div>
                <div className="finance-migration-summary-value">{migrationSummary.totalRows}</div>
              </div>
              <div className="business-summary-item">
                <div className="finance-migration-summary-label">Total Order-Ins</div>
                <div className="finance-migration-summary-value">{migrationSummary.totalDataSum}</div>
              </div>
              <div className="business-summary-item">
                <div className="finance-migration-summary-label">Approved</div>
                <div className="finance-migration-summary-value">{migrationSummary.totalApproveSum}</div>
              </div>
              <div className="business-summary-item">
                <div className="finance-migration-summary-label">Rejected</div>
                <div className="finance-migration-summary-value">{migrationSummary.totalRejectSum}</div>
              </div>
              <div className="business-summary-item">
                <div className="finance-migration-summary-label">Approval Rate</div>
                <div className="finance-migration-summary-value">{migrationSummary.approvalRate.toFixed(2)}%</div>
              </div>
            </div>

            {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}

            <div className="finance-report-wide-table finance-migration-table-wrap">
              <Table
                data={rows}
                keyField={(item, idx) => `${item.order_id}-${idx}`}
                className="table-list"
                style={{ minWidth: 1090, tableLayout: 'fixed' }}
                isLoading={loading}
                loadingMessage="Loading finance migration data..."
                emptyMessage="No finance migration data."
                rowAriaLabel={(item) => `Open migration detail for ${item.finance_2_name || 'Finance 2'} from ${item.finance_1_name || 'Finance 1'}`}
                onRowClick={(item) =>
                  navigate(`/business/migrations/${item.order_id}`, {
                    state: {
                      row: item,
                      context: { finance1: finance1Input },
                    },
                  })}
                columns={[
                  { header: 'No', accessor: (_item, idx) => (page - 1) * limit + idx + 1, headerStyle: { width: 56 }, style: { width: 56 } },
                  {
                    header: 'Finance 2',
                    accessor: (item) => renderMigrationParty(item.finance_2_name, item.finance_2_status),
                    className: 'wrap-text finance-migration-party-col',
                    headerStyle: { width: 220 },
                    style: { width: 220 },
                  },
                  {
                    header: 'Finance 1',
                    accessor: (item) => renderMigrationParty(item.finance_1_name, item.finance_1_status),
                    className: 'wrap-text finance-migration-party-col',
                    headerStyle: { width: 220 },
                    style: { width: 220 },
                  },
                  {
                    header: 'Total',
                    accessor: (item) => renderMigrationMetric(getMigrationStats(item).total, 'total'),
                    className: 'wrap-text finance-migration-metric-col',
                    headerStyle: { width: 104 },
                    style: { width: 104 },
                  },
                  {
                    header: 'Approved',
                    accessor: (item) => renderMigrationMetric(getMigrationStats(item).approved, 'approved'),
                    className: 'wrap-text finance-migration-metric-col',
                    headerStyle: { width: 112 },
                    style: { width: 112 },
                  },
                  {
                    header: 'Rejected',
                    accessor: (item) => renderMigrationMetric(getMigrationStats(item).rejected, 'rejected'),
                    className: 'wrap-text finance-migration-metric-col',
                    headerStyle: { width: 112 },
                    style: { width: 112 },
                  },
                  {
                    header: 'Pending',
                    accessor: (item) => renderMigrationMetric(getMigrationStats(item).pending, 'pending'),
                    className: 'wrap-text finance-migration-metric-col',
                    headerStyle: { width: 112 },
                    style: { width: 112 },
                  },
                  {
                    header: 'Approval',
                    accessor: (item) => renderMigrationOutcome(item),
                    className: 'wrap-text finance-migration-outcome-col',
                    headerStyle: { width: 150 },
                    style: { width: 150 },
                  },
                ]}
              />
            </div>

            <div className="finance-migration-active-filter">
              Active Finance 1 filter: {activeFinance1Name}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalData={totalData}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next)
                setPage(1)
              }}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
