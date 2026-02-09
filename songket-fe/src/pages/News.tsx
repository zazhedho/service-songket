import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { importNews, listNewsItems, listScrapeSources, scrapeNews } from '../api'
import Pagination from '../components/Pagination'
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

function parseMode(pathname: string) {
  if (pathname.endsWith('/scrape')) return 'scrape'
  if (/\/news\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function NewsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isScrape = mode === 'scrape'
  const isDetail = mode === 'detail'

  const [category, setCategory] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const [scrapedRows, setScrapedRows] = useState<ScrapedNews[]>([])
  const [scrapedPage, setScrapedPage] = useState(1)
  const [scrapedLimit, setScrapedLimit] = useState(20)
  const [scraping, setScraping] = useState(false)
  const [adding, setAdding] = useState<Record<string, boolean>>({})
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [urls, setUrls] = useState<string[]>([''])
  const [sourceOptions, setSourceOptions] = useState<{ url: string; name: string }[]>([])

  const perms = useAuth((s) => s.permissions)
  const canView = perms.includes('view_news')
  const canScrape = perms.includes('scrape_news')

  const stateDetail = (location.state as any)?.detail || null

  const load = () =>
    listNewsItems({ category: category || undefined, page, limit }).then((res) => {
      setItems(res.data.data || res.data || [])
      setTotalPages(res.data.total_pages || 1)
      setTotalData(res.data.total_data || 0)
      setPage(res.data.current_page || page)
    })

  useEffect(() => {
    if (canView) {
      load().catch(() => setItems([]))
    }
  }, [category, canView, limit, page])

  useEffect(() => {
    if (!canScrape) return
    listScrapeSources({ page: 1, limit: 500, filters: { type: 'news', category: category || undefined } })
      .then((res) => {
        const data = res.data.data || res.data || []
        const mapped = Array.isArray(data)
          ? data
              .map((item: any) => ({ url: String(item.url || '').trim(), name: String(item.name || '').trim() }))
              .filter((item) => item.url)
          : []
        setSourceOptions(mapped)
      })
      .catch(() => setSourceOptions([]))
  }, [canScrape, category])

  useEffect(() => {
    setPage(1)
  }, [category])

  const doScrape = async (customUrls?: string[]) => {
    if (!canScrape) return
    setScraping(true)
    try {
      const clean = (customUrls || []).map((url) => url.trim()).filter(Boolean)
      const res = await scrapeNews(clean.length ? { urls: clean } : undefined)
      const data: ScrapedNews[] = res.data.data || res.data || []
      setScrapedRows(data)
      setAdded({})
    } finally {
      setScraping(false)
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
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menambahkan berita')
    } finally {
      setAdding((prev) => ({ ...prev, [row.url]: false }))
    }
  }

  const startScrape = () => {
    const clean = urls.map((url) => url.trim()).filter(Boolean)
    doScrape(clean.length ? clean : undefined)
  }

  const pagedScrapedRows = useMemo(() => {
    const from = (scrapedPage - 1) * scrapedLimit
    const to = from + scrapedLimit
    return scrapedRows.slice(from, to)
  }, [scrapedLimit, scrapedPage, scrapedRows])

  const scrapedTotalPages = useMemo(() => {
    if (!scrapedRows.length) return 1
    return Math.ceil(scrapedRows.length / scrapedLimit)
  }, [scrapedLimit, scrapedRows.length])

  useEffect(() => {
    if (scrapedPage > scrapedTotalPages) {
      setScrapedPage(1)
    }
  }, [scrapedPage, scrapedTotalPages])

  const selectedDetail = useMemo(() => {
    if (stateDetail) return stateDetail as ScrapedNews
    if (!selectedId) return null

    const fromDb = items.find((item) => String(item.id) === selectedId)
    if (fromDb) return toDetailRow(fromDb)

    return null
  }, [items, selectedId, stateDetail])

  const detailImages = useMemo(() => {
    if (!selectedDetail) return []
    const raw = [selectedDetail.images?.foto_utama, ...(selectedDetail.images?.dalam_berita || [])].filter(Boolean) as string[]
    return Array.from(new Set(raw))
  }, [selectedDetail])

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Berita</div>
            <div style={{ color: '#64748b' }}>Informasi berita lengkap</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/news')}>Kembali</button>
        </div>

        <div className="page">
          {!selectedDetail && <div className="alert">Detail berita tidak ditemukan.</div>}
          {selectedDetail && (
            <div className="card" style={{ maxWidth: 980 }}>
              <h3>{selectedDetail.judul || '-'}</h3>
              <div style={{ color: '#64748b', marginTop: 6 }}>
                {selectedDetail.created_at ? dayjs(selectedDetail.created_at).format('DD MMM YYYY HH:mm') : '-'} | {selectedDetail.sumber || '-'}
              </div>

              <div style={{ marginTop: 10 }}>
                <a href={selectedDetail.url} target="_blank" rel="noreferrer">{selectedDetail.url}</a>
              </div>

              {detailImages.length > 0 && (
                <div
                  className="grid"
                  style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginTop: 12, marginBottom: 12 }}
                >
                  {detailImages.map((img) => (
                    <a key={img} href={img} target="_blank" rel="noreferrer">
                      <img
                        src={img}
                        alt={selectedDetail.judul}
                        style={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid #dbe3ef',
                        }}
                      />
                    </a>
                  ))}
                </div>
              )}

              <div
                style={{
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.45,
                  border: '1px solid #dbe3ef',
                  borderRadius: 10,
                  padding: 12,
                  background: '#f8fafc',
                }}
              >
                {selectedDetail.isi || '-'}
              </div>

              {canScrape && !selectedDetail.from_db && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    className="btn"
                    onClick={() => void addToNews(selectedDetail)}
                    disabled={!!adding[selectedDetail.url] || !!added[selectedDetail.url]}
                  >
                    {added[selectedDetail.url] ? 'Added' : adding[selectedDetail.url] ? 'Adding...' : 'Add to News'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isScrape) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Scrape Portal Berita</div>
            <div style={{ color: '#64748b' }}>Halaman input URL scraping terpisah</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/news')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          {!canScrape && <div className="alert">Tidak ada izin scrape berita.</div>}

          {canScrape && (
            <div className="card">
              <div className="muted">Masukkan 1 atau lebih URL portal berita, tambahkan baris jika perlu.</div>
              {sourceOptions.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                  Source terdaftar: {sourceOptions.map((item) => `${item.name || 'source'} (${item.url})`).join(', ')}
                </div>
              )}
              <div className="grid" style={{ gap: 10, marginTop: 10 }}>
                {urls.map((url, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={url}
                      placeholder="https://"
                      onChange={(e) => {
                        const next = [...urls]
                        next[idx] = e.target.value
                        setUrls(next)
                      }}
                      style={{ flex: 1 }}
                    />
                    {urls.length > 1 && (
                      <button className="btn-ghost" onClick={() => setUrls((prev) => prev.filter((_, i) => i !== idx))}>Hapus</button>
                    )}
                  </div>
                ))}
                <button className="btn-ghost" onClick={() => setUrls((prev) => [...prev, ''])}>+ Tambah baris</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button className="btn" onClick={() => void startScrape()} disabled={scraping}>
                  {scraping ? 'Memproses...' : 'Proses Scrape'}
                </button>
              </div>
            </div>
          )}

          {canScrape && scrapedRows.length > 0 && (
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
                  {pagedScrapedRows.map((row) => (
                    <tr key={row.url}>
                      <td style={{ maxWidth: 320 }}>{row.judul}</td>
                      <td style={{ maxWidth: 360, wordBreak: 'break-word' }}>{shortText(row.isi, 180)}</td>
                      <td>{row.created_at ? dayjs(row.created_at).format('DD MMM YYYY HH:mm') : '-'}</td>
                      <td>{row.sumber || '-'}</td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-ghost" onClick={() => navigate(`/news/${encodeURIComponent(row.url)}`, { state: { detail: row } })}>
                          View
                        </button>
                        <button className="btn" onClick={() => void addToNews(row)} disabled={!!adding[row.url] || !!added[row.url]}>
                          {added[row.url] ? 'Added' : adding[row.url] ? 'Adding...' : 'Add to News'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Pagination
                page={scrapedPage}
                totalPages={scrapedTotalPages}
                totalData={scrapedRows.length}
                limit={scrapedLimit}
                onPageChange={setScrapedPage}
                onLimitChange={(next) => {
                  setScrapedLimit(next)
                  setScrapedPage(1)
                }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Portal Berita</div>
          <div style={{ color: '#64748b' }}>Default halaman menampilkan tabel berita dari database</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">Semua</option>
            <option value="agri">Agriculture</option>
            <option value="pariwisata">Pariwisata</option>
            <option value="pns">PNS/Gov</option>
          </select>
          {canScrape && <button className="btn" onClick={() => navigate('/news/scrape')}>Scrape Berita</button>}
        </div>
      </div>

      {!canView && <div className="page"><div className="alert">Tidak ada izin melihat berita.</div></div>}

      {canView && (
        <div className="page">
          <div className="card">
            <h3>Daftar Berita</h3>
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
                      <td>
                        {(item.published_at || item.created_at)
                          ? dayjs(item.published_at || item.created_at).format('DD MMM YYYY HH:mm')
                          : '-'}
                      </td>
                      <td>{item.source_name || item.source?.name || detailRow.sumber || '-'}</td>
                      <td>
                        <a className="btn-ghost" href={item.url} target="_blank" rel="noreferrer">Buka Link</a>
                      </td>
                      <td>
                        <button className="btn-ghost" onClick={() => navigate(`/news/${item.id}`, { state: { detail: detailRow } })}>
                          View Detail
                        </button>
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
          </div>
        </div>
      )}
    </div>
  )
}

function shortText(value: string, max: number): string {
  const cleaned = (value || '').replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max)}...`
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
