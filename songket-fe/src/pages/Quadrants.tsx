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

  const chart = useMemo(() => {
    const baseWidth = 920
    const baseHeight = 430
    const padding = { top: 24, right: 28, bottom: 52, left: 56 }
    const plotWidth = baseWidth - padding.left - padding.right
    const plotHeight = baseHeight - padding.top - padding.bottom

    const points = filtered.map((item, idx) => ({
      id: `${item.province || ''}-${item.regency || ''}-${item.district || ''}-${item.village || ''}-${idx}`,
      x: Number(item.total_orders || 0),
      y: Number(item.score || 0),
      label: [item.province, item.regency, item.district, item.village].filter(Boolean).join(' / ') || `Row ${idx + 1}`,
    }))

    if (points.length === 0) {
      return {
        width: baseWidth,
        height: baseHeight,
        axisX: baseWidth / 2,
        axisY: baseHeight / 2,
        xTicks: [] as number[],
        yTicks: [] as number[],
        points: [] as Array<{ id: string; sx: number; sy: number; label: string; x: number; y: number }>,
      }
    }

    let minX = Math.min(...points.map((point) => point.x))
    let maxX = Math.max(...points.map((point) => point.x))
    let minY = Math.min(...points.map((point) => point.y))
    let maxY = Math.max(...points.map((point) => point.y))

    if (minX === maxX) {
      minX -= 1
      maxX += 1
    }
    if (minY === maxY) {
      minY -= 1
      maxY += 1
    }

    const toX = (value: number) => padding.left + ((value - minX) / (maxX - minX)) * plotWidth
    const toY = (value: number) => padding.top + ((maxY - value) / (maxY - minY)) * plotHeight

    const axisCenterX = (minX + maxX) / 2
    const axisCenterY = (minY + maxY) / 2

    return {
      width: baseWidth,
      height: baseHeight,
      axisX: toX(axisCenterX),
      axisY: toY(axisCenterY),
      xTicks: [minX, axisCenterX, maxX],
      yTicks: [minY, axisCenterY, maxY],
      points: points.map((point) => ({
        ...point,
        sx: toX(point.x),
        sy: toY(point.y),
      })),
    }
  }, [filtered])

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
          <h3>Quadrant Chart</h3>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            X axis: total orders, Y axis: score. Axes are crossed as plus (+).
          </div>

          {chart.points.length === 0 && (
            <div style={{ marginTop: 12, color: '#64748b' }}>No chart data available for current filter.</div>
          )}

          {chart.points.length > 0 && (
            <div style={{ marginTop: 12, overflowX: 'auto' }}>
              <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                width="100%"
                style={{ minWidth: 700, display: 'block', background: '#f8fafc', border: '1px solid #dbe3ef', borderRadius: 12 }}
              >
                <line x1={56} y1={chart.axisY} x2={chart.width - 28} y2={chart.axisY} stroke="#2563eb" strokeWidth={2.2} />
                <line x1={chart.axisX} y1={24} x2={chart.axisX} y2={chart.height - 52} stroke="#2563eb" strokeWidth={2.2} />

                {chart.xTicks.map((tick, idx) => {
                  const x = 56 + ((chart.width - 84) * idx) / Math.max(1, chart.xTicks.length - 1)
                  return (
                    <g key={`x-${idx}`}>
                      <line x1={x} y1={chart.height - 52} x2={x} y2={chart.height - 46} stroke="#64748b" strokeWidth={1} />
                      <text x={x} y={chart.height - 30} textAnchor="middle" fontSize={11} fill="#475569">
                        {tick.toFixed(1)}
                      </text>
                    </g>
                  )
                })}

                {chart.yTicks.map((tick, idx) => {
                  const y = 24 + ((chart.height - 76) * idx) / Math.max(1, chart.yTicks.length - 1)
                  return (
                    <g key={`y-${idx}`}>
                      <line x1={50} y1={y} x2={56} y2={y} stroke="#64748b" strokeWidth={1} />
                      <text x={44} y={y + 3} textAnchor="end" fontSize={11} fill="#475569">
                        {chart.yTicks[chart.yTicks.length - 1 - idx].toFixed(1)}
                      </text>
                    </g>
                  )
                })}

                {chart.points.map((point) => (
                  <g key={point.id}>
                    <circle cx={point.sx} cy={point.sy} r={5.2} fill="#0ea5e9" stroke="#0c4a6e" strokeWidth={1.2}>
                      <title>{`${point.label} | Orders: ${point.x} | Score: ${point.y}`}</title>
                    </circle>
                  </g>
                ))}

                <text x={chart.width - 30} y={chart.axisY - 8} textAnchor="end" fontSize={11} fill="#1d4ed8">
                  X
                </text>
                <text x={chart.axisX + 8} y={34} textAnchor="start" fontSize={11} fill="#1d4ed8">
                  Y
                </text>
              </svg>
            </div>
          )}
        </div>

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
