import { useEffect, useMemo, useState } from 'react'
import {
  fetchAllDealerMetrics,
  fetchDealerMetrics,
  fetchDealers,
  fetchFinanceCompanies,
  getFinanceMigrationReportSummary,
  listFinanceMigrationReport,
} from '../../../services/businessService'
import {
  formatDateForQuery,
  normalizeText,
  toSafeNumber,
} from '../components/financeReportHelpers'

const MASTER_DATA_CACHE_TTL_MS = 5 * 60 * 1000
const DEALER_METRICS_CACHE_TTL_MS = 2 * 60 * 1000

type MasterDataCacheValue = {
  dealerRows: DealerRow[]
  dealerOptions: OptionItem[]
  finance1Options: OptionItem[]
}

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

let masterDataCache: CacheEntry<MasterDataCacheValue> | null = null
const dealerMetricsCache = new Map<string, CacheEntry<DealerMetricPayload>>()
const dealerMetricsInflight = new Map<string, Promise<DealerMetricPayload>>()

const emptyMigrationSummary = {
  totalRows: 0,
  totalDataSum: 0,
  totalApproveSum: 0,
  totalRejectSum: 0,
  approvalRate: 0,
}

type FinanceMigrationRow = {
  order_id: string
  province?: string
  regency?: string
  district?: string
  village?: string
  address?: string
  transition_total_data?: number
  total_approve_finance_2?: number
  total_reject_finance_2?: number
}

type OptionItem = {
  code: string
  name: string
}

type DealerRow = {
  id: string
  name: string
  province?: string
  regency?: string
  district?: string
  village?: string
  address?: string
  phone?: string
  lat?: number | string
  lng?: number | string
  latitude?: number | string
  longitude?: number | string
}

type DealerMapPoint = DealerRow & {
  _lat: number
  _lng: number
}

type DealerFinanceMetric = {
  finance_company_id: string
  finance_company_name: string
  total_orders: number
  approved_count?: number
  rejected_count?: number
  approval_rate: number
  lead_time_seconds_avg?: number | null
  rescue_approved_fc2?: number
}

type DealerMetricPayload = {
  total_orders: number
  approval_rate: number
  lead_time_seconds_avg: number
  rescue_approved_fc2: number
  finance_companies: DealerFinanceMetric[]
}

type FinanceReportContext = {
  dealer_id?: string
  month?: string
  year?: string
  finance1?: string
}

type UseFinanceReportSummaryDataParams = {
  canList: boolean
  isDetail: boolean
  stateContext?: FinanceReportContext
}

