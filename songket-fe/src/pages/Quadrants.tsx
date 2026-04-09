import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchKabupaten, fetchProvinces, fetchQuadrantSummary } from '../api'
import Pagination from '../components/Pagination'

type QuadrantItem = {
  job_id?: string
  job_name?: string
  province: string
  regency: string
  total_orders: number
  order_in_percent: number
  order_in_growth_percent?: number
  order_in_current_total?: number
  order_in_previous_total?: number
  reference_month?: string
  reference_prev_month?: string
  credit_capability: number
  quadrant: number
}

type QuadrantJobPoint = {
  id: string
  job_id: string
  job_name: string
  total_orders: number
  order_in_growth_percent: number
  order_in_current_total: number
  order_in_previous_total: number
  credit_capability: number
  quadrant: number
  area_count: number
  reference_month?: string
  reference_prev_month?: string
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

function getOrderInGrowth(item: { order_in_growth_percent?: number; order_in_percent?: number }) {
  const raw = Number(item.order_in_growth_percent ?? item.order_in_percent ?? 0)
  return Number.isFinite(raw) ? raw : 0
}

function buildAxisTicks(min: number, max: number, targetTickCount = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0]
  if (max <= min) return [min]

  const rawStep = (max - min) / Math.max(1, targetTickCount - 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1e-6))))
  const normalized = rawStep / magnitude

  let step = magnitude
  if (normalized > 5) step = 10 * magnitude
  else if (normalized > 2) step = 5 * magnitude
  else if (normalized > 1) step = 2 * magnitude

  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let value = start; value <= end + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(6)))
  }
  return ticks
}

function formatAxisPercent(value: number) {
  const abs = Math.abs(value)
  if (Number.isInteger(value) || abs >= 100) return `${value.toFixed(0)}%`
  if (abs >= 10) return `${value.toFixed(1)}%`
  return `${value.toFixed(2)}%`
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

function buildAnalysisText(item: {
  order_in_growth_percent?: number
  order_in_percent?: number
  total_orders?: number
  order_in_current_total?: number
  order_in_previous_total?: number
  reference_month?: string
  reference_prev_month?: string
  credit_capability?: number
}) {
  const growth = getOrderInGrowth(item)
  const growthText = `${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`
  const currentTotal = Number(item.order_in_current_total ?? item.total_orders ?? 0)
  const previousTotal = Number(item.order_in_previous_total ?? 0)
  const referenceMonth = String(item.reference_month || '-')
  const referencePrevMonth = String(item.reference_prev_month || '-')

  return `Order In ${currentTotal.toLocaleString('id-ID')} unit (${referenceMonth}) vs ${previousTotal.toLocaleString('id-ID')} unit (${referencePrevMonth}), growth ${growthText}, credit capability ${Number(item.credit_capability || 0).toFixed(2)}%.`
}

function pctChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0
    return 100
  }
  return ((current - previous) / previous) * 100
}

