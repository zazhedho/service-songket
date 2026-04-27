import type { ReactNode } from 'react'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'
import { formatRupiah } from '../../../utils/currency'
import { summarizeLocation } from './financeReportHelpers'

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

function ModalDetailSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="finance-order-modal-section">
      <div className="finance-order-modal-section-title">{title}</div>
      {children}
    </section>
  )
}

function ModalDetailField({
  label,
  value,
  wide,
}: {
  label: string
  value: ReactNode
  wide?: boolean
}) {
  return (
    <div className={`finance-order-modal-field${wide ? ' wide' : ''}`}>
      <div className="finance-order-modal-label">{label}</div>
      <div className="finance-order-modal-value">{value || '-'}</div>
    </div>
  )
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
  const renderDetailOrderCell = (row: any) => (
    <div className="finance-detail-order-cell">
      <div className="finance-detail-primary" title={row.pooling_number || '-'}>
        {row.pooling_number || '-'}
      </div>
      <div className="finance-detail-secondary">{formatDateTime(row.pooling_at)}</div>
    </div>
  )
  const renderDetailPersonCell = (row: any) => (
    <div className="finance-detail-order-cell">
      <div className="finance-detail-primary" title={row.consumer_name || '-'}>
        {truncateTableText(row.consumer_name || '-', 38)}
      </div>
      <div className="finance-detail-secondary" title={row.dealer_name || '-'}>
        {truncateTableText(row.dealer_name || '-', 42)}
      </div>
    </div>
  )
  const renderDetailLocationCell = (row: any) => {
    const namedLocation = locationNamesByOrderId[row.order_id] || {}
    const areaLocation = summarizeLocation([
      namedLocation.district,
      namedLocation.regency,
    ])
    const province = namedLocation.province || '-'
    const detailLocation = summarizeLocation([
      row.village,
      row.address,
    ])
    const primaryLocation = areaLocation !== '-' ? areaLocation : detailLocation

    return (
      <div className="finance-detail-order-cell">
        <div className="finance-detail-primary" title={primaryLocation}>
          {truncateTableText(primaryLocation, 46)}
        </div>
        {province !== '-' && (
          <div className="finance-detail-secondary" title={String(province)}>
            {truncateTableText(province, 42)}
          </div>
        )}
        {areaLocation !== '-' && detailLocation !== '-' && (
          <div className="finance-detail-tertiary" title={detailLocation}>
            {truncateTableText(detailLocation, 52)}
          </div>
        )}
      </div>
    )
  }
  const renderDetailMotorCell = (row: any) => (
    <div className="finance-detail-order-cell">
      <div className="finance-detail-primary" title={row.motor_type_name || '-'}>
        {truncateTableText(row.motor_type_name || '-', 42)}
      </div>
      <div className="finance-detail-secondary">{formatRupiah(Number(row.otr || 0))}</div>
    </div>
  )
  const renderDetailFinanceCell = (
    row: any,
    statusKey: 'finance_1_status' | 'finance_2_status',
    notesKey: 'finance_1_notes' | 'finance_2_notes',
  ) => {
    const notes = String(row[notesKey] || '-')

    return (
      <div className="finance-detail-decision-cell">
        <div className="finance-detail-decision-top">
          {statusBadge(row[statusKey] || '')}
        </div>
        <div className="finance-detail-note" title={notes}>
          {truncateTableText(notes, 58)}
        </div>
      </div>
    )
  }
  const renderFinanceDecisionCard = (
    title: string,
    company: unknown,
    status: unknown,
    decisionAt: unknown,
    notes: unknown,
  ) => (
    <div className="finance-order-modal-decision">
      <div className="finance-order-modal-decision-head">
        <div>
          <div className="finance-order-modal-decision-title">{title}</div>
          <div className="finance-order-modal-decision-company">{String(company || '-')}</div>
        </div>
        {statusBadge(String(status || ''))}
      </div>
      <div className="finance-order-modal-decision-meta">
        <span>Decision</span>
        <strong>{formatDateTime(String(decisionAt || ''))}</strong>
      </div>
      <div className="finance-order-modal-notes">
        <span>Notes</span>
        <p>{String(notes || '-')}</p>
      </div>
    </div>
  )

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
                  style={{ minWidth: 1200, tableLayout: 'fixed' }}
                  isLoading={detailOrderInLoading}
                  loadingMessage="Loading order in data..."
                  emptyMessage="No order in data found for this migration."
                  rowAriaLabel={(row) => `Open order in detail for ${row.pooling_number || row.consumer_name || 'selected row'}`}
                  onRowClick={(row) => setSelectedOrderInRow(row)}
                  columns={[
                    { header: 'Order', accessor: (row) => renderDetailOrderCell(row), className: 'wrap-text', headerStyle: { width: 160 }, style: { width: 160 } },
                    { header: 'Consumer / Dealer', accessor: (row) => renderDetailPersonCell(row), className: 'wrap-text', headerStyle: { width: 190 }, style: { width: 190 } },
                    {
                      header: 'Location',
                      accessor: (row) => renderDetailLocationCell(row),
                      className: 'wrap-text',
                      headerStyle: { width: 220 },
                      style: { width: 220 },
                    },
                    { header: 'Motor / OTR', accessor: (row) => renderDetailMotorCell(row), className: 'wrap-text', headerStyle: { width: 180 }, style: { width: 180 } },
                    {
                      header: 'Finance 1',
                      accessor: (row) => renderDetailFinanceCell(row, 'finance_1_status', 'finance_1_notes'),
                      className: 'wrap-text',
                      headerStyle: { width: 225 },
                      style: { width: 225 },
                    },
                    {
                      header: 'Finance 2',
                      accessor: (row) => renderDetailFinanceCell(row, 'finance_2_status', 'finance_2_notes'),
                      className: 'wrap-text',
                      headerStyle: { width: 225 },
                      style: { width: 225 },
                    },
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
                      <table className="table metric-table finance-performance-mini-table" style={{ minWidth: 760 }}>
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
                            <td className="table-metric-cell">
                              <span className="table-metric-pill total">{computedDetailSummary.totalOrders}</span>
                            </td>
                            <td className="table-metric-cell">
                              <span className="table-metric-pill approved">{computedDetailSummary.approvedCount}</span>
                            </td>
                            <td className="table-metric-cell">
                              <span className="table-metric-pill rejected">{computedDetailSummary.rejectedCount}</span>
                            </td>
                            <td>
                              <div className="table-rate-cell">
                                <div className="table-rate-head">
                                  <span>{(computedDetailSummary.approvalRate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="table-rate-track" aria-hidden="true">
                                  <div className="table-rate-fill" style={{ width: `${Math.min(100, Math.max(0, computedDetailSummary.approvalRate * 100))}%` }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="table-lead-value">{computedDetailSummary.leadAvgSeconds != null ? `${computedDetailSummary.leadAvgSeconds.toFixed(1)} s` : '-'}</span>
                            </td>
                            <td className="table-metric-cell">
                              <span className="table-metric-pill warning">{computedDetailSummary.rescueFc2}</span>
                            </td>
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
          <div className="modal finance-order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="finance-order-modal-head">
              <div className="finance-order-modal-title-wrap">
                <div className="finance-order-modal-kicker">Order In Detail</div>
                <h3>{selectedOrderInRow.pooling_number || '-'}</h3>
                <div className="finance-order-modal-subtitle">
                  {selectedOrderInRow.consumer_name || '-'} / {selectedOrderInRow.dealer_name || '-'}
                </div>
              </div>
              <div className="finance-order-modal-head-actions">
                <button className="btn-ghost" onClick={() => setSelectedOrderInRow(null)}>Close</button>
              </div>
            </div>
            <div className="finance-order-modal-content">
              <ModalDetailSection title="Order & Customer">
                <div className="finance-order-modal-grid">
                  <ModalDetailField label="Pooling Date" value={formatDateTime(selectedOrderInRow.pooling_at)} />
                  <ModalDetailField label="Result Date" value={formatDateTime(selectedOrderInRow.result_at)} />
                  <ModalDetailField label="Dealer" value={selectedOrderInRow.dealer_name || '-'} />
                  <ModalDetailField label="Consumer" value={selectedOrderInRow.consumer_name || '-'} />
                  <ModalDetailField label="Phone" value={selectedOrderInRow.consumer_phone || '-'} />
                  <ModalDetailField label="Job" value={selectedOrderInRow.job_name || '-'} />
                  <ModalDetailField label="Location" value={modalLocationText} wide />
                  <ModalDetailField label="Order Notes" value={selectedOrderInRow.order_result_notes || '-'} wide />
                </div>
              </ModalDetailSection>

              <ModalDetailSection title="Unit & Credit">
                <div className="finance-order-modal-grid compact">
                  <ModalDetailField label="Motor / OTR" value={modalMotorOtrText} wide />
                  <ModalDetailField label="Installment" value={formatRupiah(Number(selectedOrderInRow.installment_amount || 0))} />
                  <ModalDetailField label="Net Income" value={formatRupiah(Number(selectedOrderInRow.net_income || 0))} />
                  <ModalDetailField label="DP Gross" value={formatRupiah(Number(selectedOrderInRow.dp_gross || 0))} />
                  <ModalDetailField label="DP Paid" value={formatRupiah(Number(selectedOrderInRow.dp_paid || 0))} />
                  <ModalDetailField label="DP Percentage" value={`${Number(selectedOrderInRow.dp_pct || 0).toFixed(2)}%`} />
                  <ModalDetailField label="Tenor" value={`${Number(selectedOrderInRow.tenor || 0)} months`} />
                </div>
              </ModalDetailSection>

              <ModalDetailSection title="Finance Decisions">
                <div className="finance-order-modal-decision-grid">
                  {renderFinanceDecisionCard(
                    'Finance 1',
                    selectedOrderInRow.finance_1_name,
                    selectedOrderInRow.finance_1_status,
                    selectedOrderInRow.finance_1_decision_at,
                    selectedOrderInRow.finance_1_notes,
                  )}
                  {renderFinanceDecisionCard(
                    'Finance 2',
                    selectedOrderInRow.finance_2_name,
                    selectedOrderInRow.finance_2_status,
                    selectedOrderInRow.finance_2_decision_at,
                    selectedOrderInRow.finance_2_notes,
                  )}
                </div>
              </ModalDetailSection>

              <ModalDetailSection title="Audit">
                <div className="finance-order-modal-grid compact">
                  <ModalDetailField label="Created At" value={formatDateTime(selectedOrderInRow.order_created_at)} />
                  <ModalDetailField label="Updated At" value={formatDateTime(selectedOrderInRow.order_updated_at)} />
                </div>
              </ModalDetailSection>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
