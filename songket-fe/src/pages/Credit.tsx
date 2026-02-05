import { useEffect, useMemo, useState } from 'react'
import { fetchQuadrantSummary, fetchProvinces, fetchKabupaten, fetchKecamatan } from '../api'
import { useAuth } from '../store'

export default function CreditPage() {
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState({ province: '', regency: '', district: '' })
  const [provinces, setProvinces] = useState<any[]>([])
  const [kabupaten, setKabupaten] = useState<any[]>([])
  const [kecamatan, setKecamatan] = useState<any[]>([])
  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_credit')

  const load = () => fetchQuadrantSummary().then((r) => setItems(r.data.data || r.data))
  useEffect(() => {
    if (canList) load()
  }, [canList])

  useEffect(() => {
    fetchProvinces().then((r) => setProvinces(r.data.data || r.data || []))
  }, [])

  useEffect(() => {
    if (filter.province) {
      fetchKabupaten(filter.province).then((r) => setKabupaten(r.data.data || r.data || []))
    } else {
      setKabupaten([])
    }
    setFilter((f) => ({ ...f, regency: '', district: '' }))
    setKecamatan([])
  }, [filter.province])

  useEffect(() => {
    if (filter.regency) {
      fetchKecamatan(filter.province, filter.regency).then((r) => setKecamatan(r.data.data || r.data || []))
    } else {
      setKecamatan([])
    }
    setFilter((f) => ({ ...f, district: '' }))
  }, [filter.regency])

  const nameFrom = (id: string, list: any[]) => list.find((x) => x.code === id)?.name || id

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (filter.province && i.province !== filter.province) return false
        if (filter.regency && i.regency !== filter.regency) return false
        if (filter.district && i.district !== filter.district) return false
        return true
      }),
    [items, filter],
  )

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Credit Capability</div>
          <div style={{ color: '#9ca3af' }}>Score per kabupaten & pekerjaan</div>
        </div>
      </div>
      <div className="page grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div className="card">
          <h3>Daftar</h3>
          {!canList && <div className="alert">Tidak ada izin melihat data.</div>}
          {canList && (
            <table className="table">
              <thead>
                <tr>
                  <th>Provinsi</th>
                  <th>Kab/Kota</th>
                  <th>Kecamatan</th>
                  <th>Kelurahan</th>
                  <th>Total Order</th>
                  <th>Approval Rate</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => (
                  <tr key={idx}>
                    <td>{nameFrom(c.province, provinces)}</td>
                    <td>{nameFrom(c.regency, kabupaten)}</td>
                    <td>{nameFrom(c.district, kecamatan)}</td>
                    <td>{c.village || '-'}</td>
                    <td>{c.total_orders ?? '-'}</td>
                    <td>{c.region_rate ? (c.region_rate * 100).toFixed(1) + '%' : '-'}</td>
                    <td>{c.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>Filter</h3>
          <form className="grid" style={{ gap: 10 }}>
            <div>
              <label>Provinsi</label>
              <select value={filter.province} onChange={(e) => setFilter((f) => ({ ...f, province: e.target.value, regency: '', district: '' }))}>
                <option value="">Pilih</option>
                {provinces.map((p: any) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Kabupaten/Kota</label>
              <select value={filter.regency} onChange={(e) => setFilter((f) => ({ ...f, regency: e.target.value, district: '' }))} disabled={!filter.province}>
                <option value="">Pilih</option>
                {kabupaten.map((k: any) => (
                  <option key={k.code} value={k.code}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Kecamatan</label>
              <select value={filter.district} onChange={(e) => setFilter((f) => ({ ...f, district: e.target.value }))} disabled={!filter.regency}>
                <option value="">Pilih</option>
                {kecamatan.map((k: any) => (
                  <option key={k.code} value={k.code}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setFilter({ province: '', regency: '', district: '' })}
            >
              Reset
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
