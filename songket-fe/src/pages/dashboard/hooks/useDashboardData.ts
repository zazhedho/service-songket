import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { fetchDashboardSummary, listDashboardNewsItems, listDashboardPrices } from '../../../services/dashboardService'
import { fetchLookups } from '../../../services/lookupService'

export type DashboardAnalysis = 'yearly' | 'monthly' | 'daily' | 'custom'

export type DashboardFilters = {
  area: string
  result_status: string
  analysis: DashboardAnalysis
  month: string
  year: string
  date: string
  from: string
  to: string
  dealer_id: string
  finance_company_id: string
}

type SeriesItem = {
  label: string
  total: number
  percent: number
}

type DailyItem = {
  date: string
  total: number
}

type DailyMotorItem = {
  date: string
  motor_type: string
  total: number
}

type DailyFinanceDecisionByCompanyItem = {
  date: string
  finance_company: string
  approve_total: number
  reject_total: number
}

type OrderDecisionSnapshotItem = {
  label: string
  row_type: 'value' | 'growth'
  order_in: number
  approve: number
  reject: number
  avg_daily_order_in: number
  avg_daily_sales: number
  approve_rate_percent: number
  reject_rate_percent: number
}

type MonthlyItem = {
  month: string
  total: number
  working_days: number
  avg_daily: number
}

type MonthlyMotorItem = {
  month: string
  motor_type: string
  total: number
  working_days: number
  avg_daily: number
}

export type DashboardSummary = {
  total_orders: number
  approved_orders: number
  approval_rate: number
  lead_time_avg_seconds: number
  lead_time_avg_hours: number
  growth: number
  growth_percent: number
  growth_month: string
  growth_prev_month: string
  avg_order_in_daily_m: number
  avg_order_in_daily_prev_m: number
  avg_retail_sales_daily_m: number
  analysis_applied: string
  daily_order_in: DailyItem[]
  daily_retail_sales: DailyItem[]
  daily_finance_reject: DailyItem[]
  daily_finance_decision_by_company: DailyFinanceDecisionByCompanyItem[]
  order_decision_snapshot: OrderDecisionSnapshotItem[]
  daily_order_in_by_motor: DailyMotorItem[]
  monthly_order_in: MonthlyItem[]
  monthly_order_in_by_motor: MonthlyMotorItem[]
  job_proportion: SeriesItem[]
  product_proportion: SeriesItem[]
  finance_company_proportion: SeriesItem[]
  dp_range: SeriesItem[]
}

type DashboardNewsItem = {
  id: string
  title: string
  source_name: string
  published_at: string
  url: string
  images?: unknown
}

type DashboardPriceItem = {
  id: string
  commodity_id?: string
  commodity?: {
    name?: string
    unit?: string
  }
  price: number
  collected_at: string
}

const todayStr = dayjs().format('YYYY-MM-DD')
const oneYearBackStr = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
const currentMonthStr = String(dayjs().month() + 1)
const currentYearStr = String(dayjs().year())

export const defaultFilters: DashboardFilters = {
  area: '',
  result_status: '',
  analysis: 'daily',
  month: currentMonthStr,
  year: currentYearStr,
  date: todayStr,
  from: oneYearBackStr,
  to: todayStr,
  dealer_id: '',
  finance_company_id: '',
}

const emptySummary: DashboardSummary = {
  total_orders: 0,
  approved_orders: 0,
  approval_rate: 0,
  lead_time_avg_seconds: 0,
  lead_time_avg_hours: 0,
  growth: 0,
  growth_percent: 0,
  growth_month: '',
  growth_prev_month: '',
  avg_order_in_daily_m: 0,
  avg_order_in_daily_prev_m: 0,
  avg_retail_sales_daily_m: 0,
  analysis_applied: '',
  daily_order_in: [],
  daily_retail_sales: [],
  daily_finance_reject: [],
  daily_finance_decision_by_company: [],
  order_decision_snapshot: [],
  daily_order_in_by_motor: [],
  monthly_order_in: [],
  monthly_order_in_by_motor: [],
  job_proportion: [],
  product_proportion: [],
  finance_company_proportion: [],
  dp_range: [],
}

