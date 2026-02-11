import { useEffect, useMemo, useState } from 'react'
import { fetchOrders, fetchPriceList, listNewsItems } from '../api'
import dayjs from 'dayjs'
import { formatRupiah } from '../utils/currency'

export default function DashboardPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [news, setNews] = useState<any[]>([])
  const [activeNewsIndex, setActiveNewsIndex] = useState(0)

  useEffect(() => {
    fetchOrders({ limit: 5 }).then((res) => setOrders(res.data.data || res.data))
    fetchPriceList({ limit: 5 }).then((res) => setPrices(res.data.data || res.data))
    listNewsItems({ limit: 5 }).then((res) => setNews((res.data.data || res.data || []).slice(0, 5)))
  }, [])

  useEffect(() => {
    if (activeNewsIndex >= news.length && news.length > 0) {
      setActiveNewsIndex(0)
      return
    }
    if (news.length <= 1) {
      setActiveNewsIndex(0)
      return
    }
    const timer = window.setInterval(() => {
      setActiveNewsIndex((prev) => (prev + 1) % news.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [news, activeNewsIndex])

  const activeNews = news[activeNewsIndex] || null
  const sideNews = useMemo(() => {
    if (!news.length) return []
    return news.filter((_, idx) => idx !== activeNewsIndex).slice(0, 4)
  }, [news, activeNewsIndex])

  return (
    <div>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/songket-logo.jpeg"
            alt="SONGKET Logo"
            style={{ width: 54, height: 54, borderRadius: 12, objectFit: 'cover', border: '1px solid #d6deec' }}
          />
          <div>
            <div style={{ fontSize: 14, color: '#9ca3af' }}>Welcome back</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>SONGKET Dashboard</div>
          </div>
        </div>
      </div>
      <div className="page">
        <div className="hero card">
          <div>
            <div className="big">Order In Monitoring</div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <Stat label="Latest Orders" value={`${orders.length}`} />
            <Stat label="Commodity Updates" value={`${prices.length}`} />
            <Stat label="News" value={`${news.length}`} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '2fr 1.2fr', gap: 16 }}>
          <div className="card">
            <h3>Latest Order In</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Pooling</th>
                  <th>Consumer</th>
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
                    <td>{o.tenor} months</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Latest Prices</h3>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {prices.map((p) => (
                <div key={p.id}>
                  <div style={{ fontWeight: 600 }}>{p.commodity?.name || 'Commodity'}</div>
                  <div style={{ color: '#9ca3af' }}>{formatRupiah(p.price || 0)} / {p.commodity?.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3>NTB Market Update</h3>
          {activeNews && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
              <a
                href={activeNews.url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
                style={{
                  position: 'relative',
                  minHeight: 340,
                  padding: 0,
                  overflow: 'hidden',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundImage: heroBackground(activeNews),
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  alignItems: 'stretch',
                }}
              >
                <div style={{ marginTop: 'auto', width: '100%', padding: 16, textAlign: 'left' }}>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                    {activeNews.source_name || activeNews.source?.name || '-'} • {dayjs(activeNews.published_at || activeNews.created_at).format('DD MMM YYYY HH:mm')}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25, marginTop: 6 }}>{activeNews.title}</div>
                  <div style={{ fontSize: 13, color: '#d1d5db', marginTop: 8 }}>{shortText(activeNews.content || '', 180)}</div>
                </div>
              </a>

              <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 10 }}>
                {sideNews.map((item) => {
                  const realIdx = news.findIndex((n) => n.id === item.id)
                  return (
                    <button
                      key={item.id || item.url}
                      className="btn-ghost"
                      onClick={() => setActiveNewsIndex(realIdx < 0 ? 0 : realIdx)}
                      style={{
                        padding: 0,
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr',
                        gap: 10,
                        alignItems: 'stretch',
                        overflow: 'hidden',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(15,23,42,0.35)',
                      }}
                    >
                      <div
                        style={{
                          minHeight: 84,
                          backgroundImage: thumbBackground(item),
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div style={{ padding: 10, textAlign: 'left' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {dayjs(item.published_at || item.created_at).format('DD MMM HH:mm')}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25, marginTop: 4 }}>
                          {shortText(item.title || '-', 88)}
                        </div>
                        <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>
                          {item.source_name || item.source?.name || '-'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {!activeNews && (
            <div style={{ color: '#94a3b8', fontSize: 14 }}>No saved news yet.</div>
          )}
          {news.length > 1 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center' }}>
              {news.map((item, idx) => (
                <button
                  key={item.id || item.url || idx}
                  onClick={() => setActiveNewsIndex(idx)}
                  style={{
                    width: 22,
                    height: 6,
                    border: 0,
                    borderRadius: 20,
                    cursor: 'pointer',
                    background: idx === activeNewsIndex ? '#22d3ee' : 'rgba(148,163,184,0.35)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function firstNewsImage(item: any): string {
  const parsed = parseNewsImages(item?.images)
  if (parsed?.foto_utama) return parsed.foto_utama
  if (parsed?.dalam_berita?.length) return parsed.dalam_berita[0]
  return ''
}

function parseNewsImages(raw: any): { foto_utama?: string; dalam_berita?: string[] } {
  if (!raw) return {}
  let data = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  const fotoUtama = typeof data?.foto_utama === 'string' ? data.foto_utama : ''
  const dalamBerita = Array.isArray(data?.dalam_berita)
    ? data.dalam_berita.filter((v: any) => typeof v === 'string' && v.trim() !== '')
    : []
  return { foto_utama: fotoUtama, dalam_berita: dalamBerita }
}

function shortText(value: string, max: number): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

function heroBackground(item: any): string {
  const img = firstNewsImage(item)
  if (!img) {
    return 'linear-gradient(120deg, rgba(14,116,144,0.5), rgba(30,41,59,0.9))'
  }
  return `linear-gradient(to top, rgba(2,6,23,0.92), rgba(2,6,23,0.25)), url("${img}")`
}

function thumbBackground(item: any): string {
  const img = firstNewsImage(item)
  if (!img) return 'linear-gradient(120deg, rgba(15,23,42,0.9), rgba(30,41,59,0.8))'
  return `url("${img}")`
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

//deploy