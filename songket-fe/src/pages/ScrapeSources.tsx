import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createScrapeSource,
  deleteScrapeSource,
  fetchPriceList,
  listScrapeSources,
  scrapePrices,
  updateScrapeSource,
} from '../api'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'

const empty = { name: '', url: '', category: '', type: 'prices', is_active: true }

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/scrape-sources\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function ScrapeSourcesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const [sources, setSources] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [form, setForm] = useState(empty)
  const [customUrls, setCustomUrls] = useState('')
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_scrape_sources')
  const canCreate = perms.includes('create_scrape_source')
  const canUpdate = perms.includes('update_scrape_source')
  const canDelete = perms.includes('delete_scrape_source')
  const canScrape = perms.includes('scrape_prices')

  const stateSource = (location.state as any)?.source || null

  const load = async () => {
    const res = await listScrapeSources({ page, limit, search: search || undefined, filters: { type: typeFilter || undefined } })
    setSources(res.data.data || res.data || [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || page)
  }

  const loadPrices = async () => {
    const res = await fetchPriceList({ limit: 10 })
    setPrices(res.data.data || res.data || [])
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setSources([]))
    }
    if (canScrape) {
      loadPrices().catch(() => setPrices([]))
    }
  }, [canList, canScrape, isDetail, isEdit, limit, page, search, typeFilter])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [typeFilter])

  const selectedSource = useMemo(() => {
    if (!selectedId) return null
    return sources.find((source) => source.id === selectedId) || (stateSource?.id === selectedId ? stateSource : null)
  }, [selectedId, sources, stateSource])

  useEffect(() => {
    if (isCreate) {
      setForm(empty)
      return
    }

    if (isEdit && selectedSource) {
      setForm({
        name: selectedSource.name || '',
        url: selectedSource.url || '',
        category: selectedSource.category || '',
        type: selectedSource.type || 'prices',
        is_active: Boolean(selectedSource.is_active),
      })
    }
  }, [isCreate, isEdit, selectedSource])

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setMessage(null)
    try {
      if (isEdit && selectedId) await updateScrapeSource(selectedId, form)
      else await createScrapeSource(form)
      setForm(empty)
      navigate('/scrape-sources')
    } catch (err: any) {
      const text = err?.response?.data?.error || 'Gagal menyimpan sumber'
      setMessage({ text, ok: false })
      window.alert(text)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    if (!window.confirm('Hapus URL ini?')) return
    await deleteScrapeSource(id)
    await load()
  }

  const runScrape = async () => {
    if (!canScrape) return

    setLoading(true)
    setMessage(null)

    const urls = customUrls
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)

    try {
      await scrapePrices(urls.length ? { urls } : {})
      setMessage({ text: 'Scrape berhasil dijalankan', ok: true })
      await loadPrices()
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.error || 'Scrape gagal', ok: false })
    } finally {
      setLoading(false)
    }
  }

  const set = (key: keyof typeof empty, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Scrape Source</div>
            <div style={{ color: '#64748b' }}>Lihat konfigurasi URL scraping</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/scrape-sources/${selectedId}/edit`, { state: { source: selectedSource } })}>
                Edit Source
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedSource && <div className="alert">Data source tidak ditemukan.</div>}
          {selectedSource && (
            <div className="card" style={{ maxWidth: 820 }}>
              <DetailRow label="Nama" value={selectedSource.name} />
              <DetailRow label="URL" value={selectedSource.url} />
              <DetailRow label="Type" value={selectedSource.type || '-'} />
              <DetailRow label="Kategori" value={selectedSource.category || '-'} />
              <DetailRow label="Aktif" value={selectedSource.is_active ? 'Ya' : 'Tidak'} />
              <DetailRow label="Source ID" value={selectedSource.id} />
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Scrape Source' : 'Input Scrape Source Baru'}</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 860 }}>
            {!canCreate && isCreate && <div className="alert">Tidak ada izin tambah sumber.</div>}
            {!canUpdate && isEdit && <div className="alert">Tidak ada izin ubah sumber.</div>}

            <div className="grid" style={{ gap: 10 }}>
              <div><label>Nama</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div><label>URL</label><input value={form.url} onChange={(e) => set('url', e.target.value)} /></div>
              <div>
                <label>Type</label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="prices">Harga Pangan</option>
                  <option value="news">Portal Berita</option>
                </select>
              </div>
              <div><label>Kategori</label><input value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
              <div>
                <label>Aktif</label>
                <select value={form.is_active ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>

              {message && !message.ok && <div style={{ color: '#b91c1c', fontSize: 13 }}>{message.text}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => void save()} disabled={loading || (!canCreate && !canUpdate)}>
                  {loading ? 'Saving...' : isEdit ? 'Update Source' : 'Simpan Source'}
                </button>
                <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Batal</button>
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Scrape URLs</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCreate && <button className="btn" onClick={() => navigate('/scrape-sources/create')}>Input Source</button>}
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search Source</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama/url/kategori" />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Filter Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Semua</option>
              <option value="prices">Harga Pangan</option>
              <option value="news">Portal Berita</option>
            </select>
          </div>

          <h3>Daftar Sumber</h3>
          {!canList && <div className="alert">Tidak ada izin melihat sumber scrape.</div>}
          {canList && (
            <>
              <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>URL</th>
                  <th>Type</th>
                  <th>Aktif</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td>{source.name}</td>
                    <td style={{ maxWidth: 300, wordBreak: 'break-word' }}>{source.url}</td>
                    <td>{source.type || '-'}</td>
                    <td>{source.is_active ? 'Ya' : 'Tidak'}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-ghost" onClick={() => navigate(`/scrape-sources/${source.id}`, { state: { source } })}>View</button>
                      {canUpdate && (
                        <button className="btn-ghost" onClick={() => navigate(`/scrape-sources/${source.id}/edit`, { state: { source } })}>
                          Edit
                        </button>
                      )}
                      {canDelete && <button className="btn-ghost" onClick={() => void remove(source.id)}>Delete</button>}
                      {!canUpdate && !canDelete && '-'}
                    </td>
                  </tr>
                ))}
                {sources.length === 0 && (
                  <tr>
                    <td colSpan={5}>Belum ada source.</td>
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

        {canScrape && (
          <div className="card">
            <h3>Scrape Manual</h3>
            <label>URL list (pisah koma, jika kosong pakai default aktif)</label>
            <input value={customUrls} onChange={(e) => setCustomUrls(e.target.value)} placeholder="https://..." />
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => void runScrape()} disabled={loading || !canScrape}>
                {loading ? 'Scraping...' : 'Scrape Sekarang'}
              </button>
            </div>
            {message && (
              <div style={{ color: message.ok ? '#166534' : '#b91c1c', marginTop: 8, fontSize: 13 }}>
                {message.text}
              </div>
            )}
          </div>
        )}

        {canScrape && (
          <div className="card">
            <h3>Harga Terbaru (Preview)</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 10 }}>
              {prices.map((price) => (
                <div key={price.id} style={{ background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #dde4ee' }}>
                  <div style={{ fontWeight: 700 }}>{price.commodity?.name || 'Komoditas'}</div>
                  <div style={{ color: '#64748b' }}>
                    {price.price?.toLocaleString('id-ID')} / {price.commodity?.unit}
                  </div>
                </div>
              ))}
              {prices.length === 0 && <div className="muted">Belum ada preview harga.</div>}
            </div>
          </div>
        )}
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
