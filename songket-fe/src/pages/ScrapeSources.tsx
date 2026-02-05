import { useEffect, useState } from 'react'
import {
  fetchPriceList,
  scrapePrices,
  listScrapeSources,
  createScrapeSource,
  updateScrapeSource,
  deleteScrapeSource,
} from '../api'
import { useAuth } from '../store'

const empty = { name: '', url: '', category: '', is_active: true }

export default function ScrapeSourcesPage() {
  const [sources, setSources] = useState<any[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string>('')
  const [customUrls, setCustomUrls] = useState('')
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_scrape_sources')
  const canCreate = perms.includes('create_scrape_source')
  const canUpdate = perms.includes('update_scrape_source')
  const canDelete = perms.includes('delete_scrape_source')
  const canScrape = perms.includes('scrape_prices')

  const load = () => listScrapeSources().then((r) => setSources(r.data.data || r.data))
  const loadPrices = () => fetchPriceList({ limit: 10 }).then((r) => setPrices(r.data.data || r.data))

  useEffect(() => {
    if (canList) load()
    if (canScrape) loadPrices()
  }, [canList, canScrape])

  const save = async () => {
    if (!canCreate && !canUpdate) return
    setLoading(true)
    setMessage(null)
    if (editing) await updateScrapeSource(editing, form)
    else await createScrapeSource(form)
    setForm(empty)
    setEditing('')
    load()
    setLoading(false)
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    if (!confirm('Hapus URL ini?')) return
    await deleteScrapeSource(id)
    load()
  }

  const runScrape = async () => {
    if (!canScrape) return
    setLoading(true)
    setMessage(null)
    const urls = customUrls
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    try {
      await scrapePrices(urls.length ? { urls } : {})
      setMessage({ text: 'Scrape berhasil dijalankan', ok: true })
      loadPrices()
    } catch (e: any) {
      setMessage({ text: e?.response?.data?.error || 'Scrape gagal', ok: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Scrape URLs</div>
          <div style={{ color: '#9ca3af' }}>Kelola sumber scraping & jalankan manual</div>
        </div>
      </div>
      <div className="page grid lg:grid-cols-[1.2fr_1fr]">
        <div className="card">
          <h3>Daftar Sumber</h3>
          {!canList && <div className="alert">Tidak ada izin melihat sumber scrape.</div>}
          {canList && (
            <table className="table">
              <thead>
                <tr><th>Nama</th><th>URL</th><th>Aktif</th><th>Action</th></tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td style={{ maxWidth: 260, wordBreak: 'break-word' }}>{s.url}</td>
                    <td>{s.is_active ? 'Ya' : 'Tidak'}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      {canUpdate && <button className="btn-ghost" onClick={() => { setEditing(s.id); setForm({ name: s.name, url: s.url, category: s.category, is_active: s.is_active }) }}>Edit</button>}
                      {canDelete && <button className="btn-ghost" onClick={() => remove(s.id)}>Delete</button>}
                      {!canUpdate && !canDelete && '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>{editing ? 'Edit URL' : 'Tambah URL'}</h3>
          {!canCreate && !canUpdate && <div className="alert">Tidak ada izin tambah/ubah sumber.</div>}
          <div className="grid" style={{ gap: 10 }}>
            <div><label>Nama</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div><label>URL</label><input value={form.url} onChange={(e) => set('url', e.target.value)} /></div>
            <div><label>Kategori</label><input value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
            <div>
              <label>Aktif</label>
              <select value={form.is_active ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={save} disabled={loading || (!canCreate && !canUpdate)}>{editing ? 'Update' : 'Simpan'}</button>
              {editing && <button className="btn-ghost" onClick={() => { setEditing(''); setForm(empty) }}>Batal</button>}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <h4>Scrape Manual</h4>
            <label>URL list (pisah koma, opsional, jika kosong pakai default aktif)</label>
            <input value={customUrls} onChange={(e) => setCustomUrls(e.target.value)} placeholder="https://..." />
            <button className="btn" style={{ marginTop: 8 }} onClick={runScrape} disabled={loading || !canScrape}>{loading ? 'Scraping...' : 'Scrape Sekarang'}</button>
            {message && !loading && (
              <div
                style={{
                  color: message.ok ? '#22c55e' : '#f87171',
                  marginTop: 8,
                  fontSize: 13,
                }}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>
      {canScrape && (
        <div className="page">
          <div className="card">
            <h3>Harga Terbaru (preview)</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))' }}>
              {prices.map((p) => (
                <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 10 }}>
                  <div style={{ fontWeight: 700 }}>{p.commodity?.name || 'Komoditas'}</div>
                  <div style={{ color: '#9ca3af' }}>{p.price?.toLocaleString('id-ID')} / {p.commodity?.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
