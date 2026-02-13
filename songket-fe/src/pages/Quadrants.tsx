import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchKabupaten, fetchProvinces, fetchQuadrantSummary } from '../api'
import Pagination from '../components/Pagination'

type QuadrantItem = {
  province: string
  regency: string
  total_orders: number
  order_in_percent: number
  credit_capability: number
  quadrant: number
}

type OptionItem = { value: string; label: string }

function normalizeToken(value?: string) {
  return String(value || '').trim().toLowerCase()
}

function clampPercent(value: number) {
  const number = Number(value || 0)
  if (number < 0) return 0
  if (number > 100) return 100
  return number
}

function quadrantColor(value: number) {
  switch (value) {
    case 1:
      return '#16a34a'
    case 2:
      return '#f59e0b'
    case 3:
      return '#f97316'
    default:
      return '#ef4444'
  }
}

export default function QuadrantsPage() {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 767 : false))
  const [items, setItems] = useState<QuadrantItem[]>([])
  const [activePointId, setActivePointId] = useState<string>('')
  const [filter, setFilter] = useState({ province: '', regency: '', search: '' })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const [provincesRaw, setProvincesRaw] = useState<any[]>([])
  const [provinceNameMap, setProvinceNameMap] = useState<Record<string, string>>({})
  const [provinceCodeMap, setProvinceCodeMap] = useState<Record<string, string>>({})
  const [regencyNameMap, setRegencyNameMap] = useState<Record<string, string>>({})
  const fetchedKabupatenRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchQuadrantSummary()
      .then((res) => setItems(res.data.data || res.data || []))
      .catch(() => setItems([]))
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 767)
    onResize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    fetchProvinces()
      .then((res) => {
        const rows = Array.isArray(res.data?.data || res.data) ? (res.data?.data || res.data) : []
        const nextNameMap: Record<string, string> = {}
        const nextCodeMap: Record<string, string> = {}

        rows.forEach((row: any) => {
          const code = String(row?.code || row?.id || row?.name || '').trim()
          const name = String(row?.name || row?.code || row?.id || '').trim()
          if (!code || !name) return

          const codeKey = normalizeToken(code)
          const nameKey = normalizeToken(name)
          nextNameMap[codeKey] = name
          nextNameMap[nameKey] = name
          nextCodeMap[codeKey] = code
          nextCodeMap[nameKey] = code
        })

        setProvincesRaw(rows)
        setProvinceNameMap(nextNameMap)
        setProvinceCodeMap(nextCodeMap)
      })
      .catch(() => {
        setProvincesRaw([])
        setProvinceNameMap({})
        setProvinceCodeMap({})
      })
  }, [])

  useEffect(() => {
    const uniqueProvinces = Array.from(
      new Set(
        items
          .map((item) => String(item?.province || '').trim())
          .filter(Boolean),
      ),
    )

    uniqueProvinces.forEach((provinceRaw) => {
      const provinceRawKey = normalizeToken(provinceRaw)
      const mappedCode = String(provinceCodeMap[provinceRawKey] || provinceRaw).trim()
      const mappedCodeKey = normalizeToken(mappedCode)
      if (!mappedCodeKey || fetchedKabupatenRef.current.has(mappedCodeKey)) return

      fetchedKabupatenRef.current.add(mappedCodeKey)

      const provinceRow =
        provincesRaw.find((row: any) => normalizeToken(row?.code || row?.id || row?.name) === mappedCodeKey) ||
        provincesRaw.find((row: any) => normalizeToken(row?.name) === provinceRawKey)

      const provinceAliases = [provinceRaw]
      if (provinceRow) {
        provinceAliases.push(String(provinceRow?.code || provinceRow?.id || '').trim())
        provinceAliases.push(String(provinceRow?.name || '').trim())
      }

      fetchKabupaten(mappedCode)
        .then((res) => {
          const rows = Array.isArray(res.data?.data || res.data) ? (res.data?.data || res.data) : []
          setRegencyNameMap((prev) => {
            const next = { ...prev }
            rows.forEach((row: any) => {
              const regCode = String(row?.code || row?.id || row?.name || '').trim()
              const regName = String(row?.name || row?.code || row?.id || '').trim()
              if (!regCode || !regName) return

              const regCodeKey = normalizeToken(regCode)
              const regNameKey = normalizeToken(regName)

              provinceAliases
                .map((value) => normalizeToken(value))
                .filter(Boolean)
                .forEach((provinceKey) => {
                  next[`${provinceKey}|${regCodeKey}`] = regName
                  next[`${provinceKey}|${regNameKey}`] = regName
                })
            })
            return next
          })
        })
        .catch(() => {
          fetchedKabupatenRef.current.delete(mappedCodeKey)
        })
    })
  }, [items, provinceCodeMap, provincesRaw])

  const displayProvince = (provinceValue?: string) => {
    const raw = String(provinceValue || '').trim()
    if (!raw) return '-'
    return provinceNameMap[normalizeToken(raw)] || raw
  }

  const displayRegency = (provinceValue?: string, regencyValue?: string) => {
    const regRaw = String(regencyValue || '').trim()
    if (!regRaw) return '-'

    const provinceRaw = String(provinceValue || '').trim()
    const provinceName = displayProvince(provinceRaw)
    const provinceCode = provinceCodeMap[normalizeToken(provinceRaw)] || provinceRaw

    const lookupKeys = [provinceRaw, provinceName, provinceCode]
      .map((value) => normalizeToken(value))
      .filter(Boolean)
    const regKey = normalizeToken(regRaw)

    for (const key of lookupKeys) {
      const found = regencyNameMap[`${key}|${regKey}`]
      if (found) return found
    }

    return regRaw
  }

  const provinceOptions = useMemo<OptionItem[]>(() => {
    const unique = Array.from(
      new Set(
        items
          .map((item) => String(item?.province || '').trim())
          .filter(Boolean),
      ),
    )

    return unique
      .map((value) => ({ value, label: displayProvince(value) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [items, provinceNameMap])

  const regencyOptions = useMemo<OptionItem[]>(() => {
    const unique = Array.from(
      new Set(
        items
          .filter((item) => !filter.province || item.province === filter.province)
          .map((item) => String(item?.regency || '').trim())
          .filter(Boolean),
      ),
    )

    return unique
      .map((value) => ({ value, label: displayRegency(filter.province, value) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [items, filter.province, regencyNameMap, provinceNameMap, provinceCodeMap])

  useEffect(() => {
    if (!filter.regency) return
    if (!regencyOptions.some((option) => option.value === filter.regency)) {
      setFilter((prev) => ({ ...prev, regency: '' }))
    }
  }, [filter.regency, regencyOptions])

  const filtered = useMemo(() => {
    const needle = filter.search.trim().toLowerCase()
    return items.filter((item) => {
      if (filter.province && item.province !== filter.province) return false
      if (filter.regency && item.regency !== filter.regency) return false
      if (needle && !`${displayProvince(item.province)} ${displayRegency(item.province, item.regency)}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [items, filter, provinceNameMap, provinceCodeMap, regencyNameMap])

  useEffect(() => {
    setPage(1)
  }, [filter.province, filter.regency, filter.search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit))
  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  const paged = useMemo(() => {
    const from = (page - 1) * limit
    return filtered.slice(from, from + limit)
  }, [filtered, page, limit])

  const chart = useMemo(() => {
    const width = isMobile ? 560 : 920
    const height = isMobile ? 360 : 470
    const padding = isMobile ? { top: 24, right: 28, bottom: 60, left: 54 } : { top: 28, right: 40, bottom: 74, left: 84 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom
    const pointInset = 10
    const axisGap = 8
    const splitXPercent = 35
    const splitYPercent = 20
    const borderTicks = Array.from({ length: 11 }, (_, index) => index * 10) // 0..100

    const crisp = (value: number) => Math.round(value) + 0.5
    const left = crisp(padding.left)
    const top = crisp(padding.top)
    const right = crisp(width - padding.right)
    const bottom = crisp(height - padding.bottom)
    const toX = (percent: number) => left + (clampPercent(percent) / 100) * (right - left)
    const toY = (percent: number) => bottom - (clampPercent(percent) / 100) * (bottom - top)

    const xSplit = crisp(toX(splitXPercent))
    const ySplit = crisp(toY(splitYPercent))

    const points = filtered.map((item, idx) => {
      const xRaw = clampPercent(item.credit_capability)
      const yRaw = clampPercent(item.order_in_percent)

      let x = toX(xRaw)
      let y = toY(yRaw)

      x = Math.min(Math.max(x, left + pointInset), right - pointInset)
      y = Math.min(Math.max(y, top + pointInset), bottom - pointInset)

      if (Math.abs(x - xSplit) < axisGap) {
        x = xRaw >= splitXPercent ? xSplit + axisGap : xSplit - axisGap
      }
      if (Math.abs(y - ySplit) < axisGap) {
        y = yRaw >= splitYPercent ? ySplit - axisGap : ySplit + axisGap
      }

      return {
        id: `${item.province || ''}-${item.regency || ''}-${idx}`,
        areaLabel: displayRegency(item.province, item.regency),
        provinceLabel: displayProvince(item.province),
        regencyLabel: displayRegency(item.province, item.regency),
        totalOrders: item.total_orders,
        x,
        y,
        quadrant: item.quadrant,
        orderInPercent: item.order_in_percent,
        creditCapability: item.credit_capability,
        axisOrderValue: yRaw,
        axisCreditValue: xRaw,
      }
    })

    return {
      width,
      height,
      toX,
      toY,
      xSplit,
      ySplit,
      splitXPercent,
      splitYPercent,
      borderTicks,
      left,
      top,
      right,
      bottom,
      points,
    }
  }, [filtered, isMobile, provinceNameMap, provinceCodeMap, regencyNameMap])

  const activePoint = useMemo(
    () => chart.points.find((point) => point.id === activePointId) || null,
    [activePointId, chart.points],
  )

  const tooltip = useMemo(() => {
    if (!activePoint) return null
    const offsetX = 12
    const offsetY = -12
    const width = 220
    const height = 34
    const x = Math.min(Math.max(activePoint.x + offsetX, chart.left + 4), chart.right - width - 4)
    const y = Math.min(Math.max(activePoint.y + offsetY, chart.top + 4), chart.bottom - height - 4)
    return { x, y, width, height }
  }, [activePoint, chart.bottom, chart.left, chart.right, chart.top])

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Kuadran</div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          <h3>Quadrant Flow</h3>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            Area-based points (kabupaten/kota). Vertical axis: Order In (%). Horizontal axis: Credit Capability (%).
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              marginTop: 12,
            }}
          >
            <div>
              <label>Province</label>
              <select
                value={filter.province}
                onChange={(e) => setFilter((prev) => ({ ...prev, province: e.target.value, regency: '' }))}
              >
                <option value="">All</option>
                {provinceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Regency/City</label>
              <select
                value={filter.regency}
                onChange={(e) => setFilter((prev) => ({ ...prev, regency: e.target.value }))}
                disabled={!regencyOptions.length}
              >
                <option value="">All</option>
                {regencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Search Area</label>
              <input
                value={filter.search}
                onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search province / regency"
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              width="100%"
              style={{
                display: 'block',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
              }}
            >
              <rect
                x={chart.left}
                y={chart.top}
                width={chart.right - chart.left}
                height={chart.bottom - chart.top}
                fill="#f8fafc"
                stroke="#111827"
                strokeWidth={1.8}
                strokeDasharray="2 8"
                rx={10}
              />

              <line x1={chart.xSplit} y1={chart.top} x2={chart.xSplit} y2={chart.bottom} stroke="#111827" strokeWidth={1.8} shapeRendering="crispEdges" />
              <line x1={chart.left} y1={chart.ySplit} x2={chart.right} y2={chart.ySplit} stroke="#111827" strokeWidth={1.8} shapeRendering="crispEdges" />

              {chart.borderTicks
                .filter((value) => value < 100)
                .map((value) => (
                <text
                  key={`bottom-${value}`}
                  x={chart.toX(value)}
                  y={chart.bottom + (isMobile ? 12 : 16)}
                  textAnchor="middle"
                  fontSize={isMobile ? 7.5 : 10}
                  fontWeight={700}
                  fill="#111827"
                >
                  {value}%
                </text>
                ))}

              {chart.borderTicks
                .filter((value) => value !== chart.splitYPercent)
                .map((value) => (
                  <text
                    key={`left-${value}`}
                    x={chart.left - (isMobile ? 4 : 8)}
                    y={chart.toY(value) + 3}
                    textAnchor="end"
                    fontSize={isMobile ? 7.5 : 10}
                    fontWeight={700}
                    fill="#111827"
                  >
                    {value}%
                  </text>
                ))}

              {chart.borderTicks
                .filter((value) => value === 0)
                .map((value) => (
                  <text
                    key={`right-${value}`}
                    x={chart.right + (isMobile ? 2 : 4)}
                    y={chart.toY(value) + 3}
                    textAnchor="start"
                    fontSize={isMobile ? 7.5 : 10}
                    fontWeight={700}
                    fill="#111827"
                  >
                    {100 - value}%
                  </text>
                ))}

              <text
                x={chart.xSplit}
                y={chart.bottom + (isMobile ? 24 : 28)}
                textAnchor="middle"
                fontSize={isMobile ? 8 : 11}
                fontWeight={700}
                fill="#111827"
              >
                {chart.splitXPercent}%
              </text>

              <text
                x={chart.left - (isMobile ? 16 : 20)}
                y={chart.ySplit + 4}
                textAnchor="end"
                fontSize={isMobile ? 8 : 11}
                fontWeight={700}
                fill="#111827"
              >
                {chart.splitYPercent}%
              </text>

              <text
                x={chart.xSplit}
                y={chart.top - (isMobile ? 6 : 10)}
                textAnchor="middle"
                fontSize={isMobile ? 12 : 16}
                fontWeight={700}
                fill="#111827"
              >
                order in
              </text>
              <text
                x={chart.right - 6}
                y={chart.ySplit - (isMobile ? 10 : 12)}
                textAnchor="end"
                fontSize={isMobile ? 12 : 16}
                fontWeight={700}
                fill="#111827"
              >
                credit capability
              </text>

              <text
                x={(chart.left + chart.xSplit) / 2}
                y={(chart.top + chart.ySplit) / 2}
                textAnchor="middle"
                fontSize={isMobile ? 11 : 20}
                fontWeight={700}
                fill="#16a34a"
              >
                Kuadran 1
              </text>
              <text
                x={(chart.xSplit + chart.right) / 2}
                y={(chart.top + chart.ySplit) / 2}
                textAnchor="middle"
                fontSize={isMobile ? 11 : 20}
                fontWeight={700}
                fill="#f97316"
              >
                Kuadran 3
              </text>
              <text
                x={(chart.left + chart.xSplit) / 2}
                y={(chart.ySplit + chart.bottom) / 2}
                textAnchor="middle"
                fontSize={isMobile ? 11 : 20}
                fontWeight={700}
                fill="#f59e0b"
              >
                Kuadran 2
              </text>
              <text
                x={(chart.xSplit + chart.right) / 2}
                y={(chart.ySplit + chart.bottom) / 2}
                textAnchor="middle"
                fontSize={isMobile ? 11 : 20}
                fontWeight={700}
                fill="#ef4444"
              >
                Kuadran 4
              </text>

              {chart.points.map((point) => (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.id === activePointId ? (isMobile ? 7 : 8) : isMobile ? 5 : 6}
                    fill={quadrantColor(point.quadrant)}
                    stroke="#ffffff"
                    strokeWidth={2}
                    style={{ cursor: 'default' }}
                    onMouseEnter={() => setActivePointId(point.id)}
                    onMouseLeave={() => setActivePointId('')}
                  />
                </g>
              ))}

              {activePoint && tooltip && (
                <g pointerEvents="none">
                  <rect x={tooltip.x} y={tooltip.y} width={tooltip.width} height={tooltip.height} rx={6} fill="#0f172a" opacity={0.94} />
                  <text x={tooltip.x + 10} y={tooltip.y + 22} fontSize={isMobile ? 11 : 12} fill="#fff" fontWeight={700}>
                    {`${activePoint.provinceLabel} - ${activePoint.regencyLabel}`}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        <div className="card">
          <h3>Area Points</h3>
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Province</th>
                <th>Regency/City</th>
                <th>Total Order In</th>
                <th>Order In %</th>
                <th>Credit Capability %</th>
                <th>Quadrant</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, idx) => (
                <tr key={`${row.province}-${row.regency}-${idx}`}>
                  <td>{displayProvince(row.province)}</td>
                  <td>{displayRegency(row.province, row.regency)}</td>
                  <td>{row.total_orders}</td>
                  <td>{row.order_in_percent.toFixed(2)}%</td>
                  <td>{row.credit_capability.toFixed(2)}%</td>
                  <td>
                    <span className="badge" style={{ background: quadrantColor(row.quadrant), color: '#fff' }}>
                      Q{row.quadrant}
                    </span>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6}>No data found.</td>
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
            limitOptions={[10, 20, 50]}
          />
        </div>
      </div>
    </div>
  )
}
