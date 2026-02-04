import { useEffect, useState } from 'react'
import { fetchOrders, fetchPrices, fetchNews } from '../api'
import dayjs from 'dayjs'

export default function DashboardPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [news, setNews] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchOrders({ limit: 5 }).then((res) => setOrders(res.data.data || res.data))
    fetchPrices().then((res) => setPrices(res.data.data || res.data))
    fetchNews().then((res) => setNews(res.data.data || res.data))
  }, [])

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 14, color: '#9ca3af' }}>Halo, selamat datang</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Ringkasan Songket</div>
        </div>
      </div>
      <div className="page">
        <div className="hero card">
          <div>
            <div className="big">Monitor order, harga pangan, dan berita NTB dalam satu layar.</div>
            <div className="muted">Tampilan cepat untuk dealer, main dealer, dan superadmin.</div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <Stat label="Order terbaru" value={`${orders.length}`} />
            <Stat label="Komoditas update" value={`${prices.length}`} />
            <Stat label="Portal berita" value={`${Object.keys(news).length}`} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '2fr 1.2fr', gap: 16 }}>
          <div className="card">
            <h3>5 Order Terakhir</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Pooling</th>
                  <th>Konsumen</th>
                  <th>Status</th>
                  <th>Tenor</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.pooling_number}</td>
                    <td>{o.consumer_name}</td>
                    <td><StatusBadge status={o.result_status} /></td>
                    <td>{o.tenor} bln</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Harga Pangan Terbaru</h3>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {prices.map((p) => (
                <div key={p.id}>
                  <div style={{ fontWeight: 600 }}>{p.commodity?.name || 'Komoditas'}</div>
                  <div style={{ color: '#9ca3af' }}>{p.price?.toLocaleString('id-ID')} / {p.commodity?.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Headline NTB</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))' }}>
            {Object.entries(news).map(([source, item]) => (
              <div key={source} style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div style={{ fontWeight: 600 }}>{source}</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>{dayjs(item.published_at).format('DD MMM, HH:mm')}</div>
                <div style={{ marginTop: 6 }}>{item.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 12 }}>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = `badge ${status || ''}`
  return <span className={cls}>{status}</span>
}
