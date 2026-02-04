import { useEffect, useState } from 'react'
import { fetchPrices, scrapePrices } from '../api'

export default function PricesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = () => fetchPrices().then((r) => setItems(r.data.data || r.data))

  useEffect(() => {
    load()
  }, [])

  const scrape = async () => {
    setLoading(true)
    try {
      await scrapePrices()
      load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Harga Pangan</div>
          <div style={{ color: '#9ca3af' }}>Scrape otomatis dari panel harga</div>
        </div>
        <button className="btn" onClick={scrape} disabled={loading}>
          {loading ? 'Scraping...' : 'Scrape Sekarang'}
        </button>
      </div>
      <div className="page grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))' }}>
        {items.map((p) => (
          <div key={p.id} className="card">
            <div style={{ fontWeight: 700 }}>{p.commodity?.name || 'Komoditas'}</div>
            <div style={{ color: '#9ca3af' }}>{p.price?.toLocaleString('id-ID')} / {p.commodity?.unit}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(p.collected_at).toLocaleString('id-ID')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
