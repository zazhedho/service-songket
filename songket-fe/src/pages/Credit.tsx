import { useEffect, useMemo, useState } from 'react'
import { fetchKabupaten, fetchKecamatan, fetchProvinces, fetchQuadrantSummary } from '../api'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'

export default function CreditPage() {
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState({ province: '', regency: '', district: '' })
  const [provinces, setProvinces] = useState<any[]>([])
  const [kabupaten, setKabupaten] = useState<any[]>([])
  const [kecamatan, setKecamatan] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_credit')

  const load = () => fetchQuadrantSummary().then((res) => setItems(res.data.data || res.data || []))

  useEffect(() => {
    if (canList) load()
  }, [canList])

  useEffect(() => {
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

  const nameFrom = (id: string, list: any[]) => list.find((entry) => entry.code === id)?.name || id

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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Credit Capability</div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          <h3>Daftar Credit Capability</h3>
          {!canList && <div className="alert">Tidak ada izin melihat data.</div>}

          {canList && (
            <>
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
                    <th>Approval Rate</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item, idx) => (
                    <tr key={idx}>
                      <td>{nameFrom(item.province, provinces)}</td>
                      <td>{nameFrom(item.regency, kabupaten)}</td>
                      <td>{nameFrom(item.district, kecamatan)}</td>
                      <td>{item.village || '-'}</td>
                      <td>{item.total_orders ?? '-'}</td>
                      <td>{item.region_rate ? `${(item.region_rate * 100).toFixed(1)}%` : '-'}</td>
                      <td>{item.score}</td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={7}>Data tidak ditemukan.</td>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
