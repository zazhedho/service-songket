import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createNetIncome,
  deleteNetIncome,
  fetchKabupaten,
  fetchProvinces,
  getNetIncome,
  listJobs,
  listNetIncome,
  updateNetIncome,
} from '../api'
import { useConfirm } from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../utils/currency'

type OptionItem = {
  code: string
  name: string
}

type JobItem = {
  id: string
  name: string
}

type NetIncomeArea = {
  province_code: string
  province_name: string
  regency_code: string
  regency_name: string
}

type NetIncomeItem = {
  id: string
  job_id: string
  job_name?: string
  net_income: number
  area_net_income: NetIncomeArea[]
  created_at?: string
  updated_at?: string
}

const emptyForm = {
  job_id: '',
  net_income: '0',
  province_code: '',
  regency_code: '',
  selected_areas: [] as NetIncomeArea[],
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/net-income\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function normalizeAreaInput(raw: any): NetIncomeArea[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const out: NetIncomeArea[] = []

  raw.forEach((entry) => {
    if (typeof entry === 'string') {
      const val = entry.trim()
      if (!val) return
      const key = `|${val}|${val}`.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      out.push({
        province_code: '',
        province_name: '',
        regency_code: val,
        regency_name: val,
      })
      return
    }

    if (!entry || typeof entry !== 'object') return

    const provinceCode = String(entry.province_code || '').trim()
    const provinceName = String(entry.province_name || '').trim()
    const regencyCode = String(entry.regency_code || '').trim()
    const regencyName = String(entry.regency_name || '').trim()

    if (!regencyCode && !regencyName) return

    const normalized: NetIncomeArea = {
      province_code: provinceCode,
      province_name: provinceName,
      regency_code: regencyCode || regencyName,
      regency_name: regencyName || regencyCode,
    }

    const key = `${normalized.province_code}|${normalized.regency_code}|${normalized.regency_name}`.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(normalized)
  })

  return out
}

function normalizeNetIncomeItem(raw: any): NetIncomeItem {
  return {
    id: String(raw?.id || ''),
    job_id: String(raw?.job_id || ''),
    job_name: raw?.job_name || '',
    net_income: Number(raw?.net_income || 0),
    area_net_income: normalizeAreaInput(raw?.area_net_income),
    created_at: raw?.created_at,
    updated_at: raw?.updated_at,
  }
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}

function areaLabel(area: NetIncomeArea) {
  const province = area.province_name || area.province_code
  const regency = area.regency_name || area.regency_code
  if (province) return `${province} - ${regency}`
  return regency || '-'
}

export default function NetIncomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_net_income')
  const canCreate = perms.includes('create_net_income')
  const canUpdate = perms.includes('update_net_income')
  const canDelete = perms.includes('delete_net_income')
  const confirm = useConfirm()

  const [items, setItems] = useState<NetIncomeItem[]>([])
  const [jobs, setJobs] = useState<JobItem[]>([])
  const [provinces, setProvinces] = useState<OptionItem[]>([])
  const [kabupaten, setKabupaten] = useState<OptionItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<NetIncomeItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const stateItem = (location.state as any)?.item || null

  const load = async () => {
    const [netRes, jobRes, provRes] = await Promise.all([
      listNetIncome({ page, limit, search: search || undefined }).catch(() => ({ data: { data: [] } } as any)),
      listJobs({ page: 1, limit: 500 }).catch(() => ({ data: { data: [] } } as any)),
      fetchProvinces().catch(() => ({ data: { data: [] } } as any)),
    ])

    const netData = netRes.data?.data || netRes.data || []
    const jobData = jobRes.data?.data || jobRes.data || []
    const provData = provRes.data?.data || provRes.data || []

    setItems(Array.isArray(netData) ? netData.map((item: any) => normalizeNetIncomeItem(item)) : [])
    setJobs(Array.isArray(jobData) ? jobData : [])
    setProvinces(Array.isArray(provData) ? provData : [])

    setTotalPages(netRes.data?.total_pages || 1)
    setTotalData(netRes.data?.total_data || 0)
    setPage(netRes.data?.current_page || page)
  }

  useEffect(() => {
    load().catch(() => {
      setItems([])
      setJobs([])
      setProvinces([])
    })
  }, [limit, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if ((canList || isEdit || isDetail) && items.length === 0) {
      load().catch(() => {
        setItems([])
        setJobs([])
        setProvinces([])
      })
    }
  }, [canList, isEdit, isDetail, items.length])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? normalizeNetIncomeItem(stateItem) : null) || fetchedItem
  }, [items, selectedId, stateItem, fetchedItem])

  useEffect(() => {
    if (!selectedId || selectedItem) return
    getNetIncome(selectedId)
      .then((res) => {
        const data = res.data?.data || res.data
        setFetchedItem(data ? normalizeNetIncomeItem(data) : null)
      })
      .catch(() => setFetchedItem(null))
  }, [selectedId, selectedItem])

  useEffect(() => {
    if (isCreate) {
      setForm((prev) => ({ ...emptyForm, job_id: prev.job_id || '' }))
      return
    }

    if (isEdit && selectedItem) {
      setForm({
        job_id: selectedItem.job_id || '',
        net_income: formatRupiahInput(String(selectedItem.net_income ?? 0)),
        province_code: '',
        regency_code: '',
        selected_areas: normalizeAreaInput(selectedItem.area_net_income),
      })
    }
  }, [isCreate, isEdit, selectedItem])

  useEffect(() => {
    if ((isCreate || isEdit) && jobs.length && !form.job_id) {
      setForm((prev) => ({ ...prev, job_id: jobs[0].id }))
    }
  }, [isCreate, isEdit, jobs, form.job_id])

  useEffect(() => {
    if (!(isCreate || isEdit)) return

    if (!form.province_code) {
      setKabupaten([])
      return
    }

    fetchKabupaten(form.province_code)
      .then((res) => {
        const data = res.data?.data || res.data || []
        setKabupaten(Array.isArray(data) ? data : [])
      })
      .catch(() => setKabupaten([]))
  }, [isCreate, isEdit, form.province_code])

  const addArea = () => {
    const province = provinces.find((item) => item.code === form.province_code)
    const regency = kabupaten.find((item) => item.code === form.regency_code)

    if (!province) {
      setError('Provinsi wajib dipilih')
      return
    }
    if (!regency) {
      setError('Kabupaten/Kota wajib dipilih')
      return
    }

    const nextArea: NetIncomeArea = {
      province_code: province.code,
      province_name: province.name,
      regency_code: regency.code,
      regency_name: regency.name,
    }

    const exists = form.selected_areas.some(
      (item) => item.province_code === nextArea.province_code && item.regency_code === nextArea.regency_code,
    )
    if (exists) {
      setError('Area yang dipilih sudah ada')
      return
    }

    setError('')
    setForm((prev) => ({
      ...prev,
      selected_areas: [...prev.selected_areas, nextArea],
      regency_code: '',
    }))
  }

  const removeArea = (index: number) => {
    setForm((prev) => ({
      ...prev,
      selected_areas: prev.selected_areas.filter((_, idx) => idx !== index),
    }))
  }

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    const netIncome = parseRupiahInput(form.net_income)
    const areas = normalizeAreaInput(form.selected_areas)

    if (!form.job_id) {
      setError('Pekerjaan wajib dipilih')
      return
    }
    if (Number.isNaN(netIncome) || netIncome < 0) {
      setError('Net income harus angka >= 0')
      return
    }
    if (areas.length === 0) {
      setError('Area net income minimal 1')
      return
    }

    setLoading(true)
    setError('')
    try {
      const body = {
        job_id: form.job_id,
        net_income: netIncome,
        area_net_income: areas,
      }
      if (isEdit && selectedId) await updateNetIncome(selectedId, body)
      else await createNetIncome(body)
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/net-income')
    } catch (err: any) {
      const rawError = err?.response?.data?.error
      const message =
        (typeof rawError === 'string' && rawError.trim()) ||
        (rawError && typeof rawError === 'object' && typeof rawError.message === 'string' && rawError.message.trim()) ||
        (typeof err?.response?.data?.message === 'string' && err.response.data.message.trim()) ||
        'Gagal menyimpan net income'
      setError(message)
      await confirm({
        title: 'Save Failed',
        description: message,
        confirmText: 'OK',
        cancelText: 'Close',
        tone: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Net Income',
      description: 'Are you sure you want to delete this net income data?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    await deleteNetIncome(id)
    await load()
  }

  const jobName = (id: string, fallback?: string) => {
    if (fallback) return fallback
    return jobs.find((j) => j.id === id)?.name || '-'
  }

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Net Income Details</div>
            <div style={{ color: '#64748b' }}>Net income summary per job and area</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/net-income/${selectedId}/edit`, { state: { item: selectedItem } })}>
                Edit
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/net-income')}>Back</button>
          </div>
        </div>

        <div className="page">
          {!selectedItem && <div className="alert">Net income data not found.</div>}
          {selectedItem && (
            <div className="card" style={{ maxWidth: 820 }}>
              <h3 style={{ marginTop: 0 }}>Net Income Information</h3>
              <table className="table" style={{ marginTop: 10 }}>
                <tbody>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Job</th>
                    <td style={{ fontWeight: 600 }}>{jobName(selectedItem.job_id, selectedItem.job_name)}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Net Income</th>
                    <td style={{ fontWeight: 600 }}>{formatRupiah(Number(selectedItem.net_income || 0))}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Area Coverage</th>
                    <td style={{ fontWeight: 600 }}>
                      {selectedItem.area_net_income.length ? selectedItem.area_net_income.map((area) => areaLabel(area)).join(', ') : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Created At</th>
                    <td style={{ fontWeight: 600 }}>{formatDate(selectedItem.created_at)}</td>
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Net Income' : 'Input Net Income'}</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/net-income')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 900 }}>
            {!canCreate && isCreate && <div className="alert">Tidak ada izin membuat data.</div>}
            {!canUpdate && isEdit && <div className="alert">Tidak ada izin mengubah data.</div>}

            <div className="grid" style={{ gap: 10 }}>
              <div>
                <label>Pekerjaan</label>
                <select value={form.job_id} onChange={(e) => setForm((prev) => ({ ...prev, job_id: e.target.value }))}>
                  <option value="">Pilih pekerjaan</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Net Income</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.net_income}
                  onChange={(e) => setForm((prev) => ({ ...prev, net_income: formatRupiahInput(e.target.value) }))}
                />
              </div>

              <div style={{ border: '1px solid #dde4ee', borderRadius: 10, padding: 12, background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Tambah Area Net Income</div>
                <div className="grid" style={{ gap: 10 }}>
                  <div>
                    <label>Provinsi</label>
                    <select
                      value={form.province_code}
                      onChange={(e) => setForm((prev) => ({ ...prev, province_code: e.target.value, regency_code: '' }))}
                    >
                      <option value="">Pilih provinsi</option>
                      {provinces.map((province) => (
                        <option key={province.code} value={province.code}>{province.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Kabupaten / Kota</label>
                    <select
                      value={form.regency_code}
                      onChange={(e) => setForm((prev) => ({ ...prev, regency_code: e.target.value }))}
                      disabled={!form.province_code}
                    >
                      <option value="">Pilih kabupaten/kota</option>
                      {kabupaten.map((item) => (
                        <option key={item.code} value={item.code}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <button className="btn-ghost" type="button" onClick={addArea}>Tambah Area</button>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  {form.selected_areas.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>Belum ada area dipilih.</div>}
                  {form.selected_areas.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {form.selected_areas.map((area, idx) => (
                        <div
                          key={`${area.province_code}-${area.regency_code}-${idx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            border: '1px solid #dde4ee',
                            borderRadius: 8,
                            padding: '8px 10px',
                            background: '#fff',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{areaLabel(area)}</div>
                          <button className="btn-ghost" type="button" onClick={() => removeArea(idx)}>Hapus</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => void save()} disabled={loading}>
                  {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                </button>
                <button className="btn-ghost" onClick={() => navigate('/net-income')}>Batal</button>
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Net Income</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/net-income/create')}>Input Net Income</button>}
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search Net Income</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama pekerjaan" />
          </div>

          <h3>Daftar Net Income</h3>
          {!canList && <div className="alert">Tidak ada izin melihat data net income.</div>}
          {canList && (
            <>
              <table className="table">
              <thead>
                <tr>
                  <th>Pekerjaan</th>
                  <th>Net Income</th>
                  <th>Area</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{jobName(item.job_id, item.job_name)}</td>
                    <td>{formatRupiah(Number(item.net_income || 0))}</td>
                    <td>{item.area_net_income.length ? item.area_net_income.map((area) => areaLabel(area)).join(', ') : '-'}</td>
                    <td>{formatDate(item.updated_at)}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-ghost" onClick={() => navigate(`/net-income/${item.id}`, { state: { item } })}>View</button>
                      {canUpdate && (
                        <button className="btn-ghost" onClick={() => navigate(`/net-income/${item.id}/edit`, { state: { item } })}>
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
                    <td colSpan={5}>Belum ada data net income.</td>
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
