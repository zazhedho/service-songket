import { useEffect, useState } from 'react'
import { fetchDealers, fetchDealerMetrics } from '../api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

export default function FinancePage() {
  const [dealers, setDealers] = useState<any[]>([])
  const [selected, setSelected] = useState<string>('')
  const [metrics, setMetrics] = useState<any>(null)
  const [fcFilter, setFcFilter] = useState('')

  useEffect(() => {
    fetchDealers().then((r) => setDealers(r.data.data || r.data))
  }, [])

  useEffect(() => {
    if (selected) fetchDealerMetrics(selected, fcFilter ? { finance_company_id: fcFilter } : undefined).then((r) => setMetrics(r.data.data || r.data))
  }, [selected, fcFilter])

  const selectedDealer = dealers.find((d) => d.id === selected)
  const center = selectedDealer ? [selectedDealer.lat || selectedDealer.latitude, selectedDealer.lng || selectedDealer.longitude] : [-8.58, 116.12]

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Finance Performance</div>
          <div style={{ color: '#9ca3af' }}>Klik dealer di peta atau daftar</div>
        </div>
      </div>
      <div className="page grid lg:grid-cols-[1fr_1.3fr]" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Dealer</h3>
          <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 10 }}>
            {dealers.map((d) => (
              <button key={d.id} className="btn-ghost" onClick={() => setSelected(d.id)} style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div style={{ color: '#9ca3af', fontSize: 13 }}>{d.regency}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="grid" style={{ gap: 12 }}>
          <div className="card" style={{ height: 360 }}>
            <h3>Peta Dealer</h3>
            <MapContainer center={center as any} zoom={8} style={{ height: 300, borderRadius: 12 }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              {dealers.map((d) => (
                <Marker key={d.id} position={[d.lat || d.latitude, d.lng || d.longitude]} icon={markerIcon} eventHandlers={{ click: () => setSelected(d.id) }}>
                  <Popup>
                    <strong>{d.name}</strong>
                    <div>{d.regency}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="card">
            <h3>Detail</h3>
            {!metrics && <div>Pilih dealer untuk melihat metrik</div>}
            {metrics && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))' }}>
                <Metric label="Total Order" value={metrics.total_orders} />
                <Metric label="Lead Time Avg (s)" value={metrics.lead_time_seconds_avg?.toFixed?.(1) || '-'} />
                <Metric label="Approval Rate" value={(metrics.approval_rate * 100).toFixed(1) + '%'} />
                <Metric label="Reject FC1 -> Approve FC2" value={metrics.rescue_approved_fc2} />
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <label>Filter Finance Company ID</label>
              <input value={fcFilter} onChange={(e) => setFcFilter(e.target.value)} placeholder="opsional" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 12 }}>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 20 }}>{value}</div>
    </div>
  )
}
