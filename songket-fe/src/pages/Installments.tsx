import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createInstallment,
  deleteInstallment,
  fetchKabupaten,
  fetchProvinces,
  getInstallment,
  listInstallments,
  listMotorTypes,
  updateInstallment,
} from '../api'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'

type MotorTypeItem = {
  id: string
  name: string
  brand: string
  model: string
  type: string
  province_code: string
  province_name: string
  regency_code: string
  regency_name: string
}

type InstallmentItem = {
  id: string
  motor_type_id: string
  amount: number
  motor_type?: MotorTypeItem
  created_at?: string
  updated_at?: string
}

const emptyForm = {
  motor_type_id: '',
  amount: 0,
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/installments\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}

function formatRupiah(value: number) {
  const safe = Number.isNaN(value) ? 0 : value
  return safe.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
}

function parseCurrency(input: string) {
  return Number(input.replace(/[^0-9]/g, '')) || 0
}

function buildMotorLabel(motor?: MotorTypeItem) {
  if (!motor) return '-'
  const area = [motor.regency_name, motor.province_name].filter(Boolean).join(', ')
  return `${motor.name || '-'} | ${[motor.brand, motor.model, motor.type].filter(Boolean).join(' / ') || '-'}${area ? ` (${area})` : ''}`
}

function errorMessage(err: any, fallback: string) {
  const raw = err?.response?.data?.error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object' && typeof raw.message === 'string' && raw.message.trim()) return raw.message
  return fallback
}

