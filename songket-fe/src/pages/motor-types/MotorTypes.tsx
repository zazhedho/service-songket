import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createMotorType,
  deleteMotorType,
  getMotorType,
  listMotorTypes,
  updateMotorType,
} from '../../services/motorTypeService'
import {
  fetchKabupaten,
  fetchProvinces,
} from '../../services/locationService'
import ActionMenu from '../../components/common/ActionMenu'
import { useConfirm } from '../../components/common/ConfirmDialog'
import Pagination from '../../components/common/Pagination'
import { useAuth } from '../../store'
import { formatRupiah, parseRupiahInput } from '../../utils/currency'

type MotorTypeItem = {
  id: string
  name: string
  brand: string
  model: string
  type: string
  otr: number
  province_code: string
  province_name: string
  regency_code: string
  regency_name: string
  created_at?: string
  updated_at?: string
}

type FormState = {
  name: string
  brand: string
  model: string
  type: string
  otr: number
  province_code: string
  province_name: string
  regency_code: string
  regency_name: string
}

const emptyForm: FormState = {
  name: '',
  brand: '',
  model: '',
  type: '',
  otr: 0,
  province_code: '',
  province_name: '',
  regency_code: '',
  regency_name: '',
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/motor-types\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}

function errorMessage(err: any, fallback: string) {
  const raw = err?.response?.data?.error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object' && typeof raw.message === 'string' && raw.message.trim()) return raw.message
  return fallback
}