export function buildAnchorDateByAnalysis(
  analysis: DashboardAnalysis,
  yearRaw: string,
  monthRaw: string,
  currentDateRaw: string,
) {
  const base = dayjs(currentDateRaw || todayStr)
  const baseDay = base.date()
  const safeYear = Number(yearRaw) > 0 ? Number(yearRaw) : base.year()
  const safeMonth = Number(monthRaw) >= 1 && Number(monthRaw) <= 12 ? Number(monthRaw) : base.month() + 1

  if (analysis === 'monthly') {
    let next = dayjs(`${safeYear}-${String(safeMonth).padStart(2, '0')}-01`)
    const nextDay = Math.min(baseDay, next.daysInMonth())
    next = next.date(nextDay)
    return next.format('YYYY-MM-DD')
  }

  if (analysis === 'yearly') {
    let next = dayjs(`${safeYear}-${String(base.month() + 1).padStart(2, '0')}-01`)
    const nextDay = Math.min(baseDay, next.daysInMonth())
    next = next.date(nextDay)
    return next.format('YYYY-MM-DD')
  }

  return base.format('YYYY-MM-DD')
}

export function resolveGrowthNoteLabel(analysisRaw: string) {
  const analysis = String(analysisRaw || '').toLowerCase()
  if (analysis === 'monthly') return 'M vs M-1'
  if (analysis === 'yearly') return 'YTD vs YTD-1'
  return 'D vs D-1'
}

export function resolveSnapshotPeriodLabel(analysisRaw: string, rowType: OrderDecisionSnapshotItem['row_type'], index: number) {
  if (rowType === 'growth') return 'Growth'
  const analysis = String(analysisRaw || '').toLowerCase()
  const previousLabel = analysis === 'monthly' ? 'M-1' : analysis === 'yearly' ? 'YTD-1' : 'D-1'
  const currentLabel = analysis === 'monthly' ? 'M' : analysis === 'yearly' ? 'YTD' : 'D'
  if (index === 0) return previousLabel
  if (index === 1) return currentLabel
  return `Period ${index + 1}`
}

