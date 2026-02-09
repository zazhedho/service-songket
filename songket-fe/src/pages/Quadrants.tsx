import { useEffect, useMemo, useState } from 'react'
import { fetchKabupaten, fetchKecamatan, fetchProvinces, fetchQuadrantSummary } from '../api'
import Pagination from '../components/Pagination'

export default function QuadrantsPage() {
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState({ province: '', regency: '', district: '' })
  const [provinces, setProvinces] = useState<any[]>([])
  const [kabupaten, setKabupaten] = useState<any[]>([])
  const [kecamatan, setKecamatan] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const load = () => fetchQuadrantSummary().then((res) => setItems(res.data.data || res.data || []))

  useEffect(() => {
    load()
    fetchProvinces().then((res) => setProvinces(res.data.data || res.data || [])).catch(() => setProvinces([]))
  }, [])

  const handleProvince = async (code: string) => {
    setFilter({ province: code, regency: '', district: '' })
    setKecamatan([])

    if (!code) {
      setKabupaten([])
      return
    }

    try {
      const res = await fetchKabupaten(code)
      setKabupaten(res.data.data || res.data || [])
    } catch {
      setKabupaten([])
    }
  }

  const handleRegency = async (code: string) => {
    setFilter((prev) => ({ ...prev, regency: code, district: '' }))

    if (!filter.province || !code) {
      setKecamatan([])
      return
    }

    try {
      const res = await fetchKecamatan(filter.province, code)
      setKecamatan(res.data.data || res.data || [])
    } catch {
      setKecamatan([])
    }
  }

  const nameFrom = (code: string, list: any[]) => list.find((entry) => entry.code === code)?.name || code

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (filter.province && item.province !== filter.province) return false
        if (filter.regency && item.regency !== filter.regency) return false
        if (filter.district && item.district !== filter.district) return false
        return true
      }),
    [items, filter],
  )

  const paged = useMemo(() => {
    const from = (page - 1) * limit
    const to = from + limit
    return filtered.slice(from, to)
  }, [filtered, limit, page])

  const totalPages = useMemo(() => {
    if (!filtered.length) return 1
    return Math.ceil(filtered.length / limit)
  }, [filtered.length, limit])

  useEffect(() => {
    setPage(1)
  }, [filter.district, filter.province, filter.regency])

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Kuadran</div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          <h3>Daftar Wilayah</h3>

          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              marginTop: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <label>Provinsi</label>
              <select value={filter.province} onChange={(e) => void handleProvince(e.target.value)}>
                <option value="">Semua</option>
                {provinces.map((province: any) => (
                  <option key={province.code} value={province.code}>{province.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Kabupaten/Kota</label>
              <select value={filter.regency} onChange={(e) => void handleRegency(e.target.value)} disabled={!filter.province}>
                <option value="">Semua</option>
                {kabupaten.map((kab: any) => (
                  <option key={kab.code} value={kab.code}>{kab.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Kecamatan</label>
              <select
                value={filter.district}
                onChange={(e) => setFilter((prev) => ({ ...prev, district: e.target.value }))}
                disabled={!filter.regency}
              >
                <option value="">Semua</option>
                {kecamatan.map((kec: any) => (
                  <option key={kec.code} value={kec.code}>{kec.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button className="btn-ghost" type="button" onClick={() => { setFilter({ province: '', regency: '', district: '' }); setKabupaten([]); setKecamatan([]) }}>
                Reset Filter
              </button>
            </div>
          </div>

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
              {paged.map((row, idx) => (
                <tr key={idx}>
                  <td>{nameFrom(row.province, provinces)}</td>
                  <td>{nameFrom(row.regency, kabupaten)}</td>
                  <td>{nameFrom(row.district, kecamatan)}</td>
                  <td>{row.village || '-'}</td>
                  <td>{row.total_orders ?? '-'}</td>
                  <td>{row.score}</td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6}>Data tidak ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalData={filtered.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next)
              setPage(1)
            }}
          />
        </div>
      </div>
    </div>
  )
}