export default function InstallmentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_installments')
  const canView = perms.includes('view_installments')
  const canCreate = perms.includes('create_installments')
  const canUpdate = perms.includes('update_installments')
  const canDelete = perms.includes('delete_installments')

  const [items, setItems] = useState<InstallmentItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<InstallmentItem | null>(null)
  const [motorTypes, setMotorTypes] = useState<MotorTypeItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [motorTypeFilter, setMotorTypeFilter] = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const [regencyFilter, setRegencyFilter] = useState('')
  const [provinces, setProvinces] = useState<any[]>([])
  const [regencies, setRegencies] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const stateItem = (location.state as any)?.installment || null

  const load = async () => {
    const res = await listInstallments({
      page,
      limit,
      search: search || undefined,
      filters: {
        motor_type_id: motorTypeFilter || undefined,
        province_code: provinceFilter || undefined,
        regency_code: regencyFilter || undefined,
      },
    })
    setItems(res.data.data || res.data || [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || page)
  }

  const loadMotorTypes = async () => {
    const res = await listMotorTypes({ page: 1, limit: 1000 })
    setMotorTypes(res.data.data || res.data || [])
  }

  useEffect(() => {
    Promise.all([
      fetchProvinces().then((res) => setProvinces(res.data.data || res.data || [])).catch(() => setProvinces([])),
      loadMotorTypes().catch(() => setMotorTypes([])),
    ]).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!provinceFilter) {
      setRegencies([])
      setRegencyFilter('')
      return
    }
    fetchKabupaten(provinceFilter)
      .then((res) => setRegencies(res.data.data || res.data || []))
      .catch(() => setRegencies([]))
  }, [provinceFilter])

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setItems([]))
    }
  }, [canList, isEdit, isDetail, isList, page, limit, search, motorTypeFilter, provinceFilter, regencyFilter])

  useEffect(() => {
    setPage(1)
  }, [search, motorTypeFilter, provinceFilter, regencyFilter])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null) || fetchedItem
  }, [items, selectedId, stateItem, fetchedItem])

  useEffect(() => {
    if (!selectedId || selectedItem) return
    getInstallment(selectedId)
      .then((res) => {
        const data = res.data?.data || res.data
        setFetchedItem(data || null)
      })
      .catch(() => setFetchedItem(null))
  }, [selectedId, selectedItem])

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm)
      setError('')
      return
    }

    if (isEdit && selectedItem) {
      setForm({
        motor_type_id: selectedItem.motor_type_id || '',
        amount: selectedItem.amount || 0,
      })
      setError('')
    }
  }, [isCreate, isEdit, selectedItem])

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setError('')

    try {
      if (isEdit && selectedId) {
        await updateInstallment(selectedId, form)
      } else {
        await createInstallment(form)
      }
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/installments')
    } catch (err: any) {
      const message = errorMessage(err, 'Gagal menyimpan data angsuran')
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    if (!window.confirm('Hapus data angsuran ini?')) return

    try {
      await deleteInstallment(id)
      await load()
    } catch (err: any) {
      window.alert(errorMessage(err, 'Gagal menghapus data angsuran'))
    }
  }

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Angsuran</div>
            <div style={{ color: '#64748b' }}>Informasi nilai angsuran per jenis motor</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/installments/${selectedId}/edit`, { state: { installment: selectedItem } })}>
                Edit
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/installments')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedItem && <div className="alert">Data angsuran tidak ditemukan.</div>}
          {selectedItem && (
            <div className="card" style={{ maxWidth: 860 }}>
              <DetailRow label="Jenis Motor" value={buildMotorLabel(selectedItem.motor_type)} />
              <DetailRow label="Nilai Angsuran" value={formatRupiah(selectedItem.amount || 0)} />
              <DetailRow label="Updated At" value={formatDate(selectedItem.updated_at)} />
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Angsuran' : 'Input Angsuran'}</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/installments')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 860 }}>
            {!canCreate && isCreate && <div className="alert">Tidak ada izin membuat data.</div>}
            {!canUpdate && isEdit && <div className="alert">Tidak ada izin mengubah data.</div>}

            <div className="grid" style={{ gap: 10 }}>
              <div>
                <label>Jenis Motor</label>
                <select
                  value={form.motor_type_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, motor_type_id: e.target.value }))}
                >
                  <option value="">Pilih</option>
                  {motorTypes.map((motor) => (
                    <option key={motor.id} value={motor.id}>{buildMotorLabel(motor)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Nilai Angsuran</label>
                <input
                  type="text"
                  value={formatRupiah(form.amount)}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: parseCurrency(e.target.value) }))}
                  inputMode="numeric"
                />
              </div>

              {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => void save()} disabled={loading}>
                  {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                </button>
                <button className="btn-ghost" onClick={() => navigate('/installments')}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Angsuran</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/installments/create')}>Input Angsuran</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div>
              <label>Search</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari jenis motor" />
            </div>

            <div>
              <label>Filter Jenis Motor</label>
              <select value={motorTypeFilter} onChange={(e) => setMotorTypeFilter(e.target.value)}>
                <option value="">Semua</option>
                {motorTypes.map((motor) => (
                  <option key={motor.id} value={motor.id}>{buildMotorLabel(motor)}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Filter Provinsi</label>
              <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}>
                <option value="">Semua</option>
                {provinces.map((province: any) => (
                  <option key={province.code} value={province.code}>{province.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Filter Kabupaten</label>
              <select value={regencyFilter} onChange={(e) => setRegencyFilter(e.target.value)} disabled={!provinceFilter}>
                <option value="">Semua</option>
                {regencies.map((regency: any) => (
                  <option key={regency.code} value={regency.code}>{regency.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Daftar Angsuran</h3>
          {(!canList || !canView) && <div className="alert">Tidak ada izin melihat data angsuran.</div>}
          {canList && canView && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Jenis Motor</th>
                    <th>Wilayah</th>
                    <th>Nilai Angsuran</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.motor_type?.name || '-'}</td>
                      <td>{[item.motor_type?.regency_name, item.motor_type?.province_name].filter(Boolean).join(', ') || '-'}</td>
                      <td>{formatRupiah(item.amount || 0)}</td>
                      <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn-ghost" onClick={() => navigate(`/installments/${item.id}`, { state: { installment: item } })}>View</button>
                        {canUpdate && (
                          <button className="btn-ghost" onClick={() => navigate(`/installments/${item.id}/edit`, { state: { installment: item } })}>
                            Edit
                          </button>
                        )}
                        {canDelete && <button className="btn-ghost" onClick={() => void remove(item.id)}>Delete</button>}
                        {!canUpdate && !canDelete && '-'}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4}>Belum ada data angsuran.</td>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, padding: '6px 0' }}>
      <div style={{ color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value || '-'}</div>
    </div>
  )
}