function resolveDailyChartRange(filters: DashboardFilters, analysisRaw: string) {
  const analysis = String(analysisRaw || filters.analysis || '').toLowerCase()
  const now = dayjs()
  const fallbackDate = now.format('YYYY-MM-DD')
  const safeYear = Number(filters.year) > 0 ? Number(filters.year) : now.year()
  const safeMonth = Number(filters.month) >= 1 && Number(filters.month) <= 12 ? Number(filters.month) : now.month() + 1

  if (analysis === 'custom') {
    const from = dayjs(filters.from || '')
    const to = dayjs(filters.to || '')
    if (from.isValid() && to.isValid()) {
      if (from.isAfter(to, 'day')) {
        return { from: to.format('YYYY-MM-DD'), to: from.format('YYYY-MM-DD') }
      }
      return { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') }
    }
    return { from: '', to: '' }
  }

  if (analysis === 'daily') {
    const anchor = dayjs(filters.date || fallbackDate)
    if (!anchor.isValid()) return { from: '', to: '' }
    const date = anchor.format('YYYY-MM-DD')
    return { from: date, to: date }
  }

  if (analysis === 'yearly') {
    const rawAnchor = dayjs(filters.date || fallbackDate)
    const anchorMonth = rawAnchor.isValid() ? rawAnchor.month() + 1 : now.month() + 1
    const anchorDay = rawAnchor.isValid() ? rawAnchor.date() : now.date()
    let anchor = dayjs(`${safeYear}-${String(anchorMonth).padStart(2, '0')}-01`)
    anchor = anchor.date(Math.min(anchorDay, anchor.daysInMonth()))
    return {
      from: dayjs(`${safeYear}-01-01`).format('YYYY-MM-DD'),
      to: anchor.format('YYYY-MM-DD'),
    }
  }

  if (analysis === 'monthly') {
    let anchor = dayjs(buildAnchorDateByAnalysis('monthly', String(safeYear), String(safeMonth), filters.date || fallbackDate))
    if (!anchor.isValid()) {
      anchor = dayjs(`${safeYear}-${String(safeMonth).padStart(2, '0')}-01`)
    }
    return {
      from: dayjs(`${safeYear}-${String(safeMonth).padStart(2, '0')}-01`).format('YYYY-MM-DD'),
      to: anchor.format('YYYY-MM-DD'),
    }
  }

  return { from: '', to: '' }
}

function normalizeSummary(raw: any): DashboardSummary {
  const safeArray = (value: any) => (Array.isArray(value) ? value : [])
  const toNumber = (value: any) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }

  return {
    total_orders: toNumber(raw?.total_orders),
    approved_orders: toNumber(raw?.approved_orders),
    approval_rate: toNumber(raw?.approval_rate),
    lead_time_avg_seconds: toNumber(raw?.lead_time_avg_seconds),
    lead_time_avg_hours: toNumber(raw?.lead_time_avg_hours),
    growth: toNumber(raw?.growth),
    growth_percent: toNumber(raw?.growth_percent),
    growth_month: String(raw?.growth_month || ''),
    growth_prev_month: String(raw?.growth_prev_month || ''),
    avg_order_in_daily_m: toNumber(raw?.avg_order_in_daily_m),
    avg_order_in_daily_prev_m: toNumber(raw?.avg_order_in_daily_prev_m),
    avg_retail_sales_daily_m: toNumber(raw?.avg_retail_sales_daily_m),
    analysis_applied: String(raw?.analysis_applied || ''),
    daily_order_in: safeArray(raw?.daily_order_in).map((item: any) => ({
      date: String(item?.date || ''),
      total: toNumber(item?.total),
    })),
    daily_retail_sales: safeArray(raw?.daily_retail_sales).map((item: any) => ({
      date: String(item?.date || ''),
      total: toNumber(item?.total),
    })),
    daily_finance_reject: safeArray(raw?.daily_finance_reject).map((item: any) => ({
      date: String(item?.date || ''),
      total: toNumber(item?.total),
    })),
    daily_finance_decision_by_company: safeArray(raw?.daily_finance_decision_by_company).map((item: any) => ({
      date: String(item?.date || ''),
      finance_company: String(item?.finance_company || '-'),
      approve_total: toNumber(item?.approve_total),
      reject_total: toNumber(item?.reject_total),
    })),
    order_decision_snapshot: safeArray(raw?.order_decision_snapshot).map((item: any) => ({
      label: String(item?.label || '-'),
      row_type: String(item?.row_type || '').toLowerCase() === 'growth' ? 'growth' : 'value',
      order_in: toNumber(item?.order_in),
      approve: toNumber(item?.approve),
      reject: toNumber(item?.reject),
      avg_daily_order_in: toNumber(item?.avg_daily_order_in),
      avg_daily_sales: toNumber(item?.avg_daily_sales),
      approve_rate_percent: toNumber(item?.approve_rate_percent),
      reject_rate_percent: toNumber(item?.reject_rate_percent),
    })),
    daily_order_in_by_motor: safeArray(raw?.daily_order_in_by_motor).map((item: any) => ({
      date: String(item?.date || ''),
      motor_type: String(item?.motor_type || item?.motor_type_name || '-'),
      total: toNumber(item?.total),
    })),
    monthly_order_in: safeArray(raw?.monthly_order_in).map((item: any) => ({
      month: String(item?.month || ''),
      total: toNumber(item?.total),
      working_days: toNumber(item?.working_days),
      avg_daily: toNumber(item?.avg_daily),
    })),
    monthly_order_in_by_motor: safeArray(raw?.monthly_order_in_by_motor).map((item: any) => ({
      month: String(item?.month || ''),
      motor_type: String(item?.motor_type || item?.motor_type_name || '-'),
      total: toNumber(item?.total),
      working_days: toNumber(item?.working_days),
      avg_daily: toNumber(item?.avg_daily),
    })),
    job_proportion: safeArray(raw?.job_proportion).map((item: any) => ({
      label: String(item?.label || '-'),
      total: toNumber(item?.total),
      percent: toNumber(item?.percent),
    })),
    product_proportion: safeArray(raw?.product_proportion).map((item: any) => ({
      label: String(item?.label || '-'),
      total: toNumber(item?.total),
      percent: toNumber(item?.percent),
    })),
    finance_company_proportion: safeArray(raw?.finance_company_proportion).map((item: any) => ({
      label: String(item?.label || '-'),
      total: toNumber(item?.total),
      percent: toNumber(item?.percent),
    })),
    dp_range: safeArray(raw?.dp_range).map((item: any) => ({
      label: String(item?.label || '-'),
      total: toNumber(item?.total),
      percent: toNumber(item?.percent),
    })),
  }
}

