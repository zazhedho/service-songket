import { useMemo } from 'react'
import { DetailTable, formatDate, getAttempt, lookupName, lookupOptionName } from './orderHelpers'
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

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Order Details</div>
          <div style={{ color: '#64748b' }}>View complete order information</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button
              className="btn"
              onClick={() => navigate(`/orders/${selectedId}/edit`, { state: { order: selectedOrder, back_to: backTo } })}
            >
              Edit Order
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate(backTo)}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedOrder && <div className="alert">Order not found.</div>}
        {selectedOrder && (
          <div className="card">
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 12 }}>
                <div className="card" style={{ background: '#f8fafc' }}>
                  <h4 style={{ marginTop: 0 }}>Primary Information</h4>
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

                <div className="card" style={{ background: '#f8fafc' }}>
                  <h4 style={{ marginTop: 0 }}>Consumer Information</h4>
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

                <div className="card" style={{ background: '#f8fafc' }}>
                  <h4 style={{ marginTop: 0 }}>Credit & Motor</h4>
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

              <div className="card" style={{ background: '#f8fafc' }}>
                <h4 style={{ marginTop: 0 }}>Hasil Finance</h4>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 12 }}>
                  {detailAttempts.map((attempt: any) => (
                    <div
                      key={`attempt-${attempt.attempt_no}`}
                      style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#fff', minWidth: 0 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <strong>Finance Attempt {attempt.attempt_no}</strong>
                        <span className={`badge ${attempt?.status || 'pending'}`}>{attempt?.status || '-'}</span>
                      </div>
                      <DetailTable
                        rows={[
                          {
                            label: 'Finance Company',
                            value: lookupName(lookups?.finance_companies, attempt?.finance_company_id),
                          },
                          { label: 'Notes', value: attempt?.notes || '-' },
                          { label: 'Attempt Time', value: formatDate(attempt?.created_at) },
                        ]}
                      />
                    </div>
                  ))}
                  {detailAttempts.length === 0 && (
                    <div style={{ color: '#64748b', fontSize: 13 }}>No finance attempt data yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