export default function QuadrantsPage() {
  const currentYear = new Date().getFullYear()
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 767 : false))
  const [items, setItems] = useState<QuadrantItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [activePointId, setActivePointId] = useState<string>('')
  const [filter, setFilter] = useState({ province: '', regency: '', search: '' })
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const [provincesRaw, setProvincesRaw] = useState<any[]>([])
  const [provinceNameMap, setProvinceNameMap] = useState<Record<string, string>>({})
  const [provinceCodeMap, setProvinceCodeMap] = useState<Record<string, string>>({})
  const [regencyNameMap, setRegencyNameMap] = useState<Record<string, string>>({})
  const fetchedKabupatenRef = useRef<Set<string>>(new Set())

  const yearOptions = useMemo(() => {
    const years: string[] = []
    for (let year = currentYear + 1; year >= 2015; year -= 1) {
      years.push(String(year))
    }
    return years
  }, [currentYear])

  useEffect(() => {
    const params: Record<string, unknown> = {}
    if (selectedYear) params.year = Number(selectedYear)
    if (selectedMonth) params.month = Number(selectedMonth)

    setIsLoading(true)
    setLoadError('')
    fetchQuadrantSummary(params)
      .then((res) => {
        setItems(res.data.data || res.data || [])
      })
      .catch((err: any) => {
        setItems([])
        setLoadError(err?.response?.data?.error || err?.message || 'Failed to load quadrant data.')
      })
      .finally(() => setIsLoading(false))
  }, [selectedYear, selectedMonth])

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

  const filteredAreaRows = useMemo(() => {
    const needle = filter.search.trim().toLowerCase()
    return items.filter((item) => {
      if (filter.province && item.province !== filter.province) return false
      if (filter.regency && item.regency !== filter.regency) return false
      if (needle) {
        const haystack = `${displayProvince(item.province)} ${displayRegency(item.province, item.regency)} ${String(item.job_name || '').trim()}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
  }, [items, filter, provinceNameMap, provinceCodeMap, regencyNameMap])

  const filtered = useMemo<QuadrantJobPoint[]>(() => {
    const map = new Map<string, {
      job_id: string
      job_name: string
      current_total: number
      previous_total: number
      capability_weighted_sum: number
      weight_total: number
      area_keys: Set<string>
      reference_month?: string
      reference_prev_month?: string
    }>()

    for (const row of filteredAreaRows) {
      const jobID = String(row.job_id || '').trim()
      const jobName = String(row.job_name || row.job_id || '').trim()
      if (!jobID && !jobName) continue

      const key = (jobID || jobName).toLowerCase()
      const currentTotal = Number(row.order_in_current_total ?? row.total_orders ?? 0)
      const previousTotal = Number(row.order_in_previous_total ?? 0)
      const capability = Number(row.credit_capability || 0)
      const weight = Math.max(currentTotal + previousTotal, 1)
      const areaKey = `${String(row.province || '').trim().toLowerCase()}|${String(row.regency || '').trim().toLowerCase()}`

      if (!map.has(key)) {
        map.set(key, {
          job_id: jobID,
          job_name: jobName || jobID,
          current_total: 0,
          previous_total: 0,
          capability_weighted_sum: 0,
          weight_total: 0,
          area_keys: new Set<string>(),
          reference_month: row.reference_month,
          reference_prev_month: row.reference_prev_month,
        })
      }
      const entry = map.get(key)!
      entry.current_total += currentTotal
      entry.previous_total += previousTotal
      entry.capability_weighted_sum += capability * weight
      entry.weight_total += weight
      if (areaKey !== '|') entry.area_keys.add(areaKey)
      if (!entry.reference_month && row.reference_month) entry.reference_month = row.reference_month
      if (!entry.reference_prev_month && row.reference_prev_month) entry.reference_prev_month = row.reference_prev_month
    }

    const result: QuadrantJobPoint[] = []
    map.forEach((entry, key) => {
      const capability = entry.weight_total > 0 ? entry.capability_weighted_sum / entry.weight_total : 0
      const growth = pctChange(entry.current_total, entry.previous_total)
      let quadrant = 2
      if (growth >= 0 && capability >= 35) quadrant = 3
      else if (growth >= 0 && capability < 35) quadrant = 1
      else if (growth < 0 && capability >= 35) quadrant = 4
      else quadrant = 2

      result.push({
        id: key,
        job_id: entry.job_id,
        job_name: entry.job_name || entry.job_id || '-',
        total_orders: entry.current_total,
        order_in_growth_percent: growth,
        order_in_current_total: entry.current_total,
        order_in_previous_total: entry.previous_total,
        credit_capability: capability,
        quadrant,
        area_count: entry.area_keys.size,
        reference_month: entry.reference_month,
        reference_prev_month: entry.reference_prev_month,
      })
    })

    result.sort((a, b) => {
      if (a.order_in_growth_percent !== b.order_in_growth_percent) return b.order_in_growth_percent - a.order_in_growth_percent
      if (a.credit_capability !== b.credit_capability) return b.credit_capability - a.credit_capability
      return a.job_name.localeCompare(b.job_name)
    })
    return result
  }, [filteredAreaRows])

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
    const pointInset = 10
    const axisGap = 8
    const splitXPercent = 35
    const splitYGrowthPercent = 0
    const borderTicks = Array.from({ length: 11 }, (_, index) => index * 10) // 0..100

    const crisp = (value: number) => Math.round(value) + 0.5
    const left = crisp(padding.left)
    const top = crisp(padding.top)
    const right = crisp(width - padding.right)
    const bottom = crisp(height - padding.bottom)
    const toX = (percent: number) => left + (clampPercent(percent) / 100) * (right - left)

    const growthValues = filtered.map((item) => getOrderInGrowth(item)).filter((value) => Number.isFinite(value))
    const observedMin = growthValues.length ? Math.min(...growthValues) : -10
    const observedMax = growthValues.length ? Math.max(...growthValues) : 10
    let growthMin = Math.min(observedMin, splitYGrowthPercent)
    let growthMax = Math.max(observedMax, splitYGrowthPercent)
    if (growthMin === growthMax) {
      growthMin -= 10
      growthMax += 10
    }
    const growthPadding = Math.max((growthMax - growthMin) * 0.12, 5)
    growthMin -= growthPadding
    growthMax += growthPadding

    const toY = (growthPercent: number) => {
      const clamped = Math.min(Math.max(growthPercent, growthMin), growthMax)
      const ratio = (clamped - growthMin) / Math.max(growthMax - growthMin, 1)
      return bottom - ratio * (bottom - top)
    }
    const yTicks = buildAxisTicks(growthMin, growthMax)

    const xSplit = crisp(toX(splitXPercent))
    const ySplit = crisp(toY(splitYGrowthPercent))

    const points = filtered.map((item) => {
      const xRaw = clampPercent(item.credit_capability)
      const yRaw = Number(item.order_in_growth_percent || 0)

      let x = toX(xRaw)
      let y = toY(yRaw)

      x = Math.min(Math.max(x, left + pointInset), right - pointInset)
      y = Math.min(Math.max(y, top + pointInset), bottom - pointInset)

      if (Math.abs(x - xSplit) < axisGap) {
        x = xRaw >= splitXPercent ? xSplit + axisGap : xSplit - axisGap
      }
      if (Math.abs(y - ySplit) < axisGap) {
        y = yRaw >= splitYGrowthPercent ? ySplit - axisGap : ySplit + axisGap
      }

      return {
        id: item.id,
        jobID: item.job_id,
        jobName: item.job_name || item.job_id || '-',
        totalOrders: Number(item.order_in_current_total ?? item.total_orders ?? 0),
        previousOrders: Number(item.order_in_previous_total ?? 0),
        areaCount: Number(item.area_count || 0),
        x,
        y,
        quadrant: item.quadrant,
        orderInGrowthPercent: yRaw,
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
      splitYGrowthPercent,
      borderTicks,
      yTicks,
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
    const width = isMobile ? 240 : 290
    const height = 88
    const x = Math.min(Math.max(activePoint.x + offsetX, chart.left + 4), chart.right - width - 4)
    const y = Math.min(Math.max(activePoint.y + offsetY, chart.top + 4), chart.bottom - height - 4)
    return { x, y, width, height }
  }, [activePoint, chart.bottom, chart.left, chart.right, chart.top, isMobile])

  const referencePeriod = useMemo(() => {
    const first = filtered[0] || items[0]
    if (!first) return '-'
    const current = String(first.reference_month || '').trim()
    const previous = String(first.reference_prev_month || '').trim()
    if (!current && !previous) return '-'
    if (!current) return `vs ${previous}`
    if (!previous) return current
    return `${current} vs ${previous}`
  }, [filtered, items])

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Quadrant</div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          <h3>Quadrant Flow</h3>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            Job-based points (aggregated by selected area filter). Vertical axis: Order In Growth (%) vs previous month. Horizontal axis: Credit Capability (%). Period: {referencePeriod}.
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
              <label>Search Job/Area</label>
              <input
                value={filter.search}
                onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search job / province / regency"
              />
            </div>

            <div>
              <label>Year</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const nextYear = e.target.value
                  setSelectedYear(nextYear)
                  if (!nextYear) {
                    setSelectedMonth('')
                  }
                }}
              >
                <option value="">Latest</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const nextMonth = e.target.value
                  setSelectedMonth(nextMonth)
                  if (nextMonth && !selectedYear) {
                    setSelectedYear(String(currentYear))
                  }
                }}
              >
                <option value="">Latest</option>
                {Array.from({ length: 12 }, (_, idx) => (
                  <option key={`m-${idx + 1}`} value={String(idx + 1)}>
                    {String(idx + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadError && (
            <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 12 }}>
              {loadError}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            {isLoading && (
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                Loading quadrant points...
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                No quadrant points for selected period/filter.
              </div>
            )}
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

              {chart.borderTicks.map((value) => (
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

              {chart.yTicks.map((value) => (
                <text
                  key={`left-${value}`}
                  x={chart.left - (isMobile ? 4 : 8)}
                  y={chart.toY(value) + 3}
                  textAnchor="end"
                  fontSize={isMobile ? 7.5 : 10}
                  fontWeight={700}
                  fill="#111827"
                >
                  {formatAxisPercent(value)}
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
                {chart.splitYGrowthPercent}%
              </text>

              <text
                x={chart.xSplit}
                y={chart.top - (isMobile ? 6 : 10)}
                textAnchor="middle"
                fontSize={isMobile ? 12 : 16}
                fontWeight={700}
                fill="#111827"
              >
                Order In Growth
              </text>
              <text
                x={chart.right - 6}
                y={chart.ySplit - (isMobile ? 10 : 12)}
                textAnchor="end"
                fontSize={isMobile ? 12 : 16}
                fontWeight={700}
                fill="#111827"
              >
                Credit Capability
              </text>

              <text
                x={(chart.left + chart.xSplit) / 2}
                y={(chart.top + chart.ySplit) / 2}
                textAnchor="middle"
                fontSize={isMobile ? 11 : 20}
                fontWeight={700}
                fill="#16a34a"
              >
                Quadrant 1
              </text>
              <text
                x={(chart.xSplit + chart.right) / 2}
                y={(chart.top + chart.ySplit) / 2}
                textAnchor="middle"
                fontSize={isMobile ? 11 : 20}
                fontWeight={700}
                fill="#f97316"
              >
                Quadrant 3
              </text>
              <text
                x={(chart.left + chart.xSplit) / 2}
                y={(chart.ySplit + chart.bottom) / 2}
                textAnchor="middle"
                fontSize={isMobile ? 11 : 20}
                fontWeight={700}
                fill="#f59e0b"
              >
                Quadrant 2
              </text>
              <text
                x={(chart.xSplit + chart.right) / 2}
                y={(chart.ySplit + chart.bottom) / 2}
                textAnchor="middle"
                fontSize={isMobile ? 11 : 20}
                fontWeight={700}
                fill="#ef4444"
              >
                Quadrant 4
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
                    {`${activePoint.jobName}`}
                  </text>
                  <text x={tooltip.x + 10} y={tooltip.y + 40} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                    {`Total Order In: ${Number(activePoint.totalOrders || 0).toLocaleString('id-ID')}`}
                  </text>
                  <text x={tooltip.x + 10} y={tooltip.y + 56} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                    {`Order In Growth: ${activePoint.orderInGrowthPercent >= 0 ? '+' : ''}${activePoint.orderInGrowthPercent.toFixed(2)}%`}
                  </text>
                  <text x={tooltip.x + 10} y={tooltip.y + 72} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                    {`Coverage Area: ${Number(activePoint.areaCount || 0)}`}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        <div className="card">
          <h3>Job Points</h3>
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Job</th>
                <th>Coverage Area</th>
                <th>Total Order In</th>
                <th>Order In Growth %</th>
                <th>Credit Capability %</th>
                <th>Quadrant</th>
                <th>Analysis</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, idx) => (
                <tr key={`${row.job_id || row.job_name}-${idx}`}>
                  <td>{row.job_name || '-'}</td>
                  <td>{Number(row.area_count || 0)}</td>
                  <td>{Number(row.order_in_current_total ?? row.total_orders ?? 0).toLocaleString('id-ID')}</td>
                  <td>{`${getOrderInGrowth(row) >= 0 ? '+' : ''}${getOrderInGrowth(row).toFixed(2)}%`}</td>
                  <td>{row.credit_capability.toFixed(2)}%</td>
                  <td>
                    <span className="badge" style={{ background: quadrantColor(row.quadrant), color: '#fff' }}>
                      Q{row.quadrant}
                    </span>
                  </td>
                  <td style={{ maxWidth: 420, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {buildAnalysisText(row)}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={7}>No data found.</td>
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