function extractNewsThumbnail(raw: unknown): string {
  let data: any = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      data = {}
    }
  }

  const main = typeof data?.foto_utama === 'string' ? data.foto_utama.trim() : ''
  if (main) return main

  const list = Array.isArray(data?.dalam_berita)
    ? data.dalam_berita.filter((item: unknown) => typeof item === 'string' && item.trim())
    : []
  return list.length > 0 ? String(list[0]) : ''
}

function getCommodityKey(item: DashboardPriceItem): string {
  const commodityId = String(item?.commodity_id || '').trim()
  if (commodityId) return commodityId
  return String(item?.commodity?.name || '').trim().toLowerCase()
}

type DailyTrendSeries = {
  labels: string[]
  values: number[]
  tooltipDetails: string[]
}

type DailyFinanceDecisionSeries = {
  labels: string[]
  approveValues: number[]
  rejectValues: number[]
  tooltipDetails: string[]
  tooltipExtraLines: string[][]
}

function formatChartNumber(value: number) {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('id-ID')
  if (Math.abs(value) >= 100) return Math.round(value).toString()
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(1)
}

function buildDailyTrendSeries({
  rows,
  from,
  to,
}: {
  rows: DailyItem[]
  from: string
  to: string
}): DailyTrendSeries {
  const grouped = new Map<string, number>()
  rows.forEach((item) => {
    const parsedDate = dayjs(item.date)
    if (!parsedDate.isValid()) return
    const key = parsedDate.format('YYYY-MM-DD')
    grouped.set(key, (grouped.get(key) || 0) + Number(item.total || 0))
  })

  let startDate: ReturnType<typeof dayjs> | null = null
  let endDate: ReturnType<typeof dayjs> | null = null
  if (from && to) {
    const parsedFrom = dayjs(from)
    const parsedTo = dayjs(to)
    if (parsedFrom.isValid() && parsedTo.isValid()) {
      startDate = parsedFrom.startOf('day')
      endDate = parsedTo.startOf('day')
      if (endDate.isBefore(startDate, 'day')) {
        startDate = parsedTo.startOf('day')
        endDate = parsedFrom.startOf('day')
      }
    }
  }

  if (!startDate || !endDate) {
    const sortedDates = Array.from(grouped.keys()).sort()
    if (sortedDates.length === 0) {
      return { labels: [], values: [], tooltipDetails: [] }
    }
    const latestDate = dayjs(sortedDates[sortedDates.length - 1])
    if (!latestDate.isValid()) {
      return { labels: [], values: [], tooltipDetails: [] }
    }
    endDate = latestDate.startOf('day')
    startDate = endDate.subtract(6, 'day')
  }

  const values: number[] = []
  const labels: string[] = []
  const tooltipDetails: string[] = []
  let cursor = startDate
  while (!cursor.isAfter(endDate, 'day')) {
    const key = cursor.format('YYYY-MM-DD')
    values.push(grouped.get(key) || 0)
    labels.push(cursor.format('DD MMM'))
    tooltipDetails.push(cursor.format('DD MMM YYYY'))
    cursor = cursor.add(1, 'day')
  }

  return {
    labels,
    values,
    tooltipDetails,
  }
}

