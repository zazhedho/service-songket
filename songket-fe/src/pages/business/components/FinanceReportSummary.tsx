import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import Pagination from '../../../components/common/Pagination'
import { markerIcon } from './financeHelpers'
import { ReportMapFly } from './financeReportHelpers'

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
  return (
    <div style={{ overflowX: 'hidden' }}>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Business</div>
          <div style={{ color: '#64748b' }}>Dealer Performance dan Migration Fincoy (Finance 1 ke Finance 2)</div>
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
              <h3>Map Dealer</h3>
              <div className="business-map-meta">
                <span className="muted">Selected:</span>
                <span style={{ fontWeight: 700 }}>{activeDealerName}</span>
              </div>
            </div>
            <div className="business-map-shell">
              <MapContainer center={dealerMapCenter} zoom={dealerMapZoom} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ReportMapFly center={dealerMapCenter} zoom={dealerMapZoom} />
                {dealerPoints.map((dealerItem) => (
                  <Marker
                    key={`business-map-${dealerItem.id}`}
                    position={[dealerItem._lat, dealerItem._lng]}
                    icon={markerIcon}
                    eventHandlers={{
                      click: () => {
                        setSelectedDealerId(dealerItem.id)
                        setDealerInput(dealerItem.id)
                      },
                    }}
                  >
                    <Popup>
                      <div style={{ fontWeight: 700 }}>{dealerItem.name || '-'}</div>
                      <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                        {summarizeLocation([dealerItem.regency, dealerItem.district, dealerItem.village])}
                      </div>
                      {dealerItem.phone && (
                        <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>
                          {dealerItem.phone}
                        </div>
                      )}
                      {dealerItem.address && (
                        <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>
                          {truncateTableText(dealerItem.address, 72)}
                        </div>
                      )}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            {dealerPoints.length === 0 && (
              <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                No dealer coordinates found. Set latitude/longitude in dealer data.
              </div>
            )}
          </div>

          <div className="card business-dealer-detail-card">
            <div className="business-map-head">
              <h3>Detail Dealer</h3>
              <div className="business-map-meta">
                <span className="muted">Source:</span>
                <span style={{ fontWeight: 700 }}>{activeDealerPoint ? 'Map Selection' : 'No Selection'}</span>
              </div>
            </div>

            {!activeDealerPoint && (
              <div className="muted" style={{ fontSize: 12 }}>
                Klik titik dealer pada map untuk menampilkan detail dealer.
              </div>
            )}

            {activeDealerPoint && (
              <div className="business-dealer-detail-grid">
                <div className="business-dealer-detail-item">
                  <div className="business-dealer-detail-label">Nama Dealer</div>
                  <div className="business-dealer-detail-value">{activeDealerPoint.name || '-'}</div>
                </div>
                <div className="business-dealer-detail-item">
                  <div className="business-dealer-detail-label">Phone</div>
                  <div className="business-dealer-detail-value">{activeDealerPoint.phone || '-'}</div>
                </div>
                <div className="business-dealer-detail-item">
                  <div className="business-dealer-detail-label">Lokasi</div>
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
                  <div className="business-dealer-detail-label">Alamat</div>
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
          <div className="business-filter-row mobile-filter-grid">
            <div>
              <label>Dealer</label>
              <select value={dealerInput} onChange={(e) => setDealerInput(e.target.value)}>
                <option value="">All Dealer</option>
                {dealerOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Bulan</label>
              <select value={monthInput} onChange={(e) => setMonthInput(e.target.value)}>
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>
                    {String(idx + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Tahun</label>
              <select value={yearInput} onChange={(e) => setYearInput(e.target.value)}>
                <option value="">All Years</option>
                {yearOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
              <div>
                <label>Select Dealer</label>
                <select value={selectedDealerId} onChange={(e) => setSelectedDealerId(e.target.value)}>
                  <option value="">Select dealer</option>
                  {dealerRows.map((dealerItem) => (
                    <option key={`summary-dealer-${dealerItem.id}`} value={dealerItem.id}>
                      {dealerItem.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedDealerId && <div style={{ marginTop: 12, color: '#64748b' }}>Select a dealer to view metrics.</div>}
            {selectedDealerId && !dealerMetrics && (
              <div style={{ marginTop: 12, color: '#64748b' }}>No metrics available for selected dealer.</div>
            )}

            {dealerMetrics && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
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
              <div style={{ overflowX: 'auto' }}>
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
                      const approvedRaw = toSafeNumber(item.approved_count)
                      const rejectedRaw = toSafeNumber(item.rejected_count)
                      const approved = approvedRaw > 0 || rejectedRaw > 0
                        ? approvedRaw
                        : Math.max(0, Math.min(total, Math.round(toSafeNumber(item.approval_rate) * total)))
                      const rejected = approvedRaw > 0 || rejectedRaw > 0
                        ? rejectedRaw
                        : Math.max(0, total - approved)

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
                        <td colSpan={7}>No dealer metric data.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="business-summary-chart">
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Summary Chart</div>
                {dealerMetricRows.length === 0 && <div className="muted">No summary data.</div>}
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
            <h3 className="business-section-title">Migration Fincoy</h3>
            <div style={{ minWidth: 230 }}>
              <label style={{ marginBottom: 4 }}>Finance company 1</label>
              <select
                value={finance1Input}
                onChange={(e) => {
                  const next = e.target.value
                  setFinance1Input(next)
                  setFinance1(next)
                  setPage(1)
                }}
              >
                <option value="">All Finance 1</option>
                {finance1Options.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="business-summary-row">
            <div className="business-summary-item">
              <div className="muted" style={{ fontSize: 12 }}>Total Group</div>
              <div style={{ fontWeight: 700 }}>{migrationSummary.totalRows}</div>
            </div>
            <div className="business-summary-item">
              <div className="muted" style={{ fontSize: 12 }}>Order In Total</div>
              <div style={{ fontWeight: 700 }}>{migrationSummary.totalDataSum}</div>
            </div>
            <div className="business-summary-item">
              <div className="muted" style={{ fontSize: 12 }}>Approve</div>
              <div style={{ fontWeight: 700 }}>{migrationSummary.totalApproveSum}</div>
            </div>
            <div className="business-summary-item">
              <div className="muted" style={{ fontSize: 12 }}>Reject</div>
              <div style={{ fontWeight: 700 }}>{migrationSummary.totalRejectSum}</div>
            </div>
            <div className="business-summary-item">
              <div className="muted" style={{ fontSize: 12 }}>Approve Rate</div>
              <div style={{ fontWeight: 700 }}>{migrationSummary.approvalRate.toFixed(2)}%</div>
            </div>
          </div>

          {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}

          <div style={{ marginTop: 12, overflowX: 'auto', width: '100%', maxWidth: '100%', display: 'block' }}>
            <table className="table" style={{ minWidth: 1180, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 170 }}>Finance 2 Name</th>
                  <th style={{ width: 190 }}>Last Approve Status Finance 2</th>
                  <th style={{ width: 120 }}>Total Data</th>
                  <th style={{ width: 150 }}>Total Data Reject</th>
                  <th style={{ width: 150 }}>Total Data Approve</th>
                  <th style={{ width: 170 }}>Finance 1 Name</th>
                  <th style={{ width: 120 }}>Status Finance 1</th>
                  <th style={{ width: 100 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={9}>No finance migration data.</td>
                  </tr>
                )}
                {rows.map((item, idx) => {
                  const rowNumber = (page - 1) * limit + idx + 1

                  return (
                    <tr key={`${item.order_id}-${idx}`}>
                      <td>{rowNumber}</td>
                      <td title={item.finance_2_name || '-'}>{truncateTableText(item.finance_2_name)}</td>
                      <td>{statusBadge(item.finance_2_status)}</td>
                      <td>{toSafeNumber(item.transition_total_data)}</td>
                      <td>{toSafeNumber(item.total_reject_finance_2)}</td>
                      <td>{toSafeNumber(item.total_approve_finance_2)}</td>
                      <td title={item.finance_1_name || '-'}>{truncateTableText(item.finance_1_name)}</td>
                      <td>{statusBadge(item.finance_1_status)}</td>
                      <td className="action-cell">
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
                          onClick={() =>
                            navigate(`/business/migrations/${item.order_id}`, {
                              state: {
                                row: item,
                                context: {
                                  finance1: finance1Input,
                                },
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
            Filter Finance 1 aktif: {activeFinance1Name}
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
  )
}
