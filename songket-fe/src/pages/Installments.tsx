import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createInstallment,
  createMotorType,
  deleteInstallment,
  deleteMotorType,
  fetchKabupaten,
  fetchProvinces,
  getInstallment,
  listInstallments,
  updateInstallment,
  updateMotorType,
} from '../api'
import ActionMenu from '../components/ActionMenu'
import { useConfirm } from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'
import { formatRupiah, parseRupiahInput } from '../utils/currency'

type OptionItem = {
  code: string
  name: string
}

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
}

type InstallmentItem = {
  id: string
  motor_type_id: string
  amount: number
  motor_type?: MotorTypeItem
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
  amount: number
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
  return d.toLocaleString('en-US')
}

function areaLabel(motor?: MotorTypeItem) {
  if (!motor) return '-'
  return [motor.regency_name, motor.province_name].filter(Boolean).join(', ') || '-'
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
  const canList = perms.includes('list_installments') || perms.includes('list_motor_types')
  const canView = perms.includes('view_installments') || perms.includes('view_motor_types')
  const canCreate = perms.includes('create_installments') && perms.includes('create_motor_types')
  const canUpdate = perms.includes('update_installments') && perms.includes('update_motor_types')
  const canDelete = perms.includes('delete_installments')
  const confirm = useConfirm()

  const [items, setItems] = useState<InstallmentItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<InstallmentItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const [regencyFilter, setRegencyFilter] = useState('')
  const [provinces, setProvinces] = useState<OptionItem[]>([])
  const [regencies, setRegencies] = useState<OptionItem[]>([])
  const [filterRegencies, setFilterRegencies] = useState<OptionItem[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const stateItem = (location.state as any)?.item || null

  const load = async () => {
    const res = await listInstallments({
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
      .then((res) => {
        const data = res.data?.data || res.data || []
        setProvinces(Array.isArray(data) ? data : [])
      })
      .catch(() => setProvinces([]))
  }, [])

  useEffect(() => {
    if (!provinceFilter) {
      setFilterRegencies([])
      setRegencyFilter('')
      return
    }

    fetchKabupaten(provinceFilter)
      .then((res) => {
        const data = res.data?.data || res.data || []
        setFilterRegencies(Array.isArray(data) ? data : [])
      })
      .catch(() => setFilterRegencies([]))
  }, [provinceFilter])

  useEffect(() => {
    if (!form.province_code || !(isCreate || isEdit)) {
      setRegencies([])
      return
    }

    fetchKabupaten(form.province_code)
      .then((res) => {
        const data = res.data?.data || res.data || []
        setRegencies(Array.isArray(data) ? data : [])
      })
      .catch(() => setRegencies([]))
  }, [form.province_code, isCreate, isEdit])

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setItems([]))
    }
  }, [canList, isDetail, isEdit, isList, limit, page, provinceFilter, regencyFilter, search])

  useEffect(() => {
    setPage(1)
  }, [provinceFilter, regencyFilter, search])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null) || fetchedItem
  }, [fetchedItem, items, selectedId, stateItem])

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

    if (isEdit && selectedItem?.motor_type) {
      setForm({
        name: selectedItem.motor_type.name || '',
        brand: selectedItem.motor_type.brand || '',
        model: selectedItem.motor_type.model || '',
        type: selectedItem.motor_type.type || '',
        otr: Number(selectedItem.motor_type.otr || 0),
        province_code: selectedItem.motor_type.province_code || '',
        province_name: selectedItem.motor_type.province_name || '',
        regency_code: selectedItem.motor_type.regency_code || '',
        regency_name: selectedItem.motor_type.regency_name || '',
        amount: Number(selectedItem.amount || 0),
      })
      setError('')
    }
  }, [isCreate, isEdit, selectedItem])

  const updateProvince = (code: string) => {
    const province = provinces.find((item) => item.code === code)
    setForm((prev) => ({
      ...prev,
      province_code: code,
      province_name: province?.name || '',
      regency_code: '',
      regency_name: '',
    }))
  }

  const updateRegency = (code: string) => {
    const regency = regencies.find((item) => item.code === code)
    setForm((prev) => ({
      ...prev,
      regency_code: code,
      regency_name: regency?.name || '',
    }))
  }

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    const name = form.name.trim()
    const brand = form.brand.trim()
    const model = form.model.trim()
    const variantType = form.type.trim()

    if (!name || !brand || !model || !variantType) {
      setError('Motor type fields are required')
      return
    }
    if (!form.province_code || !form.regency_code) {
      setError('Province and regency are required')
      return
    }
    if (form.otr < 0) {
      setError('OTR must be >= 0')
      return
    }
    if (form.amount < 0) {
      setError('Installment amount must be >= 0')
      return
    }

    setLoading(true)
    setError('')

    try {
      const motorPayload = {
        name,
        brand,
        model,
        type: variantType,
        otr: Number(form.otr || 0),
        province_code: form.province_code,
        province_name: form.province_name,
        regency_code: form.regency_code,
        regency_name: form.regency_name,
      }

      if (isEdit && selectedId) {
        const motorTypeId = selectedItem?.motor_type_id
        if (!motorTypeId) throw new Error('Motor type not found')

        await updateMotorType(motorTypeId, motorPayload)
        await updateInstallment(selectedId, {
          motor_type_id: motorTypeId,
          amount: Number(form.amount || 0),
        })
      } else {
        const motorRes = await createMotorType(motorPayload)
        const motor = motorRes.data?.data || motorRes.data
        const motorTypeId = String(motor?.id || '').trim()

        if (!motorTypeId) throw new Error('Failed to create motor type')

        try {
          await createInstallment({
            motor_type_id: motorTypeId,
            amount: Number(form.amount || 0),
          })
        } catch (err) {
          await deleteMotorType(motorTypeId).catch(() => undefined)
          throw err
        }
      }

      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/installments')
    } catch (err: any) {
      const message = errorMessage(err, 'Failed to save motor type and installment')
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Installment',
      description: 'Are you sure you want to delete this installment data?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    try {
      await deleteInstallment(id)
      await load()
    } catch (err: any) {
      window.alert(errorMessage(err, 'Failed to delete installment data'))
    }
  }

  if (isDetail) {
    const motor = selectedItem?.motor_type

    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Type & Installment Details</div>
            <div style={{ color: '#64748b' }}>Combined motor and installment configuration</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/installments/${selectedId}/edit`, { state: { item: selectedItem } })}>
                Edit
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/installments')}>Back</button>
          </div>
        </div>

        <div className="page">
          {!selectedItem && <div className="alert">Data not found.</div>}
          {selectedItem && (
            <div className="card" style={{ maxWidth: 920 }}>
              <h3 style={{ marginTop: 0 }}>Motor Type & Installment Information</h3>
              <table className="table" style={{ marginTop: 10 }}>
                <tbody>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Motor Type</th>
                    <td style={{ fontWeight: 600 }}>{motor?.name || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Brand</th>
                    <td style={{ fontWeight: 600 }}>{motor?.brand || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Model</th>
                    <td style={{ fontWeight: 600 }}>{motor?.model || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Variant</th>
                    <td style={{ fontWeight: 600 }}>{motor?.type || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>OTR</th>
                    <td style={{ fontWeight: 600 }}>{formatRupiah(Number(motor?.otr || 0))}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Area</th>
                    <td style={{ fontWeight: 600 }}>{areaLabel(motor)}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Installment Amount</th>
                    <td style={{ fontWeight: 600 }}>{formatRupiah(Number(selectedItem.amount || 0))}</td>
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {isEdit ? 'Edit Motor Type & Installment' : 'Create Motor Type & Installment'}
            </div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/installments')}>Back to Table</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 980 }}>
            {!canCreate && isCreate && <div className="alert">No permission to create data.</div>}
            {!canUpdate && isEdit && <div className="alert">No permission to update data.</div>}

            <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              <div>
                <label>Motor Type</label>
                <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>

              <div>
                <label>Brand</label>
                <input value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} />
              </div>

              <div>
                <label>Model</label>
                <input value={form.model} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))} />
              </div>

              <div>
                <label>Variant</label>
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
                <label>Province</label>
                <select value={form.province_code} onChange={(e) => updateProvince(e.target.value)}>
                  <option value="">Select</option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Regency/City</label>
                <select value={form.regency_code} onChange={(e) => updateRegency(e.target.value)} disabled={!form.province_code}>
                  <option value="">Select</option>
                  {regencies.map((regency) => (
                    <option key={regency.code} value={regency.code}>{regency.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Installment Amount</label>
                <input
                  type="text"
                  value={formatRupiah(form.amount)}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: parseRupiahInput(e.target.value) }))}
                  inputMode="numeric"
                />
              </div>

              {error && <div style={{ color: '#b91c1c', fontSize: 13, gridColumn: '1 / -1' }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, gridColumn: '1 / -1' }}>
                <button className="btn" onClick={() => void save()} disabled={loading}>
                  {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                </button>
                <button className="btn-ghost" onClick={() => navigate('/installments')}>Cancel</button>
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Types & Installments</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/installments/create')}>Create Motor & Installment</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div>
              <label>Search</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search motor type" />
            </div>

            <div>
              <label>Filter Province</label>
              <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}>
                <option value="">All</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>{province.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Filter Regency</label>
              <select value={regencyFilter} onChange={(e) => setRegencyFilter(e.target.value)} disabled={!provinceFilter}>
                <option value="">All</option>
                {filterRegencies.map((regency) => (
                  <option key={regency.code} value={regency.code}>{regency.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Data List</h3>
          {(!canList || !canView) && <div className="alert">No permission to view data.</div>}
          {canList && canView && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Motor Type</th>
                    <th>Brand / Model</th>
                    <th>Variant</th>
                    <th>OTR</th>
                    <th>Area</th>
                    <th>Installment</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.motor_type?.name || '-'}</td>
                      <td>{[item.motor_type?.brand, item.motor_type?.model].filter(Boolean).join(' / ') || '-'}</td>
                      <td>{item.motor_type?.type || '-'}</td>
                      <td>{formatRupiah(Number(item.motor_type?.otr || 0))}</td>
                      <td>{areaLabel(item.motor_type)}</td>
                      <td>{formatRupiah(Number(item.amount || 0))}</td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td className="action-cell">
                        <ActionMenu
                          items={[
                            {
                              key: 'view',
                              label: 'View',
                              onClick: () => navigate(`/installments/${item.id}`, { state: { item } }),
                            },
                            {
                              key: 'edit',
                              label: 'Edit',
                              onClick: () => navigate(`/installments/${item.id}/edit`, { state: { item } }),
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
                      <td colSpan={8}>No data available.</td>
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