function buildDailyFinanceDecisionSeries({
  approveRows,
  rejectRows,
  companyRows,
  from,
  to,
}: {
  approveRows: DailyItem[]
  rejectRows: DailyItem[]
  companyRows: DailyFinanceDecisionByCompanyItem[]
  from: string
  to: string
}): DailyFinanceDecisionSeries {
  const approveByDate = new Map<string, number>()
  approveRows.forEach((item) => {
    const parsedDate = dayjs(item.date)
    if (!parsedDate.isValid()) return
    const key = parsedDate.format('YYYY-MM-DD')
    approveByDate.set(key, (approveByDate.get(key) || 0) + Number(item.total || 0))
  })

  const rejectByDate = new Map<string, number>()
  rejectRows.forEach((item) => {
    const parsedDate = dayjs(item.date)
    if (!parsedDate.isValid()) return
    const key = parsedDate.format('YYYY-MM-DD')
    rejectByDate.set(key, (rejectByDate.get(key) || 0) + Number(item.total || 0))
  })

  const companyByDate = new Map<string, { approve: Array<{ name: string; total: number }>; reject: Array<{ name: string; total: number }> }>()
  companyRows.forEach((item) => {
    const parsedDate = dayjs(item.date)
    if (!parsedDate.isValid()) return
    const dateKey = parsedDate.format('YYYY-MM-DD')
    const companyName = String(item.finance_company || '-').trim() || '-'
    const bucket = companyByDate.get(dateKey) || { approve: [], reject: [] }
    const approveTotal = Number(item.approve_total || 0)
    const rejectTotal = Number(item.reject_total || 0)
    if (approveTotal > 0) {
      bucket.approve.push({ name: companyName, total: approveTotal })
    }
    if (rejectTotal > 0) {
      bucket.reject.push({ name: companyName, total: rejectTotal })
    }
    companyByDate.set(dateKey, bucket)
  })

  let startDate: ReturnType<typeof dayjs> | null = null
  let endDate: ReturnType<typeof dayjs> | null = null
  if (from && to) {
    const parsedFrom = dayjs(from)
    const parsedTo = dayjs(to)
    if (parsedFrom.isValid() && parsedTo.isValid()) {
      startDate = parsedFrom.startOf('day')
      endDate = parsedTo.startOf('day')
      if (endDate.isBefore(startDate, 'day')) {
        startDate = parsedTo.startOf('day')
        endDate = parsedFrom.startOf('day')
      }
    }
  }

  if (!startDate || !endDate) {
    const keys = Array.from(new Set([...approveByDate.keys(), ...rejectByDate.keys()])).sort()
    if (keys.length === 0) {
      return { labels: [], approveValues: [], rejectValues: [], tooltipDetails: [], tooltipExtraLines: [] }
    }
    const latestDate = dayjs(keys[keys.length - 1])
    if (!latestDate.isValid()) {
      return { labels: [], approveValues: [], rejectValues: [], tooltipDetails: [], tooltipExtraLines: [] }
    }
    endDate = latestDate.startOf('day')
    startDate = endDate.subtract(6, 'day')
  }

  const labels: string[] = []
  const approveValues: number[] = []
  const rejectValues: number[] = []
  const tooltipDetails: string[] = []
  const tooltipExtraLines: string[][] = []

  const summarizeCompanies = (items: Array<{ name: string; total: number }>) => {
    if (!items.length) return ''
    const sorted = [...items].sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      return a.name.localeCompare(b.name)
    })
    const top = sorted.slice(0, 2).map((item) => `${item.name}(${formatChartNumber(item.total)})`).join(', ')
    const remaining = sorted.length - 2
    return remaining > 0 ? `${top} +${remaining} lainnya` : top
  }

  let cursor = startDate
  while (!cursor.isAfter(endDate, 'day')) {
    const key = cursor.format('YYYY-MM-DD')
    labels.push(cursor.format('DD MMM'))
    tooltipDetails.push(cursor.format('DD MMM YYYY'))
    approveValues.push(approveByDate.get(key) || 0)
    rejectValues.push(rejectByDate.get(key) || 0)
    const companyBucket = companyByDate.get(key) || { approve: [], reject: [] }
    const extraLines: string[] = []
    const approveSummary = summarizeCompanies(companyBucket.approve)
    const rejectSummary = summarizeCompanies(companyBucket.reject)
    if (approveSummary) extraLines.push(`Approve FC: ${approveSummary}`)
    if (rejectSummary) extraLines.push(`Reject FC: ${rejectSummary}`)
    tooltipExtraLines.push(extraLines)
    cursor = cursor.add(1, 'day')
  }

  return {
    labels,
    approveValues,
    rejectValues,
    tooltipDetails,
    tooltipExtraLines,
  }
}

