import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createJob, deleteJob, getJob, listJobs, updateJob } from '../api'
import { useAuth } from '../store'

type JobItem = {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

const emptyForm = { name: '' }

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/jobs\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}

export default function JobsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_jobs')
  const canCreate = perms.includes('create_jobs')
  const canUpdate = perms.includes('update_jobs')
  const canDelete = perms.includes('delete_jobs')

  const [items, setItems] = useState<JobItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<JobItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stateItem = (location.state as any)?.job || null

  const load = async () => {
    const res = await listJobs()
    setItems(res.data.data || res.data || [])
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setItems([]))
    }
  }, [canList, isEdit, isDetail])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null) || fetchedItem
  }, [items, selectedId, stateItem, fetchedItem])

  useEffect(() => {
    if (!selectedId || selectedItem) return
    getJob(selectedId)
      .then((res) => {
        const data = res.data?.data || res.data
        setFetchedItem(data || null)
      })
      .catch(() => setFetchedItem(null))
  }, [selectedId, selectedItem])

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm)
      return
    }

    if (isEdit && selectedItem) {
      setForm({ name: selectedItem.name || '' })
    }
  }, [isCreate, isEdit, selectedItem])

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    const name = form.name.trim()
    if (!name) {
      setError('Nama pekerjaan wajib diisi')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (isEdit && selectedId) await updateJob(selectedId, { name })
      else await createJob({ name })
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/jobs')
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Gagal menyimpan pekerjaan'
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    if (!window.confirm('Hapus pekerjaan ini?')) return
    await deleteJob(id)
    await load()
  }

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Nama Pekerjaan</div>
            <div style={{ color: '#64748b' }}>Informasi data pekerjaan</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/jobs/${selectedId}/edit`, { state: { job: selectedItem } })}>
                Edit
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/jobs')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedItem && <div className="alert">Data pekerjaan tidak ditemukan.</div>}
          {selectedItem && (
            <div className="card" style={{ maxWidth: 760 }}>
              <DetailRow label="Nama Pekerjaan" value={selectedItem.name || '-'} />
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Nama Pekerjaan' : 'Input Nama Pekerjaan'}</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/jobs')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 760 }}>
            {!canCreate && isCreate && <div className="alert">Tidak ada izin membuat data.</div>}
            {!canUpdate && isEdit && <div className="alert">Tidak ada izin mengubah data.</div>}

            <div className="grid" style={{ gap: 10 }}>
              <div>
                <label>Nama Pekerjaan</label>
                <input value={form.name} onChange={(e) => setForm({ name: e.target.value })} placeholder="Contoh: Karyawan" />
              </div>

              {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => void save()} disabled={loading}>
                  {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                </button>
                <button className="btn-ghost" onClick={() => navigate('/jobs')}>Batal</button>
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Nama Pekerjaan</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/jobs/create')}>Input Nama Pekerjaan</button>}
      </div>

      <div className="page">
        <div className="card">
          <h3>Daftar Pekerjaan</h3>
          {!canList && <div className="alert">Tidak ada izin melihat data pekerjaan.</div>}
          {canList && (
            <table className="table">
              <thead>
                <tr>
                  <th>Nama Pekerjaan</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name || '-'}</td>
                    <td>{formatDate(item.updated_at)}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-ghost" onClick={() => navigate(`/jobs/${item.id}`, { state: { job: item } })}>View</button>
                      {canUpdate && (
                        <button className="btn-ghost" onClick={() => navigate(`/jobs/${item.id}/edit`, { state: { job: item } })}>
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
                    <td colSpan={3}>Belum ada data pekerjaan.</td>
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