export default function MotorTypesPage() {
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
  const canList = perms.includes('list_motor_types')
  const canView = perms.includes('view_motor_types')
  const canCreate = perms.includes('create_motor_types')
  const canUpdate = perms.includes('update_motor_types')
  const canDelete = perms.includes('delete_motor_types')
  const confirm = useConfirm()

  const [items, setItems] = useState<MotorTypeItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<MotorTypeItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const [regencyFilter, setRegencyFilter] = useState('')
  const [provinces, setProvinces] = useState<any[]>([])
  const [regencies, setRegencies] = useState<any[]>([])
  const [filterRegencies, setFilterRegencies] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const stateItem = (location.state as any)?.motorType || null

  const load = async () => {
    const res = await listMotorTypes({
      page,
      limit,
      search: search || undefined,
      filters: {
        province_code: provinceFilter || undefined,
        regency_code: regencyFilter || undefined,
      },
    })
    setItems(res.data.data || res.data || [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || page)
  }

  useEffect(() => {
    fetchProvinces()
      .then((res) => setProvinces(res.data.data || res.data || []))
      .catch(() => setProvinces([]))
  }, [])

  useEffect(() => {
    if (!provinceFilter) {
      setFilterRegencies([])
      setRegencyFilter('')
      return
    }
    fetchKabupaten(provinceFilter)
      .then((res) => setFilterRegencies(res.data.data || res.data || []))
      .catch(() => setFilterRegencies([]))
  }, [provinceFilter])

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setItems([]))
    }
  }, [canList, isEdit, isDetail, isList, limit, page, search, provinceFilter, regencyFilter])

  useEffect(() => {
    setPage(1)
  }, [search, provinceFilter, regencyFilter])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null) || fetchedItem
  }, [items, selectedId, stateItem, fetchedItem])

  useEffect(() => {
    if (!selectedId || selectedItem) return
    getMotorType(selectedId)
      .then((res) => {
        const data = res.data?.data || res.data
        setFetchedItem(data || null)
      })
      .catch(() => setFetchedItem(null))
  }, [selectedId, selectedItem])

  useEffect(() => {
    if (!form.province_code) {
      setRegencies([])
      setForm((prev) => ({ ...prev, regency_code: '', regency_name: '' }))
      return
    }
    fetchKabupaten(form.province_code)
      .then((res) => setRegencies(res.data.data || res.data || []))
      .catch(() => setRegencies([]))
  }, [form.province_code])

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm)
      setError('')
      return
    }

    if (isEdit && selectedItem) {
      setForm({
        name: selectedItem.name || '',
        brand: selectedItem.brand || '',
        model: selectedItem.model || '',
        type: selectedItem.type || '',
        otr: selectedItem.otr || 0,
        province_code: selectedItem.province_code || '',
        province_name: selectedItem.province_name || '',
        regency_code: selectedItem.regency_code || '',
        regency_name: selectedItem.regency_name || '',
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
        await updateMotorType(selectedId, form)
      } else {
        await createMotorType(form)
      }
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/motor-types')
    } catch (err: any) {
      const message = errorMessage(err, 'Gagal menyimpan jenis motor')
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Motor Type',
      description: 'Are you sure you want to delete this motor type?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    try {
      await deleteMotorType(id)
      await load()
    } catch (err: any) {
      window.alert(errorMessage(err, 'Gagal menghapus jenis motor'))
    }
  }

  const updateProvince = (code: string) => {
    const item = provinces.find((p) => p.code === code)
    setForm((prev) => ({
      ...prev,
      province_code: code,
      province_name: item?.name || '',
      regency_code: '',
      regency_name: '',
    }))
  }

  const updateRegency = (code: string) => {
    const item = regencies.find((r) => r.code === code)
    setForm((prev) => ({
      ...prev,
      regency_code: code,
      regency_name: item?.name || '',
    }))
  }

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Type Details</div>
            <div style={{ color: '#64748b' }}>Motor type data by area</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/motor-types/${selectedId}/edit`, { state: { motorType: selectedItem } })}>
                Edit
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Back</button>
          </div>
        </div>

        <div className="page">
          {!selectedItem && <div className="alert">Motor type data not found.</div>}
          {selectedItem && (
            <div className="card" style={{ maxWidth: 860 }}>
              <h3 style={{ marginTop: 0 }}>Motor Type Information</h3>
              <table className="table" style={{ marginTop: 10 }}>
                <tbody>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Motor Type</th>
                    <td style={{ fontWeight: 600 }}>{selectedItem.name || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Brand</th>
                    <td style={{ fontWeight: 600 }}>{selectedItem.brand || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Model</th>
                    <td style={{ fontWeight: 600 }}>{selectedItem.model || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Variant</th>
                    <td style={{ fontWeight: 600 }}>{selectedItem.type || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>OTR</th>
                    <td style={{ fontWeight: 600 }}>{formatRupiah(selectedItem.otr || 0)}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Province</th>
                    <td style={{ fontWeight: 600 }}>{selectedItem.province_name || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Regency / City</th>
                    <td style={{ fontWeight: 600 }}>{selectedItem.regency_name || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Updated At</th>
                    <td style={{ fontWeight: 600 }}>{formatDate(selectedItem.updated_at)}</td>
                  </tr>
                </tbody>
              </table>
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Jenis Motor' : 'Input Jenis Motor'}</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 980 }}>
            {!canCreate && isCreate && <div className="alert">Tidak ada izin membuat data.</div>}
            {!canUpdate && isEdit && <div className="alert">Tidak ada izin mengubah data.</div>}

            <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              <div>
                <label>Jenis Motor</label>
                <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>

              <div>
                <label>Merek</label>
                <input value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} />
              </div>

              <div>
                <label>Model</label>
                <input value={form.model} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))} />
              </div>

              <div>
                <label>Type</label>
                <input value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} />
              </div>

              <div>
                <label>OTR</label>
                <input
                  type="text"
                  value={formatRupiah(form.otr)}
                  onChange={(e) => setForm((prev) => ({ ...prev, otr: parseRupiahInput(e.target.value) }))}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label>Provinsi</label>
                <select value={form.province_code} onChange={(e) => updateProvince(e.target.value)}>
                  <option value="">Pilih</option>
                  {provinces.map((province: any) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Kabupaten/Kota</label>
                <select value={form.regency_code} onChange={(e) => updateRegency(e.target.value)} disabled={!form.province_code}>
                  <option value="">Pilih</option>
                  {regencies.map((regency: any) => (
                    <option key={regency.code} value={regency.code}>{regency.name}</option>
                  ))}
                </select>
              </div>

              {error && <div style={{ color: '#b91c1c', fontSize: 13, gridColumn: '1 / -1' }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, gridColumn: '1 / -1' }}>
                <button className="btn" onClick={() => void save()} disabled={loading}>
                  {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                </button>
                <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Batal</button>
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Jenis Motor</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/motor-types/create')}>Input Jenis Motor</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div>
              <label>Search</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari jenis/merek/model" />
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
                {filterRegencies.map((regency: any) => (
                  <option key={regency.code} value={regency.code}>{regency.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Daftar Jenis Motor</h3>
          {(!canList || !canView) && <div className="alert">Tidak ada izin melihat data jenis motor.</div>}
          {canList && canView && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Jenis</th>
                    <th>Merek/Model</th>
                    <th>Type</th>
                    <th>OTR</th>
                    <th>Wilayah</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name || '-'}</td>
                      <td>{[item.brand, item.model].filter(Boolean).join(' / ') || '-'}</td>
                      <td>{item.type || '-'}</td>
                      <td>{formatRupiah(item.otr || 0)}</td>
                      <td>{[item.regency_name, item.province_name].filter(Boolean).join(', ') || '-'}</td>
                      <td className="action-cell">
                        <ActionMenu
                          items={[
                            {
                              key: 'view',
                              label: 'View',
                              onClick: () => navigate(`/motor-types/${item.id}`, { state: { motorType: item } }),
                            },
                            {
                              key: 'edit',
                              label: 'Edit',
                              onClick: () => navigate(`/motor-types/${item.id}/edit`, { state: { motorType: item } }),
                              hidden: !canUpdate,
                            },
                            {
                              key: 'delete',
                              label: 'Delete',
                              onClick: () => void remove(item.id),
                              hidden: !canDelete,
                              danger: true,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6}>Belum ada data jenis motor.</td>
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
