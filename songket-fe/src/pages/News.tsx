import { useEffect, useState } from 'react'
import { fetchNews } from '../api'
import dayjs from 'dayjs'

export default function NewsPage() {
  const [category, setCategory] = useState('')
  const [items, setItems] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchNews(category || undefined).then((r) => setItems(r.data.data || r.data))
  }, [category])

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Portal Berita NTB</div>
          <div style={{ color: '#9ca3af' }}>Headline per portal</div>
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">Semua</option>
          <option value="agri">Agriculture</option>
          <option value="pariwisata">Pariwisata</option>
          <option value="pns">PNS/Gov</option>
        </select>
      </div>
      <div className="page grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))' }}>
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
  )
}
