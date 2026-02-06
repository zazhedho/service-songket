import { useEffect, useMemo, useState } from 'react'
import { importNews, listNewsItems, scrapeNews } from '../api'
import dayjs from 'dayjs'
import { useAuth } from '../store'

type ScrapedNews = {
  judul: string
  isi: string
  created_at: string
  sumber: string
  url: string
  from_db?: boolean
  category?: string
  source_id?: string
  source_url?: string
  images?: {
    foto_utama?: string
    dalam_berita?: string[]
  }
}

export default function NewsPage() {
  const [category, setCategory] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [scrapedRows, setScrapedRows] = useState<ScrapedNews[]>([])
  const [scraping, setScraping] = useState(false)
  const [adding, setAdding] = useState<Record<string, boolean>>({})
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [detail, setDetail] = useState<ScrapedNews | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [urls, setUrls] = useState<string[]>([''])
  const perms = useAuth((s) => s.permissions)
  const canView = perms.includes('view_news')
  const canScrape = perms.includes('scrape_news')

  const load = () =>
    listNewsItems({ category: category || undefined, limit: 200 }).then((r) => setItems(r.data.data || r.data || []))

  useEffect(() => {
    if (canView) load()
  }, [category, canView])

  const doScrape = async (customUrls?: string[]) => {
    if (!canScrape) return
    setScraping(true)
    try {
      const clean = (customUrls || []).map((u) => u.trim()).filter(Boolean)
      const r = await scrapeNews(clean.length ? { urls: clean } : undefined)
      const data: ScrapedNews[] = r.data.data || r.data || []
      setScrapedRows(data)
      setAdded({})
    } finally {
      setScraping(false)
      setShowModal(false)
      setUrls([''])
    }
  }

  const addToNews = async (row: ScrapedNews) => {
    if (!canScrape || !row?.url) return
    setAdding((prev) => ({ ...prev, [row.url]: true }))
    try {
      await importNews({ items: [row] })
      setAdded((prev) => ({ ...prev, [row.url]: true }))
      await load()
    } catch (e: any) {
      window.alert(e?.response?.data?.error || 'Gagal menambahkan berita')
    } finally {
      setAdding((prev) => ({ ...prev, [row.url]: false }))
    }
  }

  const addRow = () => setUrls((prev) => [...prev, ''])
  const removeRow = (idx: number) => setUrls((prev) => prev.filter((_, i) => i !== idx))
  const startScrape = () => {
    const clean = urls.map((u) => u.trim()).filter(Boolean)
    doScrape(clean.length ? clean : undefined)
  }

  const detailImages = useMemo(() => {
    if (!detail) return []
    const raw = [detail.images?.foto_utama, ...(detail.images?.dalam_berita || [])].filter(Boolean) as string[]
    return Array.from(new Set(raw))
  }, [detail])

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Portal Berita</div>
          <div style={{ color: '#9ca3af' }}>Headline per portal</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Semua</option>
            <option value="agri">Agriculture</option>
            <option value="pariwisata">Pariwisata</option>
            <option value="pns">PNS/Gov</option>
          </select>
          {canScrape && (
            <button className="btn" onClick={() => setShowModal(true)} disabled={scraping}>
              {scraping ? 'Scraping...' : 'Scrape Sekarang'}
            </button>
          )}
        </div>
      </div>

      {!canView && <div className="page"><div className="alert">Tidak ada izin melihat berita.</div></div>}
      {canView && (
        <div className="page">
          <div className="card">
            <h3>Daftar Berita (Data DB)</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Isi</th>
                  <th>Created At</th>
                  <th>Sumber</th>
                  <th>Link</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const detailRow = toDetailRow(item)
                  return (
                    <tr key={item.id || item.url}>
                      <td style={{ maxWidth: 320 }}>{item.title || '-'}</td>
                      <td style={{ maxWidth: 360, wordBreak: 'break-word' }}>{shortText(item.content || '', 180)}</td>
                      <td>{(item.published_at || item.created_at) ? dayjs(item.published_at || item.created_at).format('DD MMM YYYY HH:mm') : '-'}</td>
                      <td>{item.source_name || item.source?.name || detailRow.sumber || '-'}</td>
                      <td>
                        <a className="btn-ghost" href={item.url} target="_blank" rel="noreferrer">
                          Buka Link
                        </a>
                      </td>
                      <td>
                        <button className="btn-ghost" onClick={() => setDetail(detailRow)}>View Detail</button>
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6}>Belum ada berita tersimpan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canScrape && scrapedRows.length > 0 && (
        <div className="page">
          <div className="card">
            <h3>Hasil Scrape (Preview)</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Isi</th>
                  <th>Created At</th>
                  <th>Sumber</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {scrapedRows.map((r) => (
                  <tr key={r.url}>
                    <td style={{ maxWidth: 320 }}>{r.judul}</td>
                    <td style={{ maxWidth: 360, wordBreak: 'break-word' }}>{shortText(r.isi, 180)}</td>
                    <td>{r.created_at ? dayjs(r.created_at).format('DD MMM YYYY HH:mm') : '-'}</td>
                    <td>{r.sumber || '-'}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-ghost" onClick={() => setDetail(r)}>View Detail</button>
                      <button
                        className="btn"
                        onClick={() => addToNews(r)}
                        disabled={!!adding[r.url] || !!added[r.url]}
                      >
                        {added[r.url] ? 'Added' : adding[r.url] ? 'Adding...' : 'Add to News'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && canScrape && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Scrape Portal Berita</h3>
            <div className="muted">Masukkan 1 atau lebih URL portal berita, tambahkan baris jika perlu.</div>
            <div className="grid" style={{ gap: 10, marginTop: 10 }}>
              {urls.map((u, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={u}
                    placeholder="https://"
                    onChange={(e) => {
                      const next = [...urls]
                      next[idx] = e.target.value
                      setUrls(next)
                    }}
                    style={{ flex: 1 }}
                  />
                  {urls.length > 1 && (
                    <button className="btn-ghost" onClick={() => removeRow(idx)}>Hapus</button>
                  )}
                </div>
              ))}
              <button className="btn-ghost" onClick={addRow}>+ Tambah baris</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn" onClick={startScrape} disabled={scraping}>{scraping ? 'Memulai...' : 'Proses'}</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 860, width: '100%' }}>
            <h3>{detail.judul}</h3>
            <div className="muted" style={{ marginBottom: 8 }}>
              {detail.created_at ? dayjs(detail.created_at).format('DD MMM YYYY HH:mm') : '-'} | {detail.sumber || '-'}
            </div>
            <div style={{ marginBottom: 12 }}>
              <a href={detail.url} target="_blank" rel="noreferrer">{detail.url}</a>
            </div>

            {detailImages.length > 0 && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginBottom: 12 }}>
                {detailImages.map((img) => (
                  <a key={img} href={img} target="_blank" rel="noreferrer">
                    <img
                      src={img}
                      alt={detail.judul}
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </a>
                ))}
              </div>
            )}

            <div
              style={{
                maxHeight: '45vh',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.45,
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: 12,
              }}
            >
              {detail.isi || '-'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setDetail(null)}>Tutup</button>
              {canScrape && !detail.from_db && (
                <button
                  className="btn"
                  onClick={() => addToNews(detail)}
                  disabled={!!adding[detail.url] || !!added[detail.url]}
                >
                  {added[detail.url] ? 'Added' : adding[detail.url] ? 'Adding...' : 'Add to News'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function shortText(val: string, max: number): string {
  const s = (val || '').replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max)}...`
}

function toDetailRow(item: any): ScrapedNews {
  return {
    judul: item?.title || '',
    isi: item?.content || '',
    created_at: item?.published_at || item?.created_at || '',
    sumber: item?.source_name || item?.source?.name || '',
    url: item?.url || '',
    source_id: item?.source_id || '',
    category: item?.category || '',
    images: parseImages(item?.images),
    from_db: true,
  }
}

function parseImages(raw: any): { foto_utama?: string; dalam_berita?: string[] } {
  let data = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      data = {}
    }
  }
  const main = typeof data?.foto_utama === 'string' ? data.foto_utama : ''
  const list = Array.isArray(data?.dalam_berita) ? data.dalam_berita.filter((x: any) => typeof x === 'string') : []
  return { foto_utama: main, dalam_berita: list }
}
