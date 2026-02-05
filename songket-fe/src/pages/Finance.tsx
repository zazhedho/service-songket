import { useEffect, useState } from 'react'
import { fetchDealers, fetchDealerMetrics, fetchLookups } from '../api'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useAuth } from '../store'

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
  const [financeCompanies, setFinanceCompanies] = useState<any[]>([])
  const perms = useAuth((s) => s.permissions)
  const canView = perms.includes('list_finance_dealers')

  useEffect(() => {
    if (canView) {
      fetchDealers().then((r) => setDealers(r.data.data || r.data))
      fetchLookups().then((r) => setFinanceCompanies(r.data.data?.finance_companies || r.data?.finance_companies || []))
    }
  }, [canView])

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
      {!canView && <div className="page"><div className="alert">Tidak ada izin melihat finance.</div></div>}
      {canView && (
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
              <MapFly center={center as any} />
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
              <>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))' }}>
                  <Metric label="Total Order" value={metrics.total_orders} />
                  <Metric label="Lead Time Avg (s)" value={metrics.lead_time_seconds_avg ? metrics.lead_time_seconds_avg.toFixed(1) : '-'} />
                  <Metric label="Approval Rate" value={(metrics.approval_rate * 100).toFixed(1) + '%'} />
                  <Metric label="Reject FC1 -> Approve FC2" value={metrics.rescue_approved_fc2} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ marginBottom: 6 }}>Per Finance Company</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Finance Company</th>
                        <th>Total Order</th>
                        <th>Lead Time Avg (s)</th>
                        <th>Approval Rate</th>
                        <th>Rescue (FC2)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.finance_companies?.map((fc: any) => (
                        <tr key={fc.finance_company_id}>
                          <td>{fc.finance_company_name}</td>
                          <td>{fc.total_orders}</td>
                          <td>{fc.lead_time_seconds_avg ? fc.lead_time_seconds_avg.toFixed(1) : '-'}</td>
                          <td>{(fc.approval_rate * 100).toFixed(1)}%</td>
                          <td>{fc.rescue_approved_fc2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <label>Filter Finance Company</label>
              <select value={fcFilter} onChange={(e) => setFcFilter(e.target.value)}>
                <option value="">Semua</option>
                {financeCompanies.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

function MapFly({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center?.length === 2) {
      map.flyTo(center, map.getZoom(), { duration: 0.5 })
    }
  }, [center, map])
  return null
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 12 }}>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 20 }}>{value}</div>
    </div>
  )
}