export function useFinanceReportSummaryData({
  canList,
  isDetail,
  stateContext,
}: UseFinanceReportSummaryDataParams) {
  const [rows, setRows] = useState<FinanceMigrationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalData, setTotalData] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [dealerInput, setDealerInput] = useState('')
  const [monthInput, setMonthInput] = useState('')
  const [yearInput, setYearInput] = useState('')
  const [finance1Input, setFinance1Input] = useState('')
  const [dealer, setDealer] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [finance1, setFinance1] = useState('')
  const [dealerRows, setDealerRows] = useState<DealerRow[]>([])
  const [dealerOptions, setDealerOptions] = useState<OptionItem[]>([])
  const [finance1Options, setFinance1Options] = useState<OptionItem[]>([])
  const [selectedDealerId, setSelectedDealerId] = useState('')
  const [masterLoading, setMasterLoading] = useState(false)
  const [masterError, setMasterError] = useState('')
  const [dealerMetrics, setDealerMetrics] = useState<DealerMetricPayload | null>(null)
  const [dealerMetricsLoading, setDealerMetricsLoading] = useState(false)
  const [dealerMetricsError, setDealerMetricsError] = useState('')
  const [migrationSummary, setMigrationSummary] = useState(emptyMigrationSummary)

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, idx) => String(now - idx))
  }, [])

  const activeDealerId = useMemo(() => {
    if (selectedDealerId) return selectedDealerId
    if (stateContext?.dealer_id) return stateContext.dealer_id
    return ''
  }, [selectedDealerId, stateContext?.dealer_id])

  const activeDealerName = useMemo(() => {
    if (!activeDealerId) return 'All Dealer'
    const found = dealerRows.find((item) => item.id === activeDealerId)
    return normalizeText(found?.name) || 'All Dealer'
  }, [activeDealerId, dealerRows])

  const activeFinance1Name = useMemo(() => {
    if (!finance1) return 'All Finance Company 1'
    const found = finance1Options.find((item) => item.code === finance1)
    return found?.name || 'Finance company 1'
  }, [finance1, finance1Options])

  const dealerMetricRows = useMemo(() => {
    const metricRows = Array.isArray(dealerMetrics?.finance_companies) ? dealerMetrics?.finance_companies : []
    return [...metricRows].sort((a, b) => toSafeNumber(b?.total_orders) - toSafeNumber(a?.total_orders))
  }, [dealerMetrics?.finance_companies])

  const dealerMetricMaxTotal = useMemo(() => {
    const totals = dealerMetricRows.map((item) => toSafeNumber(item.total_orders))
    return Math.max(1, ...totals)
  }, [dealerMetricRows])

  const dealerPoints = useMemo<DealerMapPoint[]>(() => {
    return dealerRows
      .map((dealerItem) => {
        const latRaw = dealerItem.lat ?? dealerItem.latitude
        const lngRaw = dealerItem.lng ?? dealerItem.longitude
        const lat = Number(latRaw)
        const lng = Number(lngRaw)
        return {
          ...dealerItem,
          _lat: lat,
          _lng: lng,
        }
      })
      .filter((dealerItem) => Number.isFinite(dealerItem._lat) && Number.isFinite(dealerItem._lng))
  }, [dealerRows])

  const activeDealerPoint = useMemo(() => {
    if (!activeDealerId) return null
    return dealerPoints.find((dealerItem) => dealerItem.id === activeDealerId) || null
  }, [activeDealerId, dealerPoints])

  const dealerMapZoom = useMemo(() => {
    if (activeDealerPoint) return 6
    if (dealerPoints.length > 0) return 6
    return 5
  }, [activeDealerPoint, dealerPoints.length])

  const dealerMapCenter: [number, number] = useMemo(() => {
    if (activeDealerPoint) return [activeDealerPoint._lat, activeDealerPoint._lng]
    if (dealerPoints.length > 0) return [dealerPoints[0]._lat, dealerPoints[0]._lng]
    return [-2.5489, 118.0149]
  }, [activeDealerPoint, dealerPoints])

  const dealerMetricRange = useMemo(() => {
    const monthNum = Number(month)
    const yearNum = Number(year)
    const nowYear = new Date().getFullYear()

    if (Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12) {
      const safeYear = Number.isFinite(yearNum) && yearNum > 0 ? yearNum : nowYear
      const fromDate = new Date(safeYear, monthNum - 1, 1)
      const toDate = new Date(safeYear, monthNum, 1)
      const from = formatDateForQuery(fromDate)
      const to = formatDateForQuery(toDate)
      return { from, to }
    }

    if (Number.isFinite(yearNum) && yearNum > 0) {
      return {
        from: formatDateForQuery(new Date(yearNum, 0, 1)),
        to: formatDateForQuery(new Date(yearNum + 1, 0, 1)),
      }
    }

    return null
  }, [month, year])

  const loadList = async () => {
    if (!canList) return
    setLoading(true)
    setError('')

    try {
      const params: Record<string, unknown> = {
        page,
        limit,
        order_by: 'finance_2_decision',
        order_direction: 'desc',
      }
      const filters: Record<string, unknown> = {}

      if (finance1) filters.finance_1_company_id = finance1
      if (Object.keys(filters).length > 0) params.filters = filters

      const res = await listFinanceMigrationReport(params)
      const summaryRes = await getFinanceMigrationReportSummary(params)
      const payload = res?.data || {}
      const data = payload?.data || []
      const summaryPayload = summaryRes?.data?.data || summaryRes?.data || {}

      setRows(Array.isArray(data) ? data : [])
      setTotalPages(Number(payload?.total_pages || 1))
      setTotalData(Number(payload?.total_data || 0))
      setPage(Number(payload?.current_page || page))
      setMigrationSummary({
        totalRows: toSafeNumber(summaryPayload?.total_rows),
        totalDataSum: toSafeNumber(summaryPayload?.total_data_sum),
        totalApproveSum: toSafeNumber(summaryPayload?.total_approve_sum),
        totalRejectSum: toSafeNumber(summaryPayload?.total_reject_sum),
        approvalRate: toSafeNumber(summaryPayload?.approval_rate),
      })
    } catch (err: any) {
      setRows([])
      setTotalPages(1)
      setTotalData(0)
      setMigrationSummary(emptyMigrationSummary)
      setError(err?.response?.data?.error || 'Failed to load finance migration report.')
    } finally {
      setLoading(false)
    }
  }

  const loadMasterData = async () => {
    const now = Date.now()
    if (masterDataCache && masterDataCache.expiresAt > now) {
      setDealerRows(masterDataCache.value.dealerRows)
      setDealerOptions(masterDataCache.value.dealerOptions)
      setFinance1Options(masterDataCache.value.finance1Options)
      return
    }

    const [dealerRes, financeRes] = await Promise.all([
      fetchDealers({
        page: 1,
        limit: 500,
        order_by: 'name',
        order_direction: 'asc',
      }),
      fetchFinanceCompanies({
        page: 1,
        limit: 500,
        order_by: 'name',
        order_direction: 'asc',
      }),
    ])

    const dealerRaw = dealerRes?.data?.data || dealerRes?.data || []
    const financeRaw = financeRes?.data?.data || financeRes?.data || []

    const nextDealers: DealerRow[] = Array.isArray(dealerRaw) ? dealerRaw : []
    const nextFinances = Array.isArray(financeRaw) ? financeRaw : []

    const nextDealerOptions: OptionItem[] = nextDealers
      .map((item: any) => ({
        code: normalizeText(item?.id),
        name: normalizeText(item?.name),
      }))
      .filter((item) => item.code && item.name)
      .sort((a, b) => a.name.localeCompare(b.name))

    const nextFinanceOptions: OptionItem[] = nextFinances
      .map((item: any) => ({
        code: normalizeText(item?.id),
        name: normalizeText(item?.name),
      }))
      .filter((item) => item.code && item.name)
      .sort((a, b) => a.name.localeCompare(b.name))

    masterDataCache = {
      value: {
        dealerRows: nextDealers,
        dealerOptions: nextDealerOptions,
        finance1Options: nextFinanceOptions,
      },
      expiresAt: now + MASTER_DATA_CACHE_TTL_MS,
    }

    setDealerRows(nextDealers)
    setDealerOptions(nextDealerOptions)
    setFinance1Options(nextFinanceOptions)
  }

  useEffect(() => {
    if (isDetail) return
    void loadList()
  }, [canList, isDetail, page, limit, finance1])

  useEffect(() => {
    if (!canList || isDetail) return
    let cancelled = false
    setMasterLoading(true)
    setMasterError('')

    loadMasterData()
      .catch((err: any) => {
        if (cancelled) return
        setDealerRows([])
        setDealerOptions([])
        setFinance1Options([])
        setMasterError(err?.response?.data?.error || 'Failed to load dealer/finance data.')
      })
      .finally(() => {
        if (!cancelled) setMasterLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canList, isDetail])

  useEffect(() => {
    if (!selectedDealerId) return
    if (!dealerRows.some((item) => item.id === selectedDealerId)) {
      setSelectedDealerId('')
    }
  }, [dealerRows, selectedDealerId])

  useEffect(() => {
    if (!canList || isDetail) return
    let cancelled = false
    setDealerMetricsLoading(true)
    setDealerMetricsError('')

    const metricsParams = dealerMetricRange ? { from: dealerMetricRange.from, to: dealerMetricRange.to } : undefined

    const loadMetrics = async () => {
      const cacheKey = JSON.stringify({
        activeDealerId: activeDealerId || '',
        from: dealerMetricRange?.from || '',
        to: dealerMetricRange?.to || '',
      })
      const now = Date.now()
      const cached = dealerMetricsCache.get(cacheKey)
      if (cached && cached.expiresAt > now) {
        return cached.value
      }
      const inflight = dealerMetricsInflight.get(cacheKey)
      if (inflight) {
        return inflight
      }

      const request = (async () => {
        const res = activeDealerId
          ? await fetchDealerMetrics(activeDealerId, metricsParams)
          : await fetchAllDealerMetrics(metricsParams)

        return ((res?.data?.data || res?.data || null) as DealerMetricPayload | null) || {
          total_orders: 0,
          approval_rate: 0,
          lead_time_seconds_avg: 0,
          rescue_approved_fc2: 0,
          finance_companies: [],
        }
      })()
      dealerMetricsInflight.set(cacheKey, request)

      try {
        const payload = await request
        dealerMetricsCache.set(cacheKey, {
          value: payload,
          expiresAt: now + DEALER_METRICS_CACHE_TTL_MS,
        })
        return payload
      } finally {
        dealerMetricsInflight.delete(cacheKey)
      }
    }

    loadMetrics()
      .then((payload) => {
        if (cancelled) return
        setDealerMetrics(payload)
      })
      .catch((err: any) => {
        if (cancelled) return
        setDealerMetrics(null)
        setDealerMetricsError(err?.response?.data?.error || 'Failed to load dealer performance.')
      })
      .finally(() => {
        if (!cancelled) setDealerMetricsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeDealerId, canList, dealerMetricRange, isDetail])

  const applyFilters = () => {
    setDealer(dealerInput)
    setMonth(monthInput)
    setYear(yearInput)
    setSelectedDealerId(dealerInput || '')
  }

  const resetFilters = () => {
    setDealerInput('')
    setMonthInput('')
    setYearInput('')
    setDealer('')
    setMonth('')
    setYear('')
    setSelectedDealerId('')
  }

  return {
    activeDealerName,
    activeDealerPoint,
    activeFinance1Name,
    applyFilters,
    dealer,
    dealerInput,
    dealerMapCenter,
    dealerMapZoom,
    dealerMetricMaxTotal,
    dealerMetricRows,
    dealerMetrics,
    dealerMetricsError,
    dealerMetricsLoading,
    dealerOptions,
    dealerPoints,
    dealerRows,
    error,
    finance1,
    finance1Input,
    finance1Options,
    limit,
    loading,
    masterError,
    masterLoading,
    migrationSummary,
    month,
    monthInput,
    page,
    resetFilters,
    rows,
    selectedDealerId,
    setDealer,
    setDealerInput,
    setFinance1,
    setFinance1Input,
    setError,
    setLimit,
    setLoading,
    setMonth,
    setMonthInput,
    setPage,
    setSelectedDealerId,
    setYear,
    setYearInput,
    totalData,
    totalPages,
    year,
    yearInput,
    yearOptions,
  }
}
