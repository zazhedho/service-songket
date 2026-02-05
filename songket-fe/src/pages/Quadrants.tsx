import { useEffect, useMemo, useState } from 'react'
import { fetchQuadrantSummary, fetchProvinces, fetchKabupaten, fetchKecamatan } from '../api'

export default function QuadrantsPage() {
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState({ province: '', regency: '', district: '' })
  const [provinces, setProvinces] = useState<any[]>([])
  const [kabMap, setKabMap] = useState<Record<string, any[]>>({})
  const [kecMap, setKecMap] = useState<Record<string, any[]>>({})

  const load = () => fetchQuadrantSummary().then((r) => setItems(r.data.data || r.data))
  useEffect(() => {
    load()
    fetchProvinces().then((r) => setProvinces(r.data.data || r.data || []))
  }, [])

  useEffect(() => {
    if (filter.province && !kabMap[filter.province]) {
      fetchKabupaten(filter.province).then((r) =>
        setKabMap((m) => ({ ...m, [filter.province]: r.data.data || r.data || [] })),
      )
    }
    // reset deeper filters
    setFilter((f) => ({ ...f, regency: '', district: '' }))
  }, [filter.province])

  useEffect(() => {
    if (filter.regency && filter.province) {
      const key = `${filter.province}-${filter.regency}`
      if (!kecMap[key]) {
        fetchKecamatan(filter.province, filter.regency).then((r) =>
          setKecMap((m) => ({ ...m, [key]: r.data.data || r.data || [] })),
        )
      }
    }
    setFilter((f) => ({ ...f, district: '' }))
  }, [filter.regency])

  const provinceOpts = useMemo(() => provinces.map((p) => ({ code: p.code, name: p.name })), [provinces])
  const regencyOpts = useMemo(() => {
    if (!filter.province) return []
    const list = kabMap[filter.province] || []
    return list.map((k: any) => ({ code: k.code, name: k.name }))
  }, [kabMap, filter.province])
  const districtOpts = useMemo(() => {
    if (!filter.province || !filter.regency) return []
    const key = `${filter.province}-${filter.regency}`
    const list = kecMap[key] || []
    return list.map((k: any) => ({ code: k.code, name: k.name }))
  }, [kecMap, filter.province, filter.regency])

  const nameFrom = (code: string, list: any[]) => list.find((x) => x.code === code)?.name || code

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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Kuadran Area x Pekerjaan</div>
          <div style={{ color: '#9ca3af' }}>Score wilayah berdasar performa order</div>
        </div>
      </div>
      <div className="page grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        <div className="card">
          <h3>Daftar Wilayah</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Provinsi</th>
                <th>Kab/Kota</th>
                <th>Kecamatan</th>
                <th>Kelurahan</th>
                <th>Total Order</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr key={idx}>
                  <td>{nameFrom(r.province, provinceOpts)}</td>
                  <td>{nameFrom(r.regency, regencyOpts)}</td>
                  <td>{nameFrom(r.district, districtOpts)}</td>
                  <td>{r.village || '-'}</td>
                  <td>{r.total_orders ?? '-'}</td>
                  <td>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Filter Wilayah</h3>
          <div className="grid" style={{ gap: 10 }}>
            <div>
              <label>Provinsi</label>
              <select value={filter.province} onChange={(e) => setFilter((f) => ({ ...f, province: e.target.value, regency: '', district: '' }))}>
                <option value="">Semua</option>
                {provinceOpts.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Kabupaten/Kota</label>
              <select
                value={filter.regency}
                onChange={(e) => setFilter((f) => ({ ...f, regency: e.target.value, district: '' }))}
                disabled={!filter.province}
              >
                <option value="">Semua</option>
                {regencyOpts.map((r) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Kecamatan</label>
              <select value={filter.district} onChange={(e) => setFilter((f) => ({ ...f, district: e.target.value }))} disabled={!filter.regency}>
                <option value="">Semua</option>
                {districtOpts.map((d) => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
            </div>
            <button className="btn-ghost" type="button" onClick={() => setFilter({ province: '', regency: '', district: '' })}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
