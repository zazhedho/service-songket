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
    const width = 920
    const height = 470
    const padding = { top: 28, right: 28, bottom: 74, left: 84 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom
    const pointInset = 10
    const axisGap = 9
    const minXFromAxis = 2
    const minYFromAxis = 1

    const xTicks = Array.from({ length: 21 }, (_, index) => (index - 10) * 10) // -100 .. 100
    const maxOrderValue = Math.max(...filtered.map((item) => Number(item.total_orders || 0)), 0)
    const yMax = Math.max(10, maxOrderValue)
    const yTickStep = yMax <= 12 ? 1 : yMax <= 30 ? 2 : yMax <= 60 ? 5 : 10
    const yTicks: number[] = []
    for (let value = yTickStep; value <= yMax; value += yTickStep) {
      yTicks.push(value)
    }

    const crisp = (value: number) => Math.round(value) + 0.5
    const left = crisp(padding.left)
    const top = crisp(padding.top)
    const right = crisp(width - padding.right)
    const bottom = crisp(height - padding.bottom)
    const originX = crisp((left + right) / 2)
    const originY = crisp((top + bottom) / 2)

    const toX = (signedPercent: number) => originX + (signedPercent / 100) * ((right - left) / 2)
    const toY = (signedOrder: number) => originY - (signedOrder / yMax) * ((bottom - top) / 2)

    const resolveSignedPosition = (item: QuadrantItem) => {
      const xRaw = clampPercent(item.credit_capability)
      const yRaw = Math.max(0, Math.min(yMax, Number(item.total_orders || 0)))

      let xSign = 1
      let ySign = 1
      switch (item.quadrant) {
        case 1:
          xSign = -1
          ySign = 1
          break
        case 2:
          xSign = -1
          ySign = -1
          break
        case 3:
          xSign = 1
          ySign = 1
          break
        case 4:
          xSign = 1
          ySign = -1
          break
        default:
          xSign = 1
          ySign = 1
      }

      let xSigned = xRaw * xSign
      let ySigned = yRaw * ySign

      if (Math.abs(xSigned) < minXFromAxis) xSigned = xSign * minXFromAxis
      if (Math.abs(ySigned) < minYFromAxis) ySigned = ySign * minYFromAxis

      return { xSigned, ySigned, xSign, ySign, yRaw, xRaw }
    }

    const points = filtered.map((item, idx) => {
      const { xSigned, ySigned, xSign, ySign, yRaw, xRaw } = resolveSignedPosition(item)

      let x = toX(xSigned)
      let y = toY(ySigned)

      x = Math.min(Math.max(x, left + pointInset), right - pointInset)
      y = Math.min(Math.max(y, top + pointInset), bottom - pointInset)

      if (xSign > 0 && x < originX + axisGap) x = originX + axisGap
      if (xSign < 0 && x > originX - axisGap) x = originX - axisGap
      if (ySign > 0 && y > originY - axisGap) y = originY - axisGap
      if (ySign < 0 && y < originY + axisGap) y = originY + axisGap

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
      originX,
      originY,
      left,
      top,
      right,
      bottom,
      xTicks,
      yTicks,
      yMax,
      points,
    }
  }, [filtered, provinceNameMap, provinceCodeMap, regencyNameMap])

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
            Area-based points (kabupaten/kota). Vertical axis: Order In (integer scale). Horizontal axis: Credit Capability (%).
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

          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              width="100%"
              style={{
                minWidth: 760,
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

              <line x1={chart.originX} y1={chart.top} x2={chart.originX} y2={chart.bottom} stroke="#111827" strokeWidth={1.8} shapeRendering="crispEdges" />
              <line x1={chart.left} y1={chart.originY} x2={chart.right} y2={chart.originY} stroke="#111827" strokeWidth={1.8} shapeRendering="crispEdges" />

              {chart.xTicks.map((tick) => (
                <text
                  key={`x-tick-${String(tick)}`}
                  x={chart.toX(tick)}
                  y={chart.originY - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="#111827"
                >
                  {tick === 0 ? '0' : `${Math.abs(tick)}%`}
                </text>
              ))}

              {chart.yTicks.map((tick) => (
                <text
                  key={`y-tick-pos-${String(tick)}`}
                  x={chart.originX + 8}
                  y={chart.toY(tick) + 4}
                  textAnchor="start"
                  fontSize={11}
                  fontWeight={700}
                  fill="#111827"
                >
                  {tick}
                </text>
              ))}
              {chart.yTicks.map((tick) => (
                <text
                  key={`y-tick-neg-${String(tick)}`}
                  x={chart.originX + 8}
                  y={chart.toY(-tick) + 4}
                  textAnchor="start"
                  fontSize={11}
                  fontWeight={700}
                  fill="#111827"
                >
                  {tick}
                </text>
              ))}
              <text x={chart.originX + 8} y={chart.originY + 4} textAnchor="start" fontSize={11} fontWeight={700} fill="#111827">
                0
              </text>

              <text x={(chart.left + chart.right) / 2} y={chart.bottom + 56} textAnchor="middle" fontSize={16} fontWeight={700} fill="#111827">
                Credit Capability
              </text>
              <text
                transform={`translate(${chart.left - 58}, ${(chart.top + chart.bottom) / 2}) rotate(-90)`}
                textAnchor="middle"
                fontSize={16}
                fontWeight={700}
                fill="#111827"
              >
                Order In
              </text>

              <text x={(chart.left + chart.originX) / 2} y={chart.top - 10} textAnchor="middle" fontSize={20} fontWeight={700} fill="#16a34a">Kuadran 1</text>
              <text x={(chart.originX + chart.right) / 2} y={chart.top - 10} textAnchor="middle" fontSize={20} fontWeight={700} fill="#f97316">Kuadran 3</text>
              <text x={(chart.left + chart.originX) / 2} y={chart.bottom + 28} textAnchor="middle" fontSize={20} fontWeight={700} fill="#f59e0b">Kuadran 2</text>
              <text x={(chart.originX + chart.right) / 2} y={chart.bottom + 28} textAnchor="middle" fontSize={20} fontWeight={700} fill="#ef4444">Kuadran 4</text>

              {chart.points.map((point) => (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.id === activePointId ? 8 : 6}
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
                  <text x={tooltip.x + 10} y={tooltip.y + 22} fontSize={12} fill="#fff" fontWeight={700}>
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
