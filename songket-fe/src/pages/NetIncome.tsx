import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createNetIncome, deleteNetIncome, getNetIncome, listJobs, listNetIncome, updateNetIncome } from '../api'
import { useAuth } from '../store'

type JobItem = {
  id: string
  name: string
}

type NetIncomeItem = {
  id: string
  job_id: string
  job_name?: string
  net_income: number
  area_net_income: string[]
  created_at?: string
  updated_at?: string
}

const emptyForm = { job_id: '', net_income: '0', area_input: '' }

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/net-income\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function parseAreas(value: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  value
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((area) => {
      const key = area.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        out.push(area)
      }
    })
  return out
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
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

  const [items, setItems] = useState<NetIncomeItem[]>([])
  const [jobs, setJobs] = useState<JobItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<NetIncomeItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stateItem = (location.state as any)?.item || null

  const load = async () => {
    const [netRes, jobRes] = await Promise.all([
      listNetIncome().catch(() => ({ data: { data: [] } } as any)),
      listJobs().catch(() => ({ data: { data: [] } } as any)),
    ])

    const netData = netRes.data?.data || netRes.data || []
    const jobData = jobRes.data?.data || jobRes.data || []
    setItems(Array.isArray(netData) ? netData : [])
    setJobs(Array.isArray(jobData) ? jobData : [])
  }

  useEffect(() => {
    load().catch(() => {
      setItems([])
      setJobs([])
    })
  }, [])

  useEffect(() => {
    if ((canList || isEdit || isDetail) && items.length === 0) {
      load().catch(() => {
        setItems([])
        setJobs([])
      })
    }
  }, [canList, isEdit, isDetail, items.length])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null) || fetchedItem
  }, [items, selectedId, stateItem, fetchedItem])

  useEffect(() => {
    if (!selectedId || selectedItem) return
    getNetIncome(selectedId)
      .then((res) => {
        const data = res.data?.data || res.data
        setFetchedItem(data || null)
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
        net_income: String(selectedItem.net_income ?? 0),
        area_input: (selectedItem.area_net_income || []).join(', '),
      })
    }
  }, [isCreate, isEdit, selectedItem])

  useEffect(() => {
    if (isCreate && jobs.length && !form.job_id) {
      setForm((prev) => ({ ...prev, job_id: jobs[0].id }))
    }
  }, [isCreate, jobs, form.job_id])

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    const netIncome = Number(form.net_income)
    const areas = parseAreas(form.area_input)

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
      const body = { job_id: form.job_id, net_income: netIncome, area_net_income: areas }
      if (isEdit && selectedId) await updateNetIncome(selectedId, body)
      else await createNetIncome(body)
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/net-income')
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Gagal menyimpan net income'
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    if (!window.confirm('Hapus data net income ini?')) return
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Net Income</div>
            <div style={{ color: '#64748b' }}>Ringkasan net income per pekerjaan dan area</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/net-income/${selectedId}/edit`, { state: { item: selectedItem } })}>
                Edit
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/net-income')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedItem && <div className="alert">Data net income tidak ditemukan.</div>}
          {selectedItem && (
            <div className="card" style={{ maxWidth: 820 }}>
              <DetailRow label="Pekerjaan" value={jobName(selectedItem.job_id, selectedItem.job_name)} />
              <DetailRow label="Net Income" value={formatCurrency(Number(selectedItem.net_income || 0))} />
              <DetailRow label="Area Net Income" value={(selectedItem.area_net_income || []).join(', ') || '-'} />
              <DetailRow label="Created At" value={formatDate(selectedItem.created_at)} />
              <DetailRow label="Updated At" value={formatDate(selectedItem.updated_at)} />
              <DetailRow label="ID" value={selectedItem.id} />
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
            <div style={{ color: '#64748b' }}>Form dipisah dari tabel</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/net-income')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 860 }}>
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
                  type="number"
                  min={0}
                  step="1"
                  value={form.net_income}
                  onChange={(e) => setForm((prev) => ({ ...prev, net_income: e.target.value }))}
                />
              </div>

              <div>
                <label>Area Net Income</label>
                <textarea
                  value={form.area_input}
                  onChange={(e) => setForm((prev) => ({ ...prev, area_input: e.target.value }))}
                  rows={4}
                  placeholder="Pisahkan area dengan koma atau baris baru. Contoh: Lombok Barat, Mataram"
                />
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                  Area terdeteksi: {parseAreas(form.area_input).length}
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
          <div style={{ color: '#64748b' }}>Daftar net income dengan halaman create, edit, dan detail terpisah</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/net-income/create')}>Input Net Income</button>}
      </div>

      <div className="page">
        <div className="card">
          <h3>Daftar Net Income</h3>
          {!canList && <div className="alert">Tidak ada izin melihat data net income.</div>}
          {canList && (
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
                    <td>{formatCurrency(Number(item.net_income || 0))}</td>
                    <td>{(item.area_net_income || []).join(', ') || '-'}</td>
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
