import { useMemo } from 'react'
import { DetailTable, formatDate, lookupDisplayName, lookupName, lookupOptionName } from './orderHelpers'
import { formatRupiah } from '../../../utils/currency'

type OrderDetailViewProps = {
  backTo: string
  canUpdate: boolean
  detailKabupaten: any[]
  detailKecamatan: any[]
  lookups: any
  navigate: (path: string, options?: any) => void
  provinces: any[]
  selectedId: string
  selectedOrder: any
}

export default function OrderDetailView({
  backTo,
  canUpdate,
  detailKabupaten,
  detailKecamatan,
  lookups,
  navigate,
  provinces,
  selectedId,
  selectedOrder,
}: OrderDetailViewProps) {
  const detailAttempts = useMemo(() => {
    if (!selectedOrder) return []

    const attempts = Array.isArray(selectedOrder?.attempts) ? [...selectedOrder.attempts] : []
    const hasAttempt1 = attempts.some((item: any) => Number(item?.attempt_no) === 1)
    if (!hasAttempt1) {
      attempts.push({
        attempt_no: 1,
        finance_company_id: selectedOrder.finance_company_id,
        status: selectedOrder.result_status,
        notes: selectedOrder.result_notes,
        created_at: selectedOrder.created_at,
      })
    }

    return attempts
      .filter((item: any) => {
        const attemptNo = Number(item?.attempt_no || 0)
        return attemptNo > 0 && attemptNo <= 2
      })
      .sort((a: any, b: any) => Number(a?.attempt_no || 0) - Number(b?.attempt_no || 0))
      .filter((item: any, index: number, rows: any[]) => {
        if (index === 0) return true
        const prev = rows[index - 1]
        return String(prev?.status || '').toLowerCase() === 'reject'
      })
  }, [selectedOrder])

  const detailMotor = selectedOrder?.motor_type || lookups?.motor_types?.find((m: any) => m.id === selectedOrder?.motor_type_id) || null
  const detailDpPct = Number.isFinite(Number(selectedOrder?.dp_pct))
    ? Number(selectedOrder?.dp_pct)
    : selectedOrder?.otr
      ? (Number(selectedOrder?.dp_paid || 0) / Number(selectedOrder.otr || 1)) * 100
      : 0
  const detailProvinceName = lookupOptionName(provinces, selectedOrder?.province)
  const detailRegencyName = lookupOptionName(detailKabupaten, selectedOrder?.regency)
  const detailDistrictName = lookupOptionName(detailKecamatan, selectedOrder?.district)
  const detailVillageName = selectedOrder?.village || '-'
  const financeName = (attempt: any) =>
    lookupDisplayName(
      lookups?.finance_companies,
      attempt?.finance_company_id,
      attempt?.finance_company?.name,
    )

  return (
    <div className="order-shell">
      <div className="header order-header">
        <div className="order-heading">
          <div className="order-eyebrow">Order Detail</div>
          <div className="order-title">Order Details</div>
          <div className="order-subtitle">Review consumer, dealer, credit, motor, and finance result information.</div>
        </div>
        <div className="order-actions">
          {canUpdate && selectedId && (
            <button
              className="btn"
              onClick={() => navigate(`/orders/${selectedId}/edit`, { state: { order: selectedOrder, back_to: backTo } })}
            >
              Edit Order
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate(backTo)}>Back to Orders</button>
        </div>
      </div>

      <div className="page order-page">
        {!selectedOrder && <div className="alert">Order not found.</div>}
        {selectedOrder && (
          <div className="order-detail-layout">
            <div className="card order-detail-hero">
              <div className="order-detail-hero-main">
                <div className="order-detail-kicker">Pooling Number</div>
                <div className="order-detail-name">{selectedOrder.pooling_number || '-'}</div>
                <div className="order-detail-note">{selectedOrder.consumer_name || 'Consumer not available'}</div>
              </div>
              <div className="order-detail-badges">
                <span className={`order-detail-badge ${selectedOrder.result_status || 'pending'}`}>
                  {selectedOrder.result_status || 'Pending'}
                </span>
                <span className="order-detail-badge muted">
                  {detailAttempts.length} finance attempt{detailAttempts.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="order-detail-grid">
              <div className="card order-detail-panel">
                <h4>Primary Information</h4>
                <DetailTable
                  rows={[
                    { label: 'Pooling Number', value: selectedOrder.pooling_number || '-' },
                    { label: 'Pooling Time', value: formatDate(selectedOrder.pooling_at) },
                    { label: 'Result Time', value: formatDate(selectedOrder.result_at) },
                    { label: 'Dealer', value: lookupName(lookups?.dealers, selectedOrder.dealer_id) },
                    {
                      label: 'Status Order',
                      value: <span className={`badge ${selectedOrder.result_status || 'pending'}`}>{selectedOrder.result_status || '-'}</span>,
                    },
                    { label: 'Order Notes', value: selectedOrder.result_notes || '-' },
                    { label: 'Created At', value: formatDate(selectedOrder.created_at) },
                    { label: 'Last Updated', value: formatDate(selectedOrder.updated_at) },
                  ]}
                />
              </div>

              <div className="card order-detail-panel">
                <h4>Consumer Information</h4>
                <DetailTable
                  rows={[
                    { label: 'Name', value: selectedOrder.consumer_name || '-' },
                    { label: 'Phone', value: selectedOrder.consumer_phone || '-' },
                    { label: 'Province', value: detailProvinceName },
                    { label: 'Regency / City', value: detailRegencyName },
                    { label: 'District', value: detailDistrictName },
                    { label: 'Village', value: detailVillageName },
                    { label: 'Address', value: selectedOrder.address || '-' },
                    { label: 'Job', value: lookupName(lookups?.jobs, selectedOrder.job_id) },
                  ]}
                />
              </div>

              <div className="card order-detail-panel">
                <h4>Credit & Motor</h4>
                <DetailTable
                  rows={[
                    { label: 'Motor Type', value: lookupName(lookups?.motor_types, selectedOrder.motor_type_id) },
                    { label: 'Brand/Model', value: [detailMotor?.brand, detailMotor?.model].filter(Boolean).join(' / ') || '-' },
                    { label: 'OTR', value: formatRupiah(selectedOrder.otr || 0) },
                    { label: 'Installment', value: formatRupiah(selectedOrder.installment || 0) },
                    { label: 'DP Gross', value: formatRupiah(selectedOrder.dp_gross || 0) },
                    { label: 'DP Paid', value: formatRupiah(selectedOrder.dp_paid || 0) },
                    { label: '%DP', value: `${Number.isFinite(detailDpPct) ? detailDpPct.toFixed(1) : '0.0'}%` },
                    { label: 'Tenor', value: `${selectedOrder.tenor || 0} months` },
                  ]}
                />
              </div>
            </div>

            <div className="card order-detail-panel order-finance-results-card">
              <div className="order-section-head">
                <div>
                  <h4>Finance Results</h4>
                  <span>Finance attempts shown in submission order.</span>
                </div>
              </div>
              <div className="order-attempt-grid">
                {detailAttempts.map((attempt: any) => (
                  <div
                    key={`attempt-${attempt.attempt_no}`}
                    className="order-attempt-card"
                  >
                    <div className="order-attempt-head">
                      <strong>Finance Attempt {attempt.attempt_no}</strong>
                      <span className={`badge ${attempt?.status || 'pending'}`}>{attempt?.status || '-'}</span>
                    </div>
                    <DetailTable
                      rows={[
                        {
                          label: 'Finance Company',
                          value: financeName(attempt),
                        },
                        { label: 'Notes', value: attempt?.notes || '-' },
                        { label: 'Attempt Time', value: formatDate(attempt?.created_at) },
                      ]}
                    />
                  </div>
                ))}
                {detailAttempts.length === 0 && (
                  <div className="order-attempt-empty">No finance attempt data yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
