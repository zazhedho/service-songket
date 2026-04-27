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

  return (
    <div style={{ overflowX: 'hidden' }}>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Business</div>
          <div style={{ color: '#64748b' }}>Dealer Performance and Finance Company Migration (Finance 1 to Finance 2)</div>
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

      <div className="page" style={{ overflowX: 'hidden' }}>
        <div className="business-top-grid">
          <div className="card business-map-card">
            <div className="business-map-head">
              <h3>Dealer Map</h3>
              <div className="business-map-meta">
                <span className="muted">Focused Dealer</span>
                <span style={{ fontWeight: 700 }}>{activeDealerName}</span>
              </div>
            </div>
            <div className="business-map-shell">
              <DeferredMount
                minHeight={320}
                fallback={<div className="muted" style={{ padding: '24px 0' }}>Preparing dealer map...</div>}
              >
                <Suspense fallback={<div className="muted" style={{ padding: '24px 0' }}>Loading dealer map...</div>}>
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
                <span className="muted">Selection</span>
                <span style={{ fontWeight: 700 }}>{activeDealerPoint ? 'Map Selection' : 'No Selection'}</span>
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

        <div className="card business-filter-card">
          <div className="compact-filter-toolbar">
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

          <div style={{ padding: 12 }}>
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
              <div className="finance-report-dealer-kpi-grid" style={{ marginTop: 12 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #dbe3ef' }}>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Total Order</div>
                  <div style={{ fontWeight: 700, fontSize: 19 }}>{toSafeNumber(dealerMetrics.total_orders)}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #dbe3ef' }}>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Approval Rate</div>
                  <div style={{ fontWeight: 700, fontSize: 19 }}>{`${(toSafeNumber(dealerMetrics.approval_rate) * 100).toFixed(1)}%`}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #dbe3ef' }}>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Lead Time Avg (h)</div>
                  <div style={{ fontWeight: 700, fontSize: 19 }}>{formatLeadTimeHours(dealerMetrics.lead_time_seconds_avg)}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #dbe3ef' }}>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Rescue FC2</div>
                  <div style={{ fontWeight: 700, fontSize: 19 }}>{toSafeNumber(dealerMetrics.rescue_approved_fc2)}</div>
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
                <table className="table" style={{ minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th>Finance Company</th>
                      <th>Total Data</th>
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
                          <td>{item.finance_company_name || '-'}</td>
                          <td>{total}</td>
                          <td>{approved}</td>
                          <td>{rejected}</td>
                          <td>{(toSafeNumber(item.approval_rate) * 100).toFixed(2)}%</td>
                          <td>{formatLeadTimeHours(item.lead_time_seconds_avg)}</td>
                          <td>{toSafeNumber(item.rescue_approved_fc2)}</td>
                        </tr>
                      )
                    })}
                    {dealerMetricRows.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="business-table-empty">
                            <div className="business-empty-title">No finance performance rows</div>
                            <div className="business-empty-copy">Choose a dealer or adjust the period to populate this table.</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="business-summary-chart">
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Summary Chart</div>
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
                    <div key={`dealer-summary-${item.finance_company_id}`} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{truncateTableText(item.finance_company_name, 48)}</span>
                        <span>{total}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: '#dbe5f2', marginTop: 4 }}>
                        <div
                          style={{
                            width: `${Math.min(100, width)}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: '#2563eb',
                            transition: 'width .25s ease',
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
            <h3 className="business-section-title">Finance Company Migration</h3>
            <div className="finance-report-filter-field">
              <label style={{ marginBottom: 4 }}>Finance Company 1</label>
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

          <div style={{ padding: '12px 12px 14px' }}>
            <div className="business-summary-row" style={{ padding: 0 }}>
              <div className="business-summary-item">
                <div className="muted" style={{ fontSize: 12 }}>Total Groups</div>
                <div style={{ fontWeight: 700 }}>{migrationSummary.totalRows}</div>
              </div>
              <div className="business-summary-item">
                <div className="muted" style={{ fontSize: 12 }}>Total Order-Ins</div>
                <div style={{ fontWeight: 700 }}>{migrationSummary.totalDataSum}</div>
              </div>
              <div className="business-summary-item">
                <div className="muted" style={{ fontSize: 12 }}>Approved</div>
                <div style={{ fontWeight: 700 }}>{migrationSummary.totalApproveSum}</div>
              </div>
              <div className="business-summary-item">
                <div className="muted" style={{ fontSize: 12 }}>Rejected</div>
                <div style={{ fontWeight: 700 }}>{migrationSummary.totalRejectSum}</div>
              </div>
              <div className="business-summary-item">
                <div className="muted" style={{ fontSize: 12 }}>Approval Rate</div>
                <div style={{ fontWeight: 700 }}>{migrationSummary.approvalRate.toFixed(2)}%</div>
              </div>
            </div>

            {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}

            <div className="finance-report-wide-table" style={{ marginTop: 12 }}>
              <Table
                data={rows}
                keyField={(item, idx) => `${item.order_id}-${idx}`}
                className="table-list"
                style={{ minWidth: 980, tableLayout: 'fixed' }}
                isLoading={loading}
                loadingMessage="Loading finance migration data..."
                emptyMessage="No finance migration data."
                onRowClick={(item) =>
                  navigate(`/business/migrations/${item.order_id}`, {
                    state: {
                      row: item,
                      context: { finance1: finance1Input },
                    },
                  })}
                columns={[
                  { header: 'No', accessor: (_item, idx) => (page - 1) * limit + idx + 1, headerStyle: { width: 56 }, style: { width: 56 } },
                  { header: 'Finance 2 Name', accessor: (item) => truncateTableText(item.finance_2_name), headerStyle: { width: 170 }, style: { width: 170 } },
                  { header: 'Latest Finance 2 Status', accessor: (item) => statusBadge(item.finance_2_status), headerStyle: { width: 190 }, style: { width: 190 } },
                  { header: 'Total Records', accessor: (item) => toSafeNumber(item.transition_total_data), headerStyle: { width: 120 }, style: { width: 120 } },
                  { header: 'Rejected Records', accessor: (item) => toSafeNumber(item.total_reject_finance_2), headerStyle: { width: 150 }, style: { width: 150 } },
                  { header: 'Approved Records', accessor: (item) => toSafeNumber(item.total_approve_finance_2), headerStyle: { width: 150 }, style: { width: 150 } },
                  { header: 'Finance 1 Name', accessor: (item) => truncateTableText(item.finance_1_name), headerStyle: { width: 170 }, style: { width: 170 } },
                  { header: 'Finance 1 Status', accessor: (item) => statusBadge(item.finance_1_status), headerStyle: { width: 120 }, style: { width: 120 } },
                  {
                    header: 'Action',
                    accessor: (item) => (
                      <button
                        type="button"
                        className="btn-ghost table-action-button"
                        onClick={() =>
                          navigate(`/business/migrations/${item.order_id}`, {
                            state: {
                              row: item,
                              context: { finance1: finance1Input },
                            },
                          })
                        }
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="1.8" />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                        View
                      </button>
                    ),
                    className: 'action-cell',
                    ignoreRowClick: true,
                    headerStyle: { width: 108 },
                    style: { width: 108 },
                  },
                ]}
              />
            </div>

            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
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
