import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'
import { formatRupiah } from '../../../utils/currency'
import { ReportDetailTable, summarizeLocation } from './financeReportHelpers'

type FinanceReportDetailProps = {
  applyDetailOrderInFilters: () => void
  buildDonutGradient: (rows: any[]) => string
  buildDonutSlices: (rows: any[], maxSlices?: number) => any[]
  detailFinanceSummary: any
  detailFinanceSummaryError: string
  detailFinanceSummaryLoading: boolean
  detailOrderInError: string
  detailOrderInLimit: number
  detailOrderInLoading: boolean
  detailOrderInPage: number
  detailOrderInRows: any[]
  detailOrderInSearchInput: string
  detailOrderInTotalData: number
  detailOrderInTotalPages: number
  detailRow: any
  error: string
  formatDateTime: (value?: string) => string
  loading: boolean
  locationNamesByOrderId: Record<string, any>
  navigate: (path: string, options?: any) => void
  resetDetailOrderInFilters: () => void
  selectedOrderInRow: any
  setDetailOrderInLimit: React.Dispatch<React.SetStateAction<number>>
  setDetailOrderInPage: React.Dispatch<React.SetStateAction<number>>
  setDetailOrderInSearchInput: React.Dispatch<React.SetStateAction<string>>
  setSelectedOrderInRow: React.Dispatch<React.SetStateAction<any>>
  statusBadge: (status: string) => React.ReactNode
  truncateTableText: (value: unknown, max?: number) => string
}