export function useDashboardData() {
  const [filtersInput, setFiltersInput] = useState<DashboardFilters>(defaultFilters)
  const [filtersApplied, setFiltersApplied] = useState<DashboardFilters>(defaultFilters)
  const [lookups, setLookups] = useState<any>({})
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [latestNews, setLatestNews] = useState<DashboardNewsItem[]>([])
  const [latestPrices, setLatestPrices] = useState<DashboardPriceItem[]>([])
  const [latestCardsLoading, setLatestCardsLoading] = useState(false)
  const [activeNewsIndex, setActiveNewsIndex] = useState(0)
  const [selectedTrendCommodity, setSelectedTrendCommodity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dashboardSummaryRequestIdRef = useRef(0)

  useEffect(() => {
    let isActive = true
    fetchLookups()
      .then((res) => {
        if (!isActive) return
        setLookups(res.data?.data || res.data || {})
      })
      .catch(() => {
        if (!isActive) return
        setLookups({})
      })
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true
    setLatestCardsLoading(true)
    Promise.all([
      listDashboardNewsItems({ page: 1, limit: 5, order_by: 'published_at', order_direction: 'desc' }),
      listDashboardPrices({ page: 1, limit: 200, order_by: 'collected_at', order_direction: 'desc' }),
    ])
      .then(([newsRes, priceRes]) => {
        if (!isActive) return
        const newsPayload = newsRes?.data || {}
        const pricePayload = priceRes?.data || {}
        const newsRows = Array.isArray(newsPayload?.data) ? newsPayload.data : []
        const priceRows = Array.isArray(pricePayload?.data) ? pricePayload.data : []
        setLatestNews(newsRows as DashboardNewsItem[])
        setLatestPrices(priceRows as DashboardPriceItem[])
      })
      .catch(() => {
        if (!isActive) return
        setLatestNews([])
        setLatestPrices([])
      })
      .finally(() => {
        if (!isActive) return
        setLatestCardsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (latestNews.length === 0) {
      setActiveNewsIndex(0)
      return
    }
    setActiveNewsIndex((prev) => (prev >= latestNews.length ? 0 : prev))
  }, [latestNews.length])

  useEffect(() => {
    if (latestNews.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveNewsIndex((prev) => (prev + 1) % latestNews.length)
    }, 5000)
    return () => {
      window.clearInterval(timer)
    }
  }, [latestNews.length])

  useEffect(() => {
    const controller = new AbortController()
    const requestId = dashboardSummaryRequestIdRef.current + 1
    dashboardSummaryRequestIdRef.current = requestId
    const params: Record<string, unknown> = {}
    if (filtersApplied.area) params.area = filtersApplied.area
    if (filtersApplied.result_status) params.result_status = filtersApplied.result_status
    if (filtersApplied.dealer_id) params.dealer_id = filtersApplied.dealer_id
    if (filtersApplied.finance_company_id) params.finance_company_id = filtersApplied.finance_company_id
    params.analysis = filtersApplied.analysis
    if (filtersApplied.analysis === 'yearly') {
      if (filtersApplied.year) params.year = Number(filtersApplied.year)
      if (filtersApplied.date) params.date = filtersApplied.date
    } else if (filtersApplied.analysis === 'monthly') {
      if (filtersApplied.year) params.year = Number(filtersApplied.year)
      if (filtersApplied.month) params.month = Number(filtersApplied.month)
      if (filtersApplied.date) params.date = filtersApplied.date
    } else if (filtersApplied.analysis === 'daily') {
      if (filtersApplied.date) params.date = filtersApplied.date
    } else if (filtersApplied.analysis === 'custom') {
      if (filtersApplied.from) params.from = filtersApplied.from
      if (filtersApplied.to) params.to = filtersApplied.to
    }

    setLoading(true)
    setError('')
    fetchDashboardSummary(params, { signal: controller.signal })
      .then((res) => {
        if (dashboardSummaryRequestIdRef.current !== requestId) return
        const payload = res.data?.data || res.data || {}
        setSummary(normalizeSummary(payload))
      })
      .catch((err: any) => {
        if (controller.signal.aborted || dashboardSummaryRequestIdRef.current !== requestId) return
        setSummary(emptySummary)
        setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard summary.')
      })
      .finally(() => {
        if (controller.signal.aborted || dashboardSummaryRequestIdRef.current !== requestId) return
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [filtersApplied])

  const areaOptions = useMemo(() => {
    const dashboardAreas = Array.isArray(lookups?.dashboard_areas) ? lookups.dashboard_areas : []
    if (dashboardAreas.length > 0) {
      const optionByValue = new Map<string, { value: string; label: string }>()
      dashboardAreas.forEach((item: any) => {
        const value = String(item?.value || '').trim().toLowerCase()
        const label = String(item?.label || '').trim()
        if (!value || !label) return
        if (label.toLowerCase() === 'all area') return
        if (!optionByValue.has(value)) optionByValue.set(value, { value, label })
      })
      return Array.from(optionByValue.values()).sort((a, b) => a.label.localeCompare(b.label))
    }

    const regencies = Array.isArray(lookups?.regencies) ? lookups.regencies : []
    const dealers = Array.isArray(lookups?.dealers) ? lookups.dealers : []
    const rawAreas = [
      ...regencies.map((item: any) => String(item || '').trim()),
      ...dealers.map((dealer: any) => String(dealer?.regency || '').trim()),
    ].filter(Boolean)

    const mappedByLabel = new Map<string, { value: string; label: string }>()
    rawAreas.forEach((rawArea) => {
      const value = rawArea.toLowerCase()
      const label = rawArea
      const labelKey = label.toLowerCase()
      if (labelKey === 'all area') return
      if (/^\d+$/.test(label)) return
      if (!mappedByLabel.has(labelKey)) mappedByLabel.set(labelKey, { value, label })
    })

    return Array.from(mappedByLabel.values())
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [lookups?.dashboard_areas, lookups?.dealers, lookups?.regencies])

  const dealerOptions = useMemo(() => {
    const dealers = Array.isArray(lookups?.dealers) ? lookups.dealers : []
    return dealers
      .map((dealer: any) => ({ value: String(dealer?.id || ''), label: String(dealer?.name || '') }))
      .filter((item) => item.value && item.label)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [lookups?.dealers])

  const financeOptions = useMemo(() => {
    const rows = Array.isArray(lookups?.finance_companies) ? lookups.finance_companies : []
    return rows
      .map((item: any) => ({ value: String(item?.id || ''), label: String(item?.name || '') }))
      .filter((item) => item.value && item.label)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [lookups?.finance_companies])

  const yearOptions = useMemo(() => {
    const lookupYearsRaw = Array.isArray(lookups?.dashboard_years) ? lookups.dashboard_years : []
    const lookupYears = lookupYearsRaw
      .map((value: any) => Number(value))
      .filter((value: number) => Number.isFinite(value) && value > 0)
      .map((value: number) => Math.trunc(value))

    const currentYear = new Date().getFullYear()
    const fallbackMinYear = 1900
    const fallbackMaxYear = currentYear + 5
    const maxLookupYear = lookupYears.length > 0 ? Math.max(...lookupYears) : fallbackMaxYear
    const minLookupYear = lookupYears.length > 0 ? Math.min(...lookupYears) : fallbackMinYear
    const minYear = Math.min(fallbackMinYear, minLookupYear)
    const maxYear = Math.max(fallbackMaxYear, maxLookupYear, currentYear)

    const years: string[] = []
    for (let year = maxYear; year >= minYear; year -= 1) {
      years.push(String(year))
    }
    return years
  }, [lookups?.dashboard_years])

  const dailyChartRange = useMemo(
    () => resolveDailyChartRange(filtersApplied, summary.analysis_applied),
    [filtersApplied, summary.analysis_applied],
  )

  const dailyDistributionTrend = useMemo(
    () =>
      buildDailyTrendSeries({
        rows: summary.daily_order_in,
        from: dailyChartRange.from,
        to: dailyChartRange.to,
      }),
    [dailyChartRange.from, dailyChartRange.to, summary.daily_order_in],
  )

  const dailyFinanceDecisionTrend = useMemo(
    () =>
      buildDailyFinanceDecisionSeries({
        approveRows: summary.daily_retail_sales,
        rejectRows: summary.daily_finance_reject,
        companyRows: summary.daily_finance_decision_by_company,
        from: dailyChartRange.from,
        to: dailyChartRange.to,
      }),
    [
      dailyChartRange.from,
      dailyChartRange.to,
      summary.daily_finance_decision_by_company,
      summary.daily_finance_reject,
      summary.daily_retail_sales,
    ],
  )

  const growthNote = useMemo(
    () => resolveGrowthNoteLabel(summary.analysis_applied || filtersApplied.analysis),
    [summary.analysis_applied, filtersApplied.analysis],
  )

  const activeNewsItem = latestNews[activeNewsIndex] || null
  const activeNewsThumb = useMemo(
    () => (activeNewsItem ? extractNewsThumbnail(activeNewsItem.images) : ''),
    [activeNewsItem],
  )

  const trendCommodityOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>()
    latestPrices.forEach((item) => {
      const key = getCommodityKey(item)
      const label = String(item?.commodity?.name || '').trim()
      if (!key || !label || map.has(key)) return
      map.set(key, { value: key, label })
    })
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [latestPrices])

  useEffect(() => {
    setSelectedTrendCommodity((prev) => {
      if (trendCommodityOptions.length === 0) return ''
      return trendCommodityOptions.some((item) => item.value === prev)
        ? prev
        : trendCommodityOptions[0].value
    })
  }, [trendCommodityOptions])

  const selectedPriceRows = useMemo(() => {
    if (!selectedTrendCommodity) return latestPrices
    return latestPrices.filter((item) => getCommodityKey(item) === selectedTrendCommodity)
  }, [latestPrices, selectedTrendCommodity])

  const latestPriceTableRows = useMemo(() => selectedPriceRows.slice(0, 5), [selectedPriceRows])

  const priceTrend = useMemo(() => {
    const grouped = new Map<string, { date: string; sum: number; count: number }>()
    selectedPriceRows.forEach((item) => {
      const date = item.collected_at ? dayjs(item.collected_at).format('YYYY-MM-DD') : ''
      if (!date) return
      const bucket = grouped.get(date) || { date, sum: 0, count: 0 }
      bucket.sum += Number(item.price || 0)
      bucket.count += 1
      grouped.set(date, bucket)
    })

    const rows = Array.from(grouped.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    return {
      dates: rows.map((item) => item.date),
      labels: rows.map((item) => dayjs(item.date).format('DD MMM')),
      values: rows.map((item) => (item.count > 0 ? item.sum / item.count : 0)),
    }
  }, [selectedPriceRows])

  const applyFilters = () => {
    if (filtersInput.analysis === 'custom') {
      const from = dayjs(filtersInput.from)
      const to = dayjs(filtersInput.to)
      if (from.isValid() && to.isValid() && to.isBefore(from, 'day')) {
        setFiltersApplied({ ...filtersInput, from: to.format('YYYY-MM-DD'), to: from.format('YYYY-MM-DD') })
        return
      }
    }
    setFiltersApplied(filtersInput)
  }

  const resetFilters = () => {
    setFiltersInput(defaultFilters)
    setFiltersApplied(defaultFilters)
  }

  return {
    activeNewsIndex,
    activeNewsItem,
    activeNewsThumb,
    applyFilters,
    areaOptions,
    dailyDistributionTrend,
    dailyFinanceDecisionTrend,
    error,
    filtersApplied,
    filtersInput,
    financeOptions,
    growthNote,
    latestCardsLoading,
    latestNews,
    latestPriceTableRows,
    loading,
    priceTrend,
    resetFilters,
    selectedTrendCommodity,
    setActiveNewsIndex,
    setFiltersInput,
    setSelectedTrendCommodity,
    summary,
    trendCommodityOptions,
    yearOptions,
    dealerOptions,
  }
}
