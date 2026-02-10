import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createJob,
  createNetIncome,
  deleteJob,
  deleteNetIncome,
  fetchKabupaten,
  fetchProvinces,
  getJob,
  getNetIncome,
  listJobs,
  listNetIncome,
  updateJob,
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
  created_at?: string
  updated_at?: string
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

type CombinedItem = {
  job_id: string
  net_income_id: string
  name: string
  net_income: number
  area_net_income: NetIncomeArea[]
  created_at?: string
  updated_at?: string
}

const emptyForm = {
  name: '',
  net_income: '0',
  province_code: '',
  regency_code: '',
  selected_areas: [] as NetIncomeArea[],
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/jobs\/[^/]+$/.test(pathname)) return 'detail'
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
  return d.toLocaleString('en-US')
}

function areaLabel(area: NetIncomeArea) {
  const province = area.province_name || area.province_code
  const regency = area.regency_name || area.regency_code
  if (province) return `${province} - ${regency}`
  return regency || '-'
}

function errorMessage(err: any, fallback: string) {
  const raw = err?.response?.data?.error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object' && typeof raw.message === 'string' && raw.message.trim()) return raw.message
  return fallback
}

export default function JobsPage() {
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
  const canList = perms.includes('list_jobs') || perms.includes('list_net_income')
  const canCreate = perms.includes('create_jobs') && perms.includes('create_net_income')
  const canUpdate = perms.includes('update_jobs') && (perms.includes('update_net_income') || perms.includes('create_net_income'))
  const canDelete = perms.includes('delete_jobs')
  const confirm = useConfirm()

  const [items, setItems] = useState<CombinedItem[]>([])
  const [allItems, setAllItems] = useState<CombinedItem[]>([])
  const [provinces, setProvinces] = useState<OptionItem[]>([])
  const [kabupaten, setKabupaten] = useState<OptionItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const [detailJob, setDetailJob] = useState<any>(null)
  const [detailNetIncome, setDetailNetIncome] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const stateItem = (location.state as any)?.item || null

  const load = async () => {
    const [jobRes, netRes, provRes] = await Promise.all([
      listJobs({ page: 1, limit: 1000 }).catch(() => ({ data: { data: [] } } as any)),
      listNetIncome({ page: 1, limit: 1000 }).catch(() => ({ data: { data: [] } } as any)),
      fetchProvinces().catch(() => ({ data: { data: [] } } as any)),
    ])

    const jobData = jobRes.data?.data || jobRes.data || []
    const netData = netRes.data?.data || netRes.data || []
    const provData = provRes.data?.data || provRes.data || []

    const jobs: JobItem[] = Array.isArray(jobData) ? jobData : []
    const netItems: NetIncomeItem[] = Array.isArray(netData) ? netData.map((item: any) => normalizeNetIncomeItem(item)) : []

    const netMap = new Map<string, NetIncomeItem>()
    netItems.forEach((item) => {
      if (item.job_id) netMap.set(item.job_id, item)
    })

    const merged = jobs.map((job) => {
      const income = netMap.get(job.id)
      return {
        job_id: job.id,
        net_income_id: income?.id || '',
        name: job.name || '',
        net_income: Number(income?.net_income || 0),
        area_net_income: normalizeAreaInput(income?.area_net_income),
        created_at: income?.created_at || job.created_at,
        updated_at: income?.updated_at || job.updated_at,
      } as CombinedItem
    })

    const keyword = search.trim().toLowerCase()
    const filtered = keyword
      ? merged.filter((item) => item.name.toLowerCase().includes(keyword))
      : merged

    const nextTotalPages = Math.max(1, Math.ceil(filtered.length / limit) || 1)
    const safePage = Math.min(page, nextTotalPages)
    const offset = (safePage - 1) * limit

    setAllItems(filtered)
    setItems(filtered.slice(offset, offset + limit))
    setProvinces(Array.isArray(provData) ? provData : [])
    setTotalPages(nextTotalPages)
    setTotalData(filtered.length)

    if (safePage !== page) {
      setPage(safePage)
    }
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => {
        setItems([])
        setAllItems([])
        setProvinces([])
      })
    }
  }, [canList, isDetail, isEdit, isList, limit, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return (
      allItems.find((item) => item.job_id === selectedId) ||
      (stateItem?.job_id === selectedId ? stateItem : null)
    )
  }, [allItems, selectedId, stateItem])

  useEffect(() => {
    if (!isDetail || !selectedItem?.job_id) {
      setDetailJob(null)
      setDetailNetIncome(null)
      setDetailLoading(false)
      return
    }

    setDetailLoading(true)
    Promise.all([
      getJob(selectedItem.job_id).catch(() => null),
      selectedItem.net_income_id ? getNetIncome(selectedItem.net_income_id).catch(() => null) : Promise.resolve(null),
    ])
      .then(([jobRes, netRes]) => {
        const jobData = jobRes?.data?.data || jobRes?.data || null
        const netData = netRes?.data?.data || netRes?.data || null
        setDetailJob(jobData)
        setDetailNetIncome(netData)
      })
      .finally(() => setDetailLoading(false))
  }, [isDetail, selectedItem?.job_id, selectedItem?.net_income_id])

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm)
      setError('')
      return
    }

    if (isEdit && selectedItem) {
      setForm({
        name: selectedItem.name || '',
        net_income: formatRupiahInput(String(selectedItem.net_income ?? 0)),
        province_code: '',
        regency_code: '',
        selected_areas: normalizeAreaInput(selectedItem.area_net_income),
      })
      setError('')
    }
  }, [isCreate, isEdit, selectedItem])

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
  }, [form.province_code, isCreate, isEdit])

  const addArea = () => {
    const province = provinces.find((item) => item.code === form.province_code)
    const regency = kabupaten.find((item) => item.code === form.regency_code)

    if (!province) {
      setError('Province is required')
      return
    }
    if (!regency) {
      setError('Regency/City is required')
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
      setError('Selected area already exists')
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

    const name = form.name.trim()
    const netIncome = parseRupiahInput(form.net_income)
    const areas = normalizeAreaInput(form.selected_areas)

    if (!name) {
      setError('Job name is required')
      return
    }
    if (Number.isNaN(netIncome) || netIncome < 0) {
      setError('Net income must be a number >= 0')
      return
    }
    if (areas.length === 0) {
      setError('At least one area is required')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (isEdit && selectedId) {
        await updateJob(selectedId, { name })

        if (selectedItem?.net_income_id) {
          await updateNetIncome(selectedItem.net_income_id, {
            job_id: selectedId,
            net_income: netIncome,
            area_net_income: areas,
          })
        } else {
          await createNetIncome({
            job_id: selectedId,
            net_income: netIncome,
            area_net_income: areas,
          })
        }
      } else {
        const jobRes = await createJob({ name })
        const job = jobRes.data?.data || jobRes.data
        const jobId = String(job?.id || '').trim()
        if (!jobId) {
          throw new Error('Failed to create job')
        }

        try {
          await createNetIncome({
            job_id: jobId,
            net_income: netIncome,
            area_net_income: areas,
          })
        } catch (err) {
          await deleteJob(jobId).catch(() => undefined)
          throw err
        }
      }

      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/jobs')
    } catch (err: any) {
      const message = errorMessage(err, 'Failed to save jobs and net income')
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (item: CombinedItem) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Job & Net Income',
      description: 'Are you sure you want to delete this job and net income data?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    try {
      if (item.net_income_id) {
        await deleteNetIncome(item.net_income_id).catch(() => undefined)
      }
      await deleteJob(item.job_id)
      await load()
    } catch (err: any) {
      window.alert(errorMessage(err, 'Failed to delete job'))
    }
  }

  const detailAreaRows = normalizeAreaInput(detailNetIncome?.area_net_income ?? selectedItem?.area_net_income)
  const detailJobName = detailJob?.name || selectedItem?.name || '-'
  const detailNetIncomeValue = Number(detailNetIncome?.net_income ?? selectedItem?.net_income ?? 0)
  const detailCreatedAt = formatDate(detailNetIncome?.created_at || detailJob?.created_at || selectedItem?.created_at)
  const detailUpdatedAt = formatDate(detailNetIncome?.updated_at || detailJob?.updated_at || selectedItem?.updated_at)

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Job & Net Income Details</div>
            <div style={{ color: '#64748b' }}>Combined job and net income configuration</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/jobs/${selectedId}/edit`, { state: { item: selectedItem } })}>
                Edit
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/jobs')}>Back</button>
          </div>
        </div>

        <div className="page">
          {!selectedItem && <div className="alert">Data not found.</div>}
          {selectedItem && (
            <div className="card" style={{ maxWidth: 960 }}>
              <h3 style={{ marginTop: 0 }}>Job & Net Income Information</h3>
              {detailLoading && <div style={{ color: '#64748b', marginBottom: 10 }}>Loading latest relation data...</div>}
              <DetailTable
                rows={[
                  { label: 'Job Name', value: detailJobName },
                  { label: 'Net Income', value: formatRupiah(detailNetIncomeValue) },
                  { label: 'Coverage Area Count', value: detailAreaRows.length },
                  { label: 'Created At', value: detailCreatedAt },
                  { label: 'Updated At', value: detailUpdatedAt },
                ]}
              />

              <h3 style={{ marginTop: 14 }}>Coverage Areas</h3>
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Province</th>
                    <th>Regency / City</th>
                  </tr>
                </thead>
                <tbody>
                  {detailAreaRows.map((area, index) => (
                    <tr key={`${area.province_code}-${area.regency_code}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{area.province_name || '-'}</td>
                      <td>{area.regency_name || '-'}</td>
                    </tr>
                  ))}
                  {detailAreaRows.length === 0 && (
                    <tr>
                      <td colSpan={3}>No coverage areas.</td>
                    </tr>
                  )}
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Job & Net Income' : 'Create Job & Net Income'}</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/jobs')}>Back to Table</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 920 }}>
            {!canCreate && isCreate && <div className="alert">No permission to create data.</div>}
            {!canUpdate && isEdit && <div className="alert">No permission to update data.</div>}

            <div className="grid" style={{ gap: 10 }}>
              <div>
                <label>Job Name</label>
                <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
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
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Coverage Area</div>
                <div className="grid" style={{ gap: 10 }}>
                  <div>
                    <label>Province</label>
                    <select
                      value={form.province_code}
                      onChange={(e) => setForm((prev) => ({ ...prev, province_code: e.target.value, regency_code: '' }))}
                    >
                      <option value="">Select province</option>
                      {provinces.map((province) => (
                        <option key={province.code} value={province.code}>{province.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Regency / City</label>
                    <select
                      value={form.regency_code}
                      onChange={(e) => setForm((prev) => ({ ...prev, regency_code: e.target.value }))}
                      disabled={!form.province_code}
                    >
                      <option value="">Select regency/city</option>
                      {kabupaten.map((item) => (
                        <option key={item.code} value={item.code}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <button className="btn-ghost" type="button" onClick={addArea}>Add Area</button>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  {form.selected_areas.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No area selected.</div>}
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
                          <button className="btn-ghost" type="button" onClick={() => removeArea(idx)}>Remove</button>
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
                <button className="btn-ghost" onClick={() => navigate('/jobs')}>Cancel</button>
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Jobs & Net Income</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/jobs/create')}>Create Job & Net Income</button>}
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job name" />
          </div>

          <h3>Data List</h3>
          {!canList && <div className="alert">No permission to view data.</div>}
          {canList && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Job Name</th>
                    <th>Net Income</th>
                    <th>Area Coverage</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.job_id}>
                      <td>{item.name || '-'}</td>
                      <td>{formatRupiah(Number(item.net_income || 0))}</td>
                      <td>{item.area_net_income.length ? item.area_net_income.map((area) => areaLabel(area)).join(', ') : '-'}</td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn-ghost" onClick={() => navigate(`/jobs/${item.job_id}`, { state: { item } })}>View</button>
                        {canUpdate && (
                          <button className="btn-ghost" onClick={() => navigate(`/jobs/${item.job_id}/edit`, { state: { item } })}>
                            Edit
                          </button>
                        )}
                        {canDelete && <button className="btn-ghost" onClick={() => void remove(item)}>Delete</button>}
                        {!canUpdate && !canDelete && '-'}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5}>No data available.</td>
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

function DetailTable({ rows }: { rows: Array<{ label: string; value: any }> }) {
  return (
    <table className="table" style={{ marginTop: 10 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: '36%', textTransform: 'none', letterSpacing: 'normal' }}>{row.label}</th>
            <td style={{ fontWeight: 600, wordBreak: 'break-word' }}>{row.value ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
