import { FormEvent, useEffect, useMemo, useState } from 'react'
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
import { useAuth } from '../store'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '' })

  const stateOrder = (location.state as any)?.order || null

  const loadList = async (params?: Record<string, unknown>) => {
    const res = await fetchOrders(params || { limit: 80 })
    setList(res.data.data || res.data || [])
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
      loadList({ limit: 80, search: filters.search || undefined, status: filters.status || undefined }).catch(() => setList([]))
    }
  }, [filters, isList, showTable])

  useEffect(() => {
    if (isEdit || isDetail) {
      loadList({ limit: 200 }).catch(() => setList([]))
    }
  }, [isDetail, isEdit])

  const selectedOrder = useMemo(() => {
    if (!selectedId) return null
    return list.find((order) => order.id === selectedId) || (stateOrder?.id === selectedId ? stateOrder : null)
  }, [list, selectedId, stateOrder])

  const applyOrderToForm = (order: any) => {
    setForm({
      pooling_number: order.pooling_number || '',
      pooling_at: order.pooling_at || dayjs().toISOString(),
      result_at: order.result_at || '',
      dealer_id: order.dealer_id || '',
      finance_company_id: order.attempts?.[0]?.finance_company_id || '',
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
      finance_company2_id: order.attempts?.[1]?.finance_company_id || '',
      result_status2: order.attempts?.[1]?.status || '',
      result_notes2: order.attempts?.[1]?.notes || '',
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

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setError('')

    try {
      if (isEdit && selectedId) await updateOrder(selectedId, form)
      else await createOrder(form)
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
    if (!window.confirm('Hapus order ini?')) return

    setLoading(true)
    try {
      await deleteOrder(id)
      await loadList({ limit: 80, search: filters.search || undefined, status: filters.status || undefined })
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

  const formatRupiah = (num: number) =>
    (isNaN(num) ? 0 : num).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

  const parseNumber = (value: string) => Number(value.replace(/[^0-9]/g, '')) || 0

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
            <div className="card" style={{ maxWidth: 980 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <DetailRow label="Pooling Number" value={selectedOrder.pooling_number} />
                <DetailRow label="Waktu Pooling" value={formatDate(selectedOrder.pooling_at)} />
                <DetailRow label="Waktu Hasil" value={formatDate(selectedOrder.result_at)} />
                <DetailRow label="Dealer" value={lookupName(lookups?.dealers, selectedOrder.dealer_id)} />
                <DetailRow label="Konsumen" value={selectedOrder.consumer_name} />
                <DetailRow label="Phone" value={selectedOrder.consumer_phone} />
                <DetailRow label="Lokasi" value={[selectedOrder.province, selectedOrder.regency, selectedOrder.district, selectedOrder.village].filter(Boolean).join(' / ')} />
                <DetailRow label="Alamat" value={selectedOrder.address || '-'} />
                <DetailRow label="Pekerjaan" value={lookupName(lookups?.jobs, selectedOrder.job_id)} />
                <DetailRow label="Tipe Motor" value={lookupName(lookups?.motor_types, selectedOrder.motor_type_id)} />
                <DetailRow label="DP Gross" value={formatRupiah(selectedOrder.dp_gross || 0)} />
                <DetailRow label="DP Setor" value={formatRupiah(selectedOrder.dp_paid || 0)} />
                <DetailRow label="Tenor" value={`${selectedOrder.tenor || 0} bln`} />
                <DetailRow label="Status" value={selectedOrder.result_status || '-'} />
                <DetailRow label="Catatan" value={selectedOrder.result_notes || '-'} />
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

            <form className="grid" style={{ gap: 12 }} onSubmit={submit}>
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

              <div>
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
                  {lookups?.motor_types?.map((motor: any) => (
                    <option key={motor.id} value={motor.id}>{motor.name} - OTR {motor.otr?.toLocaleString?.('id-ID')}</option>
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

              <div>
                <label>Keterangan Hasil</label>
                <input value={form.result_notes} onChange={(e) => set('result_notes', e.target.value)} />
              </div>

              {form.result_status === 'reject' && (
                <>
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

                  <div>
                    <label>Keterangan Finance 2</label>
                    <input value={form.result_notes2} onChange={(e) => set('result_notes2', e.target.value)} />
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
          <div style={{ color: '#64748b' }}>Default halaman menampilkan tabel order + aksi CRUD</div>
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
                    <td>{lookupName(lookups?.finance_companies, order.attempts?.[0]?.finance_company_id)}</td>
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
          )}
        </div>
      </div>
    </div>
  )
}

function lookupName(list: any[] | undefined, id: string) {
  if (!id) return '-'
  return list?.find((item) => item.id === id)?.name || id
}

function formatDate(value?: string) {
  if (!value) return '-'
  return dayjs(value).format('DD MMM YYYY HH:mm')
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, padding: '5px 0' }}>
      <div style={{ color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value || '-'}</div>
    </div>
  )
}