export default function FinanceReportDetail({
  applyDetailOrderInFilters,
  buildDonutGradient,
  buildDonutSlices,
  detailFinanceSummary,
  detailFinanceSummaryError,
  detailFinanceSummaryLoading,
  detailOrderInError,
  detailOrderInLimit,
  detailOrderInLoading,
  detailOrderInPage,
  detailOrderInRows,
  detailOrderInSearchInput,
  detailOrderInTotalData,
  detailOrderInTotalPages,
  detailRow,
  error,
  formatDateTime,
  loading,
  locationNamesByOrderId,
  navigate,
  resetDetailOrderInFilters,
  selectedOrderInRow,
  setDetailOrderInLimit,
  setDetailOrderInPage,
  setDetailOrderInSearchInput,
  setSelectedOrderInRow,
  statusBadge,
  truncateTableText,
}: FinanceReportDetailProps) {
  const item = detailRow
  const financePairText = item ? `${item.finance_1_name || '-'} -> ${item.finance_2_name || '-'}` : '-'
  const modalLocationNamed = selectedOrderInRow ? locationNamesByOrderId[selectedOrderInRow.order_id] : null
  const modalLocationText = selectedOrderInRow
    ? summarizeLocation([
        modalLocationNamed?.province,
        modalLocationNamed?.regency,
        modalLocationNamed?.district,
        selectedOrderInRow.village,
        selectedOrderInRow.address,
      ])
    : '-'
  const modalMotorOtrText = selectedOrderInRow
    ? `${selectedOrderInRow.motor_type_name || '-'} | ${formatRupiah(Number(selectedOrderInRow.otr || 0))}`
    : '-'
  const computedDetailSummary = detailFinanceSummary || {
    totalOrders: 0,
    totalDealers: 0,
    dealerCoveragePercent: 0,
    approvedCount: 0,
    rejectedCount: 0,
    approvalRate: 0,
    leadAvgSeconds: null,
    rescueFc2: 0,
    dealerTotals: [],
    motorTypeTotals: [],
  }
  const dealerDonutSlices = buildDonutSlices(computedDetailSummary?.dealerTotals || [], 6)
  const motorTypeDonutSlices = buildDonutSlices(computedDetailSummary?.motorTypeTotals || [], 6)
  const dealerDonutGradient = buildDonutGradient(dealerDonutSlices)
  const motorTypeDonutGradient = buildDonutGradient(motorTypeDonutSlices)

  return (
    <div style={{ overflowX: 'hidden' }}>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Finance Migration Detail</div>
          <div style={{ color: '#64748b' }}>Detailed migration data: {financePairText}</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/business')}>
          Back
        </button>
      </div>

      <div className="page" style={{ overflowX: 'hidden' }}>
        {error && <div className="alert">{error}</div>}
        {loading && !item && <div className="card"><div className="muted">Loading detail...</div></div>}
        {!loading && !item && <div className="card"><div className="alert">Finance migration detail not found.</div></div>}

        {item && (
          <>
            <div className="card">
              <h3>Finance Detail Identity</h3>
              <div
                className="mobile-filter-grid"
                style={{
                  marginTop: 10,
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                  <div className="muted" style={{ fontSize: 12 }}>Finance Pair</div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>{financePairText}</div>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Status Finance 1</div>
                  {statusBadge(item.finance_1_status || '')}
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Status Finance 2</div>
                  {statusBadge(item.finance_2_status || '')}
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Order In Data</h3>
              <div className="compact-filter-toolbar" style={{ marginTop: 10, marginBottom: 12 }}>
                <div className="compact-filter-item grow-2">
                  <input
                    placeholder="Pooling number, dealer, consumer..."
                    value={detailOrderInSearchInput}
                    onChange={(e) => setDetailOrderInSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyDetailOrderInFilters()
                    }}
                    aria-label="Search order in detail"
                  />
                </div>
                <div className="compact-filter-action">
                  <button className="btn" onClick={applyDetailOrderInFilters}>Apply</button>
                  <button className="btn-ghost" onClick={resetDetailOrderInFilters}>Reset</button>
                </div>
              </div>

              {detailOrderInError && <div className="alert" style={{ marginTop: 10 }}>{detailOrderInError}</div>}

              <div className="finance-report-wide-table">
                <Table
                  data={detailOrderInRows}
                  keyField={(row) => `detail-order-in-${row.order_id}`}
                  className="table-list finance-report-detail-order-table"
                  style={{ minWidth: 1120, tableLayout: 'fixed' }}
                  isLoading={detailOrderInLoading}
                  loadingMessage="Loading order in data..."
                  emptyMessage="No order in data found for this migration."
                  onRowClick={(row) => setSelectedOrderInRow(row)}
                  columns={[
                    { header: 'Pooling Number', accessor: (row) => row.pooling_number || '-', headerStyle: { width: 140 }, style: { width: 140 } },
                    { header: 'Pooling Date', accessor: (row) => formatDateTime(row.pooling_at), headerStyle: { width: 140 }, style: { width: 140 } },
                    { header: 'Dealer', accessor: (row) => row.dealer_name || '-', headerStyle: { width: 140 }, style: { width: 140 } },
                    { header: 'Consumer', accessor: (row) => row.consumer_name || '-', headerStyle: { width: 140 }, style: { width: 140 } },
                    {
                      header: 'Location',
                      accessor: (row) => summarizeLocation([
                        locationNamesByOrderId[row.order_id]?.province,
                        locationNamesByOrderId[row.order_id]?.regency,
                        locationNamesByOrderId[row.order_id]?.district,
                        row.village,
                        row.address,
                      ]),
                      className: 'wrap-text',
                      headerStyle: { width: 200 },
                      style: { width: 200 },
                    },
                    { header: 'Motor / OTR', accessor: (row) => `${row.motor_type_name || '-'} | ${formatRupiah(Number(row.otr || 0))}`, headerStyle: { width: 180 }, style: { width: 180 } },
                    { header: 'Status 1', accessor: (row) => statusBadge(row.finance_1_status || ''), headerStyle: { width: 110 }, style: { width: 110 } },
                    { header: 'Finance 1 Notes', accessor: (row) => truncateTableText(row.finance_1_notes || '-'), headerStyle: { width: 180 }, style: { width: 180 } },
                    { header: 'Status 2', accessor: (row) => statusBadge(row.finance_2_status || ''), headerStyle: { width: 110 }, style: { width: 110 } },
                    { header: 'Finance 2 Notes', accessor: (row) => truncateTableText(row.finance_2_notes || '-'), headerStyle: { width: 180 }, style: { width: 180 } },
                  ]}
                />
              </div>
              <Pagination
                page={detailOrderInPage}
                totalPages={detailOrderInTotalPages}
                totalData={detailOrderInTotalData}
                limit={detailOrderInLimit}
                onPageChange={setDetailOrderInPage}
                onLimitChange={(next) => {
                  setDetailOrderInLimit(next)
                  setDetailOrderInPage(1)
                }}
                disabled={detailOrderInLoading}
              />
            </div>

            <div className="card">
              <h3>Finance Result Summary</h3>
              {detailFinanceSummaryError && <div className="alert" style={{ marginTop: 10 }}>{detailFinanceSummaryError}</div>}
              {detailFinanceSummaryLoading && <div className="muted" style={{ marginTop: 10 }}>Loading summary...</div>}

              {!detailFinanceSummaryLoading && computedDetailSummary && (
                <>
                  <div className="finance-report-summary-kpi-grid" style={{ marginTop: 10 }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                      <div className="muted" style={{ fontSize: 12 }}>Total Order Data</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{computedDetailSummary.totalOrders}</div>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                      <div className="muted" style={{ fontSize: 12 }}>Total Dealer</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{computedDetailSummary.totalDealers}</div>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                      <div className="muted" style={{ fontSize: 12 }}>Dealer Coverage</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{computedDetailSummary.dealerCoveragePercent.toFixed(1)}%</div>
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Unique dealer / total order data</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Finance Performance</div>
                    <div className="finance-report-wide-table">
                      <table className="table" style={{ minWidth: 760 }}>
                        <thead>
                          <tr>
                            <th>Total</th>
                            <th>Approve</th>
                            <th>Rejected</th>
                            <th>Approve %</th>
                            <th>Lead Avg</th>
                            <th>Rescue FC2</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{computedDetailSummary.totalOrders}</td>
                            <td>{computedDetailSummary.approvedCount}</td>
                            <td>{computedDetailSummary.rejectedCount}</td>
                            <td>{(computedDetailSummary.approvalRate * 100).toFixed(1)}%</td>
                            <td>{computedDetailSummary.leadAvgSeconds != null ? `${computedDetailSummary.leadAvgSeconds.toFixed(1)} s` : '-'}</td>
                            <td>{computedDetailSummary.rescueFc2}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="finance-report-summary-split-grid" style={{ marginTop: 12 }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Dealer Summary</div>
                      <div className="mobile-filter-grid" style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
                        {dealerDonutSlices.length === 0 && <div className="muted">No dealer summary.</div>}
                        {dealerDonutSlices.length > 0 && (
                          <>
                            <div style={{ display: 'grid', placeItems: 'center' }}>
                              <div style={{ width: 132, height: 132, borderRadius: '50%', background: dealerDonutGradient, position: 'relative' }}>
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 18,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    display: 'grid',
                                    placeItems: 'center',
                                    textAlign: 'center',
                                    border: '1px solid #e2e8f0',
                                  }}
                                >
                                  <div className="muted" style={{ fontSize: 11, lineHeight: 1.1 }}>Dealer</div>
                                  <div style={{ fontSize: 16, fontWeight: 700 }}>{computedDetailSummary.totalOrders}</div>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                              {dealerDonutSlices.map((slice) => (
                                <div key={`dealer-${slice.label}`} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
                                  <span style={{ width: 10, height: 10, borderRadius: 999, background: slice.color, display: 'inline-block' }} />
                                  <div title={slice.label} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncateTableText(slice.label, 70)}</div>
                                  <div style={{ color: '#64748b', fontSize: 12 }}>{slice.percent.toFixed(1)}%</div>
                                  <div style={{ fontWeight: 700 }}>{slice.total}</div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Motor Type Summary</div>
                      <div className="mobile-filter-grid" style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
                        {motorTypeDonutSlices.length === 0 && <div className="muted">No motor type summary.</div>}
                        {motorTypeDonutSlices.length > 0 && (
                          <>
                            <div style={{ display: 'grid', placeItems: 'center' }}>
                              <div style={{ width: 132, height: 132, borderRadius: '50%', background: motorTypeDonutGradient, position: 'relative' }}>
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 18,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    display: 'grid',
                                    placeItems: 'center',
                                    textAlign: 'center',
                                    border: '1px solid #e2e8f0',
                                  }}
                                >
                                  <div className="muted" style={{ fontSize: 11, lineHeight: 1.1 }}>Motor Type</div>
                                  <div style={{ fontSize: 16, fontWeight: 700 }}>{computedDetailSummary.totalOrders}</div>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                              {motorTypeDonutSlices.map((slice) => (
                                <div key={`motor-${slice.label}`} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
                                  <span style={{ width: 10, height: 10, borderRadius: 999, background: slice.color, display: 'inline-block' }} />
                                  <div title={slice.label} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncateTableText(slice.label, 70)}</div>
                                  <div style={{ color: '#64748b', fontSize: 12 }}>{slice.percent.toFixed(1)}%</div>
                                  <div style={{ fontWeight: 700 }}>{slice.total}</div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {selectedOrderInRow && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Order In Detail" onClick={() => setSelectedOrderInRow(null)}>
          <div className="modal" style={{ width: 'min(880px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <h3>Order In Detail</h3>
              <button className="btn-ghost" onClick={() => setSelectedOrderInRow(null)}>Close</button>
            </div>
            <ReportDetailTable
              wrapValue
              rows={[
                { label: 'Pooling Number', value: selectedOrderInRow.pooling_number || '-' },
                { label: 'Pooling Date', value: formatDateTime(selectedOrderInRow.pooling_at) },
                { label: 'Result Date', value: formatDateTime(selectedOrderInRow.result_at) },
                { label: 'Created At', value: formatDateTime(selectedOrderInRow.order_created_at) },
                { label: 'Updated At', value: formatDateTime(selectedOrderInRow.order_updated_at) },
                { label: 'Dealer', value: selectedOrderInRow.dealer_name || '-' },
                { label: 'Consumer Name', value: selectedOrderInRow.consumer_name || '-' },
                { label: 'Consumer Phone', value: selectedOrderInRow.consumer_phone || '-' },
                { label: 'Location', value: modalLocationText },
                { label: 'Job', value: selectedOrderInRow.job_name || '-' },
                { label: 'Motor Type / OTR', value: modalMotorOtrText },
                { label: 'Installment', value: formatRupiah(Number(selectedOrderInRow.installment_amount || 0)) },
                { label: 'Net Income', value: formatRupiah(Number(selectedOrderInRow.net_income || 0)) },
                { label: 'DP Gross', value: formatRupiah(Number(selectedOrderInRow.dp_gross || 0)) },
                { label: 'DP Paid', value: formatRupiah(Number(selectedOrderInRow.dp_paid || 0)) },
                { label: 'DP Percentage', value: `${Number(selectedOrderInRow.dp_pct || 0).toFixed(2)}%` },
                { label: 'Tenor', value: `${Number(selectedOrderInRow.tenor || 0)} months` },
                { label: 'Order Status', value: statusBadge(selectedOrderInRow.order_result_status || '') },
                { label: 'Order Notes', value: selectedOrderInRow.order_result_notes || '-' },
                { label: 'Finance 1', value: selectedOrderInRow.finance_1_name || '-' },
                { label: 'Status 1', value: statusBadge(selectedOrderInRow.finance_1_status || '') },
                { label: 'Decision At 1', value: formatDateTime(selectedOrderInRow.finance_1_decision_at) },
                { label: 'Notes Finance 1', value: selectedOrderInRow.finance_1_notes || '-' },
                { label: 'Finance 2', value: selectedOrderInRow.finance_2_name || '-' },
                { label: 'Status 2', value: statusBadge(selectedOrderInRow.finance_2_status || '') },
                { label: 'Decision At 2', value: formatDateTime(selectedOrderInRow.finance_2_decision_at) },
                { label: 'Notes Finance 2', value: selectedOrderInRow.finance_2_notes || '-' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  )
}
