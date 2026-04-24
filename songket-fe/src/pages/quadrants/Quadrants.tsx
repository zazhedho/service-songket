import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchQuadrantSummary } from '../../services/quadrantService'
import { useLocationNameResolver } from '../../hooks/useLocationNameResolver'
import { buildFilterYearOptions } from '../../utils/yearOptions'
import QuadrantContent from './components/QuadrantContent'
import { buildAnalysisText, buildAxisTicks, clampPercent, formatAxisPercent, getOrderInGrowth, normalizeToken, quadrantColor } from './components/quadrantHelpers'

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

type QuadrantPoint = {
  id: string
  job_id: string
  job_name: string
  province: string
  regency: string
  province_label: string
  regency_label: string
  area_label: string
  total_orders: number
  order_in_growth_percent: number
  order_in_current_total: number
  order_in_previous_total: number
  credit_capability: number
  quadrant: number
  reference_month?: string
  reference_prev_month?: string
}

type OptionItem = { value: string; label: string }

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

  const yearOptions = useMemo(() => buildFilterYearOptions(2024), [])

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

  const getLocationKey = useCallback((row: QuadrantItem) => `${row.job_id || row.job_name || ''}|${row.province}|${row.regency}`, [])
  const getProvinceValue = useCallback((row: QuadrantItem) => row.province, [])
  const getRegencyValue = useCallback((row: QuadrantItem) => row.regency, [])

  const { displayProvince, displayRegency } = useLocationNameResolver({
    rows: items,
    getKey: getLocationKey,
    getProvince: getProvinceValue,
    getRegency: getRegencyValue,
    normalize: normalizeToken,
  })

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
  }, [items, displayProvince])

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
  }, [items, filter.province, displayRegency])

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
  }, [items, filter, displayProvince, displayRegency])

  const filtered = useMemo<QuadrantPoint[]>(() => {
    const result = filteredAreaRows.map((row, index) => {
      const province = String(row.province || '').trim()
      const regency = String(row.regency || '').trim()
      const provinceLabel = displayProvince(province)
      const regencyLabel = displayRegency(province, regency)
      const areaLabel = [regencyLabel, provinceLabel].filter((item) => item && item !== '-').join(', ') || '-'
      const jobID = String(row.job_id || '').trim()
      const jobName = String(row.job_name || row.job_id || '-').trim() || '-'

      return {
        id: `${jobID || jobName}|${province}|${regency}|${index}`,
        job_id: jobID,
        job_name: jobName,
        province,
        regency,
        province_label: provinceLabel,
        regency_label: regencyLabel,
        area_label: areaLabel,
        total_orders: Number(row.total_orders || 0),
        order_in_growth_percent: Number(row.order_in_growth_percent ?? row.order_in_percent ?? 0),
        order_in_current_total: Number(row.order_in_current_total ?? row.total_orders ?? 0),
        order_in_previous_total: Number(row.order_in_previous_total ?? 0),
        credit_capability: Number(row.credit_capability || 0),
        quadrant: Number(row.quadrant || 0),
        reference_month: row.reference_month,
        reference_prev_month: row.reference_prev_month,
      }
    })

    result.sort((a, b) => {
      if (a.order_in_growth_percent !== b.order_in_growth_percent) return b.order_in_growth_percent - a.order_in_growth_percent
      if (a.credit_capability !== b.credit_capability) return b.credit_capability - a.credit_capability
      return a.job_name.localeCompare(b.job_name)
    })
    return result
  }, [displayProvince, displayRegency, filteredAreaRows])

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
        areaLabel: item.area_label,
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
  }, [filtered, isMobile])

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

      <QuadrantContent
        activePoint={activePoint}
        activePointId={activePointId}
        chart={chart}
        currentYear={currentYear}
        filter={filter}
        filtered={filtered}
        isLoading={isLoading}
        isMobile={isMobile}
        limit={limit}
        loadError={loadError}
        page={page}
        paged={paged}
        provinceOptions={provinceOptions}
        referencePeriod={referencePeriod}
        regencyOptions={regencyOptions}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        setActivePointId={setActivePointId}
        setFilter={setFilter}
        setLimit={setLimit}
        setPage={setPage}
        setSelectedMonth={setSelectedMonth}
        setSelectedYear={setSelectedYear}
        tooltip={tooltip}
        totalPages={totalPages}
        yearOptions={yearOptions}
      />
    </div>
  )
}
