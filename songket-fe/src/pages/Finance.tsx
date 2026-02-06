import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  createDealer,
  createFinanceCompany,
  deleteDealer,
  deleteFinanceCompany,
  fetchDealers,
  fetchDealerMetrics,
  fetchKabupaten,
  fetchKecamatan,
  fetchLookups,
  fetchProvinces,
  updateDealer,
  updateFinanceCompany,
} from '../api'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useAuth } from '../store'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type Option = { code: string; name: string }

type DealerForm = {
  name: string
  province: string
  regency: string
  district: string
  village: string
  phone: string
  address: string
  lat: string
  lng: string
}

type FinanceForm = {
  name: string
  province: string
  regency: string
  district: string
  village: string
  phone: string
  address: string
}

const initialDealerForm: DealerForm = {
  name: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  phone: '',
  address: '',
  lat: '',
  lng: '',
}

const initialFinanceForm: FinanceForm = {
  name: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  phone: '',
  address: '',
}

export default function FinancePage() {
  const perms = useAuth((s) => s.permissions)
  const canView = perms.includes('list_finance_dealers')
  const canManage = canView

  const [dealers, setDealers] = useState<any[]>([])
  const [financeCompanies, setFinanceCompanies] = useState<any[]>([])
  const [selected, setSelected] = useState<string>('')
  const [metrics, setMetrics] = useState<any>(null)
  const [fcFilter, setFcFilter] = useState('')

  const [provinces, setProvinces] = useState<Option[]>([])
  const [dealerKabupaten, setDealerKabupaten] = useState<Option[]>([])
  const [dealerKecamatan, setDealerKecamatan] = useState<Option[]>([])
  const [financeKabupaten, setFinanceKabupaten] = useState<Option[]>([])
  const [financeKecamatan, setFinanceKecamatan] = useState<Option[]>([])

  const [dealerForm, setDealerForm] = useState<DealerForm>(initialDealerForm)
  const [dealerEditId, setDealerEditId] = useState('')
  const [savingDealer, setSavingDealer] = useState(false)

  const [financeForm, setFinanceForm] = useState<FinanceForm>(initialFinanceForm)
  const [financeEditId, setFinanceEditId] = useState('')
  const [savingFinance, setSavingFinance] = useState(false)

  const [notice, setNotice] = useState('')

  const loadBaseData = async () => {
    const [dealerRes, lookupRes] = await Promise.all([fetchDealers(), fetchLookups()])
    const dealerData = dealerRes.data.data || dealerRes.data || []
    const fcData = lookupRes.data.data?.finance_companies || lookupRes.data?.finance_companies || []
    setDealers(dealerData)
    setFinanceCompanies(fcData)
    if (!selected && dealerData.length > 0) setSelected(dealerData[0].id)
  }

  useEffect(() => {
    if (!canView) return
    Promise.all([fetchProvinces(), loadBaseData()])
      .then(([provRes]) => setProvinces(provRes.data.data || provRes.data || []))
      .catch(() => window.alert('Gagal memuat data finance'))
  }, [canView])

  useEffect(() => {
    if (!selected) {
      setMetrics(null)
      return
    }
    fetchDealerMetrics(selected, fcFilter ? { finance_company_id: fcFilter } : undefined)
      .then((r) => setMetrics(r.data.data || r.data))
      .catch(() => setMetrics(null))
  }, [selected, fcFilter])

  useEffect(() => {
    if (dealers.length === 0) {
      setSelected('')
      return
    }
    if (!selected || !dealers.some((d) => d.id === selected)) {
      setSelected(dealers[0].id)
    }
  }, [dealers, selected])

  const dealerPoints = useMemo(() => {
    return dealers
      .map((d) => ({ ...d, _lat: Number(d.lat ?? d.latitude), _lng: Number(d.lng ?? d.longitude) }))
      .filter((d) => Number.isFinite(d._lat) && Number.isFinite(d._lng))
  }, [dealers])

  const selectedDealer = dealers.find((d) => d.id === selected)
  const selectedLat = Number(selectedDealer?.lat ?? selectedDealer?.latitude)
  const selectedLng = Number(selectedDealer?.lng ?? selectedDealer?.longitude)
  const center: [number, number] =
    Number.isFinite(selectedLat) && Number.isFinite(selectedLng)
      ? [selectedLat, selectedLng]
      : dealerPoints.length > 0
        ? [dealerPoints[0]._lat, dealerPoints[0]._lng]
        : [-8.58, 116.12]

  const resetDealerForm = () => {
    setDealerEditId('')
    setDealerForm(initialDealerForm)
    setDealerKabupaten([])
    setDealerKecamatan([])
  }

  const resetFinanceForm = () => {
    setFinanceEditId('')
    setFinanceForm(initialFinanceForm)
    setFinanceKabupaten([])
    setFinanceKecamatan([])
  }

  const handleDealerProvince = async (code: string) => {
    setDealerForm((s) => ({ ...s, province: code, regency: '', district: '' }))
    setDealerKecamatan([])
    if (!code) {
      setDealerKabupaten([])
      return
    }
    try {
      const res = await fetchKabupaten(code)
      setDealerKabupaten(res.data.data || res.data || [])
    } catch {
      setDealerKabupaten([])
    }
  }

  const handleDealerRegency = async (code: string) => {
    setDealerForm((s) => ({ ...s, regency: code, district: '' }))
    if (!dealerForm.province || !code) {
      setDealerKecamatan([])
      return
    }
    try {
      const res = await fetchKecamatan(dealerForm.province, code)
      setDealerKecamatan(res.data.data || res.data || [])
    } catch {
      setDealerKecamatan([])
    }
  }

  const handleFinanceProvince = async (code: string) => {
    setFinanceForm((s) => ({ ...s, province: code, regency: '', district: '' }))
    setFinanceKecamatan([])
    if (!code) {
      setFinanceKabupaten([])
      return
    }
    try {
      const res = await fetchKabupaten(code)
      setFinanceKabupaten(res.data.data || res.data || [])
    } catch {
      setFinanceKabupaten([])
    }
  }

  const handleFinanceRegency = async (code: string) => {
    setFinanceForm((s) => ({ ...s, regency: code, district: '' }))
    if (!financeForm.province || !code) {
      setFinanceKecamatan([])
      return
    }
    try {
      const res = await fetchKecamatan(financeForm.province, code)
      setFinanceKecamatan(res.data.data || res.data || [])
    } catch {
      setFinanceKecamatan([])
    }
  }

  const startEditDealer = async (d: any) => {
    const next: DealerForm = {
      name: d.name || '',
      province: d.province || '',
      regency: d.regency || '',
      district: d.district || '',
      village: d.village || '',
      phone: d.phone || '',
      address: d.address || '',
      lat: String(d.lat ?? d.latitude ?? ''),
      lng: String(d.lng ?? d.longitude ?? ''),
    }
    setDealerEditId(d.id)
    setDealerForm(next)
    setSelected(d.id)

    if (next.province) {
      try {
        const kab = await fetchKabupaten(next.province)
        const kabData = kab.data.data || kab.data || []
        setDealerKabupaten(kabData)
        if (next.regency) {
          const kec = await fetchKecamatan(next.province, next.regency)
          setDealerKecamatan(kec.data.data || kec.data || [])
        } else {
          setDealerKecamatan([])
        }
      } catch {
        setDealerKabupaten([])
        setDealerKecamatan([])
      }
    } else {
      setDealerKabupaten([])
      setDealerKecamatan([])
    }
  }

  const startEditFinance = async (f: any) => {
    const next: FinanceForm = {
      name: f.name || '',
      province: f.province || '',
      regency: f.regency || '',
      district: f.district || '',
      village: f.village || '',
      phone: f.phone || '',
      address: f.address || '',
    }
    setFinanceEditId(f.id)
    setFinanceForm(next)

    if (next.province) {
      try {
        const kab = await fetchKabupaten(next.province)
        const kabData = kab.data.data || kab.data || []
        setFinanceKabupaten(kabData)
        if (next.regency) {
          const kec = await fetchKecamatan(next.province, next.regency)
          setFinanceKecamatan(kec.data.data || kec.data || [])
        } else {
          setFinanceKecamatan([])
        }
      } catch {
        setFinanceKabupaten([])
        setFinanceKecamatan([])
      }
    } else {
      setFinanceKabupaten([])
      setFinanceKecamatan([])
    }
  }

  const submitDealer = async (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    const lat = Number(dealerForm.lat)
    const lng = Number(dealerForm.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      window.alert('Latitude/Longitude tidak valid')
      return
    }

    const payload = {
      name: dealerForm.name.trim(),
      province: dealerForm.province.trim(),
      regency: dealerForm.regency.trim(),
      district: dealerForm.district.trim(),
      village: dealerForm.village.trim(),
      phone: dealerForm.phone.trim(),
      address: dealerForm.address.trim(),
      lat,
      lng,
    }

    setSavingDealer(true)
    try {
      const res = dealerEditId ? await updateDealer(dealerEditId, payload) : await createDealer(payload)
      const saved = res.data.data || res.data
      await loadBaseData()
      setSelected(saved?.id || selected)
      setNotice(dealerEditId ? 'Dealer berhasil diperbarui' : 'Dealer berhasil ditambahkan')
      resetDealerForm()
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menyimpan dealer')
    } finally {
      setSavingDealer(false)
    }
  }

  const submitFinance = async (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return

    const payload = {
      name: financeForm.name.trim(),
      province: financeForm.province.trim(),
      regency: financeForm.regency.trim(),
      district: financeForm.district.trim(),
      village: financeForm.village.trim(),
      phone: financeForm.phone.trim(),
      address: financeForm.address.trim(),
    }

    setSavingFinance(true)
    try {
      if (financeEditId) await updateFinanceCompany(financeEditId, payload)
      else await createFinanceCompany(payload)
      await loadBaseData()
      setNotice(financeEditId ? 'Finance company berhasil diperbarui' : 'Finance company berhasil ditambahkan')
      resetFinanceForm()
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menyimpan finance company')
    } finally {
      setSavingFinance(false)
    }
  }

  const removeDealer = async (id: string) => {
    if (!canManage) return
    if (!window.confirm('Hapus dealer ini?')) return
    try {
      await deleteDealer(id)
      await loadBaseData()
      setNotice('Dealer berhasil dihapus')
      if (selected === id) setSelected('')
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menghapus dealer')
    }
  }

  const removeFinance = async (id: string) => {
    if (!canManage) return
    if (!window.confirm('Hapus finance company ini?')) return
    try {
      await deleteFinanceCompany(id)
      await loadBaseData()
      setNotice('Finance company berhasil dihapus')
      if (fcFilter === id) setFcFilter('')
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menghapus finance company')
    }
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Peta & Finance</div>
          <div style={{ color: '#9ca3af' }}>Kelola dealer, finance company, dan pantau performa</div>
        </div>
      </div>

      {!canView && <div className="page"><div className="alert">Tidak ada izin melihat finance.</div></div>}

      {canView && (
        <div className="page" style={{ display: 'grid', gap: 16 }}>
          {notice && (
            <div
              className="card"
              style={{
                border: '1px solid rgba(34,197,94,0.35)',
                background: 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(15,23,42,0.6))',
                color: '#bbf7d0',
              }}
            >
              {notice}
            </div>
          )}

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
            <div className="card" style={{ background: 'linear-gradient(160deg, rgba(14,116,144,0.22), rgba(15,23,42,0.9))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Kelola Dealer</h3>
                <span style={{ fontSize: 12, color: '#67e8f9' }}>{dealerEditId ? 'Mode Edit' : 'Tambah Baru'}</span>
              </div>

              <form onSubmit={submitDealer} className="grid" style={{ gap: 10 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label>Nama Dealer</label>
                    <input value={dealerForm.name} onChange={(e) => setDealerForm((s) => ({ ...s, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label>No Telepon</label>
                    <input value={dealerForm.phone} onChange={(e) => setDealerForm((s) => ({ ...s, phone: e.target.value }))} required />
                  </div>
                  <div>
                    <label>Provinsi</label>
                    <select value={dealerForm.province} onChange={(e) => void handleDealerProvince(e.target.value)} required>
                      <option value="">Pilih</option>
                      {provinces.map((p) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Kab/Kota</label>
                    <select
                      value={dealerForm.regency}
                      onChange={(e) => void handleDealerRegency(e.target.value)}
                      disabled={!dealerForm.province}
                      required
                    >
                      <option value="">Pilih</option>
                      {dealerKabupaten.map((k) => (
                        <option key={k.code} value={k.code}>{k.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Kecamatan</label>
                    <select
                      value={dealerForm.district}
                      onChange={(e) => setDealerForm((s) => ({ ...s, district: e.target.value }))}
                      disabled={!dealerForm.regency}
                      required
                    >
                      <option value="">Pilih</option>
                      {dealerKecamatan.map((k) => (
                        <option key={k.code} value={k.code}>{k.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Kelurahan (free text)</label>
                    <input value={dealerForm.village} onChange={(e) => setDealerForm((s) => ({ ...s, village: e.target.value }))} />
                  </div>
                  <div>
                    <label>Latitude</label>
                    <input type="number" step="any" value={dealerForm.lat} onChange={(e) => setDealerForm((s) => ({ ...s, lat: e.target.value }))} required />
                  </div>
                  <div>
                    <label>Longitude</label>
                    <input type="number" step="any" value={dealerForm.lng} onChange={(e) => setDealerForm((s) => ({ ...s, lng: e.target.value }))} required />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Alamat</label>
                    <input value={dealerForm.address} onChange={(e) => setDealerForm((s) => ({ ...s, address: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-ghost" onClick={resetDealerForm}>Reset</button>
                  <button type="submit" className="btn" disabled={savingDealer}>
                    {savingDealer ? 'Menyimpan...' : dealerEditId ? 'Update Dealer' : 'Tambah Dealer'}
                  </button>
                </div>
              </form>

              <div style={{ marginTop: 14, display: 'grid', gap: 8, maxHeight: 290, overflowY: 'auto' }}>
                {dealers.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: selected === d.id ? '1px solid rgba(56,189,248,0.7)' : '1px solid rgba(255,255,255,0.08)',
                      background: selected === d.id ? 'rgba(14,116,144,0.25)' : 'rgba(15,23,42,0.45)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <button className="btn-ghost" style={{ flex: 1, textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => setSelected(d.id)}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{d.name}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{d.regency} • {d.phone || '-'}</div>
                      </div>
                    </button>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" onClick={() => void startEditDealer(d)}>Edit</button>
                        <button className="btn-ghost" onClick={() => void removeDealer(d.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: 'linear-gradient(160deg, rgba(79,70,229,0.18), rgba(15,23,42,0.9))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Kelola Finance Company</h3>
                <span style={{ fontSize: 12, color: '#c4b5fd' }}>{financeEditId ? 'Mode Edit' : 'Tambah Baru'}</span>
              </div>

              <form onSubmit={submitFinance} className="grid" style={{ gap: 10 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label>Nama Finance Company</label>
                    <input value={financeForm.name} onChange={(e) => setFinanceForm((s) => ({ ...s, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label>No Telepon</label>
                    <input value={financeForm.phone} onChange={(e) => setFinanceForm((s) => ({ ...s, phone: e.target.value }))} required />
                  </div>
                  <div>
                    <label>Provinsi</label>
                    <select value={financeForm.province} onChange={(e) => void handleFinanceProvince(e.target.value)} required>
                      <option value="">Pilih</option>
                      {provinces.map((p) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Kab/Kota</label>
                    <select
                      value={financeForm.regency}
                      onChange={(e) => void handleFinanceRegency(e.target.value)}
                      disabled={!financeForm.province}
                      required
                    >
                      <option value="">Pilih</option>
                      {financeKabupaten.map((k) => (
                        <option key={k.code} value={k.code}>{k.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Kecamatan</label>
                    <select
                      value={financeForm.district}
                      onChange={(e) => setFinanceForm((s) => ({ ...s, district: e.target.value }))}
                      disabled={!financeForm.regency}
                      required
                    >
                      <option value="">Pilih</option>
                      {financeKecamatan.map((k) => (
                        <option key={k.code} value={k.code}>{k.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Kelurahan (free text)</label>
                    <input value={financeForm.village} onChange={(e) => setFinanceForm((s) => ({ ...s, village: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Alamat</label>
                    <input value={financeForm.address} onChange={(e) => setFinanceForm((s) => ({ ...s, address: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-ghost" onClick={resetFinanceForm}>Reset</button>
                  <button type="submit" className="btn" disabled={savingFinance}>
                    {savingFinance ? 'Menyimpan...' : financeEditId ? 'Update Finance' : 'Tambah Finance'}
                  </button>
                </div>
              </form>

              <div style={{ marginTop: 14, display: 'grid', gap: 8, maxHeight: 290, overflowY: 'auto' }}>
                {financeCompanies.map((f: any) => (
                  <div
                    key={f.id}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(15,23,42,0.45)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{f.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{f.regency || '-'} • {f.phone || '-'}</div>
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" onClick={() => void startEditFinance(f)}>Edit</button>
                        <button className="btn-ghost" onClick={() => void removeFinance(f.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
            <div className="card" style={{ minHeight: 430 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Peta Dealer</h3>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>{dealerPoints.length} titik dealer</div>
              </div>
              <div style={{ marginTop: 10 }}>
                <MapContainer center={center as any} zoom={8} style={{ height: 360, borderRadius: 12 }} scrollWheelZoom={false}>
                  <MapFly center={center as any} />
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  {dealerPoints.map((d) => (
                    <Marker key={d.id} position={[d._lat, d._lng]} icon={markerIcon} eventHandlers={{ click: () => setSelected(d.id) }}>
                      <Popup>
                        <strong>{d.name}</strong>
                        <div>{d.regency}</div>
                        <div>{d.phone || '-'}</div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Detail Performa</h3>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>{selectedDealer?.name || 'Pilih dealer'}</div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Filter Finance Company</label>
                <select value={fcFilter} onChange={(e) => setFcFilter(e.target.value)}>
                  <option value="">Semua</option>
                  {financeCompanies.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {!metrics && <div style={{ marginTop: 12, color: '#94a3b8' }}>Pilih dealer untuk melihat metrik.</div>}

              {metrics && (
                <>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
                    <Metric label="Total Order" value={metrics.total_orders} />
                    <Metric label="Approval Rate" value={`${((metrics.approval_rate || 0) * 100).toFixed(1)}%`} />
                    <Metric label="Lead Time Avg (s)" value={metrics.lead_time_seconds_avg ? metrics.lead_time_seconds_avg.toFixed(1) : '-'} />
                    <Metric label="Rescue FC2" value={metrics.rescue_approved_fc2} />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ margin: '0 0 6px 0' }}>Per Finance Company</h4>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Finance</th>
                          <th>Total</th>
                          <th>Approve</th>
                          <th>Lead Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.finance_companies?.map((fc: any) => (
                          <tr key={fc.finance_company_id}>
                            <td>{fc.finance_company_name}</td>
                            <td>{fc.total_orders}</td>
                            <td>{((fc.approval_rate || 0) * 100).toFixed(1)}%</td>
                            <td>{fc.lead_time_seconds_avg ? fc.lead_time_seconds_avg.toFixed(1) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
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
    if (center?.length === 2) map.flyTo(center, map.getZoom(), { duration: 0.5 })
  }, [center, map])
  return null
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,41,59,0.65))',
        padding: 12,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ color: '#9ca3af', fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 19 }}>{value}</div>
    </div>
  )
}
