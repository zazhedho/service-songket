import { useEffect, useState } from 'react'
import { fetchNews, listNewsSources, scrapeNews } from '../api'
import dayjs from 'dayjs'
import { useAuth } from '../store'

export default function NewsPage() {
  const [category, setCategory] = useState('')
  const [items, setItems] = useState<Record<string, any>>({})
  const [sources, setSources] = useState<any[]>([])
  const [scraping, setScraping] = useState(false)
  const perms = useAuth((s) => s.permissions)
  const canView = perms.includes('view_news')
  const canScrape = perms.includes('scrape_news')

  const load = () => fetchNews(category || undefined).then((r) => setItems(r.data.data || r.data))

  useEffect(() => {
    if (canView) load()
  }, [category, canView])

  useEffect(() => {
    if (canScrape) listNewsSources().then((r) => setSources(r.data.data || r.data || []))
  }, [canScrape])

  const doScrape = async () => {
    if (!canScrape) return
    setScraping(true)
    await scrapeNews()
    await load()
    setScraping(false)
  }

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
            <button className="btn" onClick={doScrape} disabled={scraping}>
              {scraping ? 'Scraping...' : 'Scrape Sekarang'}
            </button>
          )}
        </div>
      </div>

      {!canView && <div className="page"><div className="alert">Tidak ada izin melihat berita.</div></div>}
      {canView && (
        <div className="page">
          <h3>Latest per Sumber</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))' }}>
            {Object.entries(items).map(([source, item]) => (
              <div key={source} className="card">
                <div style={{ fontWeight: 700 }}>{source}</div>
                <div style={{ color: '#9ca3af', fontSize: 13 }}>{dayjs(item.published_at).format('DD MMM, HH:mm')}</div>
                <div style={{ marginTop: 8 }}>{item.title}</div>
                <a className="btn-ghost" style={{ marginTop: 10, display: 'inline-flex' }} href={item.url} target="_blank" rel="noreferrer">
                  Buka Link
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {canScrape && (
        <div className="page">
          <div className="card">
            <h3>Sumber Berita</h3>
            <table className="table">
              <thead>
                <tr><th>Nama</th><th>URL</th><th>Kategori</th><th>Action</th></tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td style={{ maxWidth: 240, wordBreak: 'break-word' }}>{s.url}</td>
                    <td>{s.category || '-'}</td>
                    <td><button className="btn-ghost" onClick={doScrape} disabled={scraping}>Scrape</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
