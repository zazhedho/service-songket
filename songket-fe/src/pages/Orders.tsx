import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  createOrder,
  deleteOrder,
  fetchKabupaten,
  fetchKecamatan,
  fetchLookups,
  fetchOrders,
  fetchProvinces,
  updateOrder,
} from '../api'
import { useConfirm } from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'
import { formatRupiah } from '../utils/currency'

const defaultForm = {
  pooling_number: '',
  pooling_at: dayjs().toISOString(),
  result_at: '',
  dealer_id: '',
  finance_company_id: '',
  consumer_name: '',
  consumer_phone: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  address: '',
  job_id: '',
  motor_type_id: '',
  dp_gross: 0,
  dp_paid: 0,
  tenor: 12,
  result_status: 'pending',
  result_notes: '',
  finance_company2_id: '',
  result_status2: '',
  result_notes2: '',
  finance_company3_id: '',
  result_status3: '',
  result_notes3: '',
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/orders\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const permissions = useAuth((s) => s.permissions)
  const role = useAuth((s) => s.role)
  const confirm = useConfirm()

  const canCreate = permissions.includes('create_orders')
  const canUpdate = permissions.includes('update_orders')
  const canView = permissions.includes('view_orders')
  const canList = permissions.includes('list_orders')
  const canDelete = permissions.includes('delete_orders')
  const showTable = canList && canView

  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState(defaultForm)
  const [lookups, setLookups] = useState<any>({})
  const [provinces, setProvinces] = useState<any[]>([])
  const [kabupaten, setKabupaten] = useState<any[]>([])
  const [kecamatan, setKecamatan] = useState<any[]>([])
  const [detailKabupaten, setDetailKabupaten] = useState<any[]>([])
  const [detailKecamatan, setDetailKecamatan] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const stateOrder = (location.state as any)?.order || null

  const loadList = async (params?: Record<string, unknown>) => {
    const request = params || { page, limit }
    const res = await fetchOrders(request)
    setList(res.data.data || res.data || [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || (request.page as number) || 1)
  }

  const loadLookups = async () => {
    const [lookupRes, provRes] = await Promise.all([fetchLookups(), fetchProvinces()])
    setLookups(lookupRes.data.data || lookupRes.data || {})
    setProvinces(provRes.data.data || provRes.data || [])
  }

  useEffect(() => {
    loadLookups().catch(() => {
      setLookups({})
      setProvinces([])
    })
  }, [])

  useEffect(() => {
    if (role === 'dealer' && lookups?.dealers?.length === 1 && isCreate) {
      setForm((prev) => ({ ...prev, dealer_id: lookups.dealers[0].id }))
    }
  }, [isCreate, lookups.dealers, role])

  useEffect(() => {
    if (isList && showTable) {
      loadList({ page, limit, search: filters.search || undefined, status: filters.status || undefined }).catch(() => {
        setList([])
        setTotalPages(1)
        setTotalData(0)
      })
    }
  }, [filters, isList, limit, page, showTable])

  useEffect(() => {
    if (isEdit || isDetail) {
      loadList({ page: 1, limit: 200 }).catch(() => setList([]))
    }
  }, [isDetail, isEdit])

  useEffect(() => {
    setPage(1)
  }, [filters.search, filters.status])

  const selectedOrder = useMemo(() => {
    if (!selectedId) return null
    return list.find((order) => order.id === selectedId) || (stateOrder?.id === selectedId ? stateOrder : null)
  }, [list, selectedId, stateOrder])
  const detailProvinceCode = selectedOrder?.province || ''
  const detailRegencyCode = selectedOrder?.regency || ''

  const filteredMotorTypes = useMemo(() => {
    const rows = Array.isArray(lookups?.motor_types) ? lookups.motor_types : []
    if (!form.province && !form.regency) return rows
    return rows.filter((motor: any) => {
      const provinceCode = `${motor?.province_code || ''}`.trim()
      const regencyCode = `${motor?.regency_code || ''}`.trim()
      if (form.province && provinceCode !== form.province) return false
      if (form.regency && regencyCode !== form.regency) return false
      return true
    })
  }, [form.province, form.regency, lookups?.motor_types])

  const applyOrderToForm = (order: any) => {
    const firstAttempt = getAttempt(order, 1)
    const secondAttempt = getAttempt(order, 2)
    const thirdAttempt = getAttempt(order, 3)
    setForm({
      pooling_number: order.pooling_number || '',
      pooling_at: order.pooling_at || dayjs().toISOString(),
      result_at: order.result_at || '',
      dealer_id: order.dealer_id || '',
      finance_company_id: firstAttempt?.finance_company_id || '',
      consumer_name: order.consumer_name || '',
      consumer_phone: order.consumer_phone || '',
      province: order.province || '',
      regency: order.regency || '',
      district: order.district || '',
      village: order.village || '',
      address: order.address || '',
      job_id: order.job_id || '',
      motor_type_id: order.motor_type_id || '',
      dp_gross: order.dp_gross || 0,
      dp_paid: order.dp_paid || 0,
      tenor: order.tenor || 12,
      result_status: order.result_status || 'pending',
      result_notes: order.result_notes || '',
      finance_company2_id: secondAttempt?.finance_company_id || '',
      result_status2: secondAttempt?.status || '',
      result_notes2: secondAttempt?.notes || '',
      finance_company3_id: thirdAttempt?.finance_company_id || '',
      result_status3: thirdAttempt?.status || '',
      result_notes3: thirdAttempt?.notes || '',
    })
  }

  useEffect(() => {
    if (isCreate) {
      setForm(defaultForm)
      setError('')
      return
    }

    if (isEdit && selectedOrder) {
      applyOrderToForm(selectedOrder)
      setError('')
    }
  }, [isCreate, isEdit, selectedOrder])

  useEffect(() => {
    if (!isDetail || !detailProvinceCode) {
      setDetailKabupaten([])
      setDetailKecamatan([])
      return
    }

    fetchKabupaten(detailProvinceCode)
      .then((res) => {
        setDetailKabupaten(res.data.data || res.data || [])
        if (!detailRegencyCode) {
          setDetailKecamatan([])
          return
        }
        return fetchKecamatan(detailProvinceCode, detailRegencyCode)
          .then((kecRes) => setDetailKecamatan(kecRes.data.data || kecRes.data || []))
          .catch(() => setDetailKecamatan([]))
      })
      .catch(() => {
        setDetailKabupaten([])
        setDetailKecamatan([])
      })
  }, [detailProvinceCode, detailRegencyCode, isDetail])

  useEffect(() => {
    if (form.province) {
      fetchKabupaten(form.province)
        .then((res) => setKabupaten(res.data.data || res.data || []))
        .catch(() => setKabupaten([]))
    } else {
      setKabupaten([])
      setKecamatan([])
    }
  }, [form.province])

  useEffect(() => {
    if (form.province && form.regency) {
      fetchKecamatan(form.province, form.regency)
        .then((res) => setKecamatan(res.data.data || res.data || []))
        .catch(() => setKecamatan([]))
    } else {
      setKecamatan([])
    }
  }, [form.province, form.regency])

  useEffect(() => {
    if (!form.motor_type_id) return
    const exists = filteredMotorTypes.some((motor: any) => motor.id === form.motor_type_id)
    if (!exists) {
      setForm((prev) => ({ ...prev, motor_type_id: '' }))
    }
  }, [filteredMotorTypes, form.motor_type_id])

  const showAttempt2 = form.result_status === 'reject'
  const showAttempt3 = showAttempt2 && form.result_status2 === 'reject'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return
    const payload: any = { ...form }

    if (payload.result_status !== 'reject') {
      payload.finance_company2_id = ''
      payload.result_status2 = ''
      payload.result_notes2 = ''
      payload.finance_company3_id = ''
      payload.result_status3 = ''
      payload.result_notes3 = ''
    }

    if (payload.result_status2 !== 'reject') {
      payload.finance_company3_id = ''
      payload.result_status3 = ''
      payload.result_notes3 = ''
    }

    if (payload.finance_company2_id && !payload.result_status2) {
      window.alert('Pilih hasil untuk Finance Company 2.')
      return
    }
    if (!payload.finance_company2_id && payload.result_status2) {
      window.alert('Pilih Finance Company 2 sebelum mengisi hasil Finance 2.')
      return
    }
    if (payload.finance_company3_id && !payload.result_status3) {
      window.alert('Pilih hasil untuk Finance Company 3.')
      return
    }
    if (!payload.finance_company3_id && payload.result_status3) {
      window.alert('Pilih Finance Company 3 sebelum mengisi hasil Finance 3.')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (isEdit && selectedId) await updateOrder(selectedId, payload)
      else await createOrder(payload)
      if (showTable) {
        await loadList({ page, limit, search: filters.search || undefined, status: filters.status || undefined }).catch(() => undefined)
      }
      setForm(defaultForm)
      navigate('/orders')
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Gagal menyimpan order'
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const removeOrder = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Order',
      description: 'Are you sure you want to delete this order?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    setLoading(true)
    try {
      await deleteOrder(id)
      await loadList({ page, limit, search: filters.search || undefined, status: filters.status || undefined })
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Gagal menghapus order'
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const selectedMotor = lookups?.motor_types?.find((m: any) => m.id === form.motor_type_id)
  const dpPct = selectedMotor?.otr ? ((form.dp_paid / selectedMotor.otr) * 100).toFixed(1) : '0'

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const parseNumber = (value: string) => Number(value.replace(/[^0-9]/g, '')) || 0
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
      .filter((item: any) => Number(item?.attempt_no || 0) > 0)
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

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Order</div>
            <div style={{ color: '#64748b' }}>Lihat data lengkap order in</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/orders/${selectedId}/edit`, { state: { order: selectedOrder } })}>
                Edit Order
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/orders')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedOrder && <div className="alert">Order tidak ditemukan.</div>}
          {selectedOrder && (
            <div className="card">
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 12 }}>
                  <div className="card" style={{ background: '#f8fafc' }}>
                    <h4 style={{ marginTop: 0 }}>Informasi Utama</h4>
                    <DetailTable
                      rows={[
                        { label: 'Pooling Number', value: selectedOrder.pooling_number || '-' },
                        { label: 'Waktu Pooling', value: formatDate(selectedOrder.pooling_at) },
                        { label: 'Waktu Hasil', value: formatDate(selectedOrder.result_at) },
                        { label: 'Dealer', value: lookupName(lookups?.dealers, selectedOrder.dealer_id) },
                        {
                          label: 'Status Order',
                          value: <span className={`badge ${selectedOrder.result_status || 'pending'}`}>{selectedOrder.result_status || '-'}</span>,
                        },
                        { label: 'Catatan Order', value: selectedOrder.result_notes || '-' },
                        { label: 'Dibuat', value: formatDate(selectedOrder.created_at) },
                        { label: 'Update Terakhir', value: formatDate(selectedOrder.updated_at) },
                      ]}
                    />
                  </div>

                  <div className="card" style={{ background: '#f8fafc' }}>
                    <h4 style={{ marginTop: 0 }}>Data Konsumen</h4>
                    <DetailTable
                      rows={[
                        { label: 'Nama', value: selectedOrder.consumer_name || '-' },
                        { label: 'Phone', value: selectedOrder.consumer_phone || '-' },
                        { label: 'Alamat', value: selectedOrder.address || '-' },
                        { label: 'Pekerjaan', value: lookupName(lookups?.jobs, selectedOrder.job_id) },
                      ]}
                    />
                  </div>

                  <div className="card" style={{ background: '#f8fafc' }}>
                    <h4 style={{ marginTop: 0 }}>Kredit & Motor</h4>
                    <DetailTable
                      rows={[
                        { label: 'Tipe Motor', value: lookupName(lookups?.motor_types, selectedOrder.motor_type_id) },
                        { label: 'Brand/Model', value: [detailMotor?.brand, detailMotor?.model].filter(Boolean).join(' / ') || '-' },
                        { label: 'OTR', value: formatRupiah(selectedOrder.otr || 0) },
                        { label: 'DP Gross', value: formatRupiah(selectedOrder.dp_gross || 0) },
                        { label: 'DP Setor', value: formatRupiah(selectedOrder.dp_paid || 0) },
                        { label: '%DP', value: `${Number.isFinite(detailDpPct) ? detailDpPct.toFixed(1) : '0.0'}%` },
                        { label: 'Tenor', value: `${selectedOrder.tenor || 0} bln` },
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
                            { label: 'Catatan', value: attempt?.notes || '-' },
                            { label: 'Waktu Attempt', value: formatDate(attempt?.created_at) },
                          ]}
                        />
                      </div>
                    ))}
                    {detailAttempts.length === 0 && (
                      <div style={{ color: '#64748b', fontSize: 13 }}>Belum ada data attempt finance.</div>
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

  if (isCreate || isEdit) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Order In' : 'Input Order In'}</div>
            <div style={{ color: '#64748b' }}>Form order dipisah dari tabel utama</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/orders')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card">
            {isCreate && !canCreate && <div className="alert">Anda tidak punya izin membuat order.</div>}
            {isEdit && !canUpdate && <div className="alert">Anda tidak punya izin mengubah order.</div>}
            {error && <div className="alert" style={{ marginBottom: 10 }}>{error}</div>}

            <form
              className="grid"
              style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', alignItems: 'start' }}
              onSubmit={submit}
            >
              <div>
                <label>Dealer</label>
                <select
                  value={form.dealer_id}
                  onChange={(e) => set('dealer_id', e.target.value)}
                  required
                  disabled={role === 'dealer' && lookups?.dealers?.length === 1}
                >
                  <option value="">Pilih</option>
                  {lookups?.dealers?.map((dealer: any) => (
                    <option key={dealer.id} value={dealer.id}>{dealer.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Nomor Pooling</label>
                <input value={form.pooling_number} onChange={(e) => set('pooling_number', e.target.value)} required />
              </div>

              <div>
                <label>Waktu Pooling</label>
                <input
                  type="datetime-local"
                  value={dayjs(form.pooling_at).format('YYYY-MM-DDTHH:mm')}
                  onChange={(e) => set('pooling_at', dayjs(e.target.value).toISOString())}
                  required
                />
              </div>

              <div>
                <label>Waktu Hasil</label>
                <input
                  type="datetime-local"
                  value={form.result_at ? dayjs(form.result_at).format('YYYY-MM-DDTHH:mm') : ''}
                  onChange={(e) => set('result_at', e.target.value ? dayjs(e.target.value).toISOString() : '')}
                />
              </div>

              <div>
                <label>Finance Company 1</label>
                <select value={form.finance_company_id} onChange={(e) => set('finance_company_id', e.target.value)} required>
                  <option value="">Pilih</option>
                  {lookups?.finance_companies?.map((finance: any) => (
                    <option key={finance.id} value={finance.id}>{finance.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Nama Konsumen</label>
                <input value={form.consumer_name} onChange={(e) => set('consumer_name', e.target.value)} required />
              </div>

              <div>
                <label>No HP</label>
                <input value={form.consumer_phone} onChange={(e) => set('consumer_phone', e.target.value)} required />
              </div>

              <div>
                <label>Provinsi</label>
                <select
                  value={form.province}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, province: e.target.value, regency: '', district: '' }))
                  }
                >
                  <option value="">Pilih</option>
                  {provinces.map((province: any) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Kabupaten/Kota</label>
                <select
                  value={form.regency}
                  onChange={(e) => setForm((prev) => ({ ...prev, regency: e.target.value, district: '' }))}
                  disabled={!form.province}
                >
                  <option value="">Pilih</option>
                  {kabupaten.map((kab: any) => (
                    <option key={kab.code} value={kab.code}>{kab.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Kecamatan</label>
                <select value={form.district} onChange={(e) => set('district', e.target.value)} disabled={!form.regency}>
                  <option value="">Pilih</option>
                  {kecamatan.map((kec: any) => (
                    <option key={kec.code} value={kec.code}>{kec.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Kelurahan</label>
                <input value={form.village} onChange={(e) => set('village', e.target.value)} placeholder="Tulis kelurahan" />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Alamat</label>
                <input value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>

              <div>
                <label>Pekerjaan</label>
                <select value={form.job_id} onChange={(e) => set('job_id', e.target.value)}>
                  <option value="">Pilih</option>
                  {lookups?.jobs?.map((job: any) => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Tipe Motor</label>
                <select value={form.motor_type_id} onChange={(e) => set('motor_type_id', e.target.value)}>
                  <option value="">Pilih</option>
                  {filteredMotorTypes.map((motor: any) => (
                    <option key={motor.id} value={motor.id}>
                      {motor.name} - OTR {motor.otr?.toLocaleString?.('id-ID')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>OTR (auto)</label>
                <input value={selectedMotor?.otr || ''} readOnly />
              </div>

              <div>
                <label>DP Gross</label>
                <input
                  type="text"
                  value={formatRupiah(form.dp_gross)}
                  onChange={(e) => set('dp_gross', parseNumber(e.target.value))}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label>DP Setor</label>
                <input
                  type="text"
                  value={formatRupiah(form.dp_paid)}
                  onChange={(e) => set('dp_paid', parseNumber(e.target.value))}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label>%DP (auto)</label>
                <input value={dpPct} readOnly />
              </div>

              <div>
                <label>Tenor</label>
                <input type="number" min={1} max={60} value={form.tenor} onChange={(e) => set('tenor', Number(e.target.value))} />
              </div>

              <div>
                <label>Hasil</label>
                <select value={form.result_status} onChange={(e) => set('result_status', e.target.value)}>
                  <option value="approve">Approve</option>
                  <option value="pending">Pending</option>
                  <option value="reject">Reject</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Keterangan Hasil</label>
                <input value={form.result_notes} onChange={(e) => set('result_notes', e.target.value)} />
              </div>

              {showAttempt2 && (
                <>
                  <div style={{ gridColumn: '1 / -1', marginTop: 4, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Finance Attempt 2</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginBottom: 10 }}>
                      Attempt 2 akan tampil ketika hasil attempt 1 adalah reject.
                    </div>
                  </div>

                  <div>
                    <label>Finance Company 2</label>
                    <select value={form.finance_company2_id} onChange={(e) => set('finance_company2_id', e.target.value)}>
                      <option value="">Pilih</option>
                      {lookups?.finance_companies?.map((finance: any) => (
                        <option key={finance.id} value={finance.id}>{finance.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Hasil Finance 2</label>
                    <select value={form.result_status2} onChange={(e) => set('result_status2', e.target.value)}>
                      <option value="">--</option>
                      <option value="approve">Approve</option>
                      <option value="pending">Pending</option>
                      <option value="reject">Reject</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Keterangan Finance 2</label>
                    <input value={form.result_notes2} onChange={(e) => set('result_notes2', e.target.value)} />
                  </div>
                </>
              )}

              {showAttempt3 && (
                <>
                  <div style={{ gridColumn: '1 / -1', marginTop: 4, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Finance Attempt 3</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginBottom: 10 }}>
                      Attempt 3 akan tampil ketika hasil attempt 2 adalah reject.
                    </div>
                  </div>

                  <div>
                    <label>Finance Company 3</label>
                    <select value={form.finance_company3_id} onChange={(e) => set('finance_company3_id', e.target.value)}>
                      <option value="">Pilih</option>
                      {lookups?.finance_companies?.map((finance: any) => (
                        <option key={finance.id} value={finance.id}>{finance.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Hasil Finance 3</label>
                    <select value={form.result_status3} onChange={(e) => set('result_status3', e.target.value)}>
                      <option value="">--</option>
                      <option value="approve">Approve</option>
                      <option value="pending">Pending</option>
                      <option value="reject">Reject</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Keterangan Finance 3</label>
                    <input value={form.result_notes3} onChange={(e) => set('result_notes3', e.target.value)} />
                  </div>
                </>
              )}

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Order'}</button>
                <button
                  className="btn-ghost"
                  type="button"
                  onClick={() => {
                    setForm(defaultForm)
                    setError('')
                    navigate('/orders')
                  }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Form Order In</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/orders/create')}>Input Order</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            <div>
              <label>Search</label>
              <input value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} />
            </div>
            <div>
              <label>Status</label>
              <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="">Semua</option>
                <option value="approve">Approve</option>
                <option value="pending">Pending</option>
                <option value="reject">Reject</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Order Tersimpan</h3>
          {!showTable && <div className="alert">Anda tidak punya izin melihat order.</div>}
          {showTable && (
            <>
              <table className="table">
              <thead>
                <tr>
                  <th>Pooling</th>
                  <th>Konsumen</th>
                  <th>Lokasi</th>
                  <th>Finance</th>
                  <th>Status</th>
                  <th>Tenor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((order) => (
                  <tr key={order.id}>
                    <td>{order.pooling_number}</td>
                    <td>{order.consumer_name}</td>
                    <td>{[order.province, order.regency, order.district, order.village].filter(Boolean).join(' / ')}</td>
                    <td>
                      <div>{lookupName(lookups?.finance_companies, getAttempt(order, 1)?.finance_company_id)}</div>
                      {getAttempt(order, 2)?.finance_company_id && (
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          F2: {lookupName(lookups?.finance_companies, getAttempt(order, 2)?.finance_company_id)}
                        </div>
                      )}
                    </td>
                    <td><span className={`badge ${order.result_status}`}>{order.result_status}</span></td>
                    <td>{order.tenor} bln</td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn-ghost" onClick={() => navigate(`/orders/${order.id}`, { state: { order } })}>View</button>
                      {canUpdate && (
                        <button className="btn-ghost" onClick={() => navigate(`/orders/${order.id}/edit`, { state: { order } })}>
                          Edit
                        </button>
                      )}
                      {canDelete && <button className="btn-ghost" onClick={() => void removeOrder(order.id)}>Delete</button>}
                      {!canUpdate && !canDelete && '-'}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={7}>Belum ada order.</td>
                  </tr>
                )}
              </tbody>
              </table>

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
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function getAttempt(order: any, attemptNo: number) {
  const attempts = Array.isArray(order?.attempts) ? order.attempts : []
  return attempts.find((attempt: any) => Number(attempt?.attempt_no) === Number(attemptNo)) || null
}

function lookupName(list: any[] | undefined, id: string) {
  if (!id) return '-'
  return list?.find((item) => item.id === id)?.name || id
}

function lookupOptionName(list: any[] | undefined, code?: string) {
  if (!code) return '-'
  const rawCode = String(code).trim()
  const normalized = rawCode.toLowerCase()
  const found =
    list?.find((item: any) => String(item?.code || item?.id || '').trim().toLowerCase() === normalized) ||
    list?.find((item: any) => String(item?.name || '').trim().toLowerCase() === normalized)
  return found?.name || rawCode
}

function formatDate(value?: string) {
  if (!value) return '-'
  return dayjs(value).format('DD MMM YYYY HH:mm')
}

function DetailTable({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <table className="table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: '44%', textTransform: 'none', letterSpacing: 'normal' }}>{row.label}</th>
            <td style={{ fontWeight: 600, wordBreak: 'break-word' }}>{row.value ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
