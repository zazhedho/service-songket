import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import {
  fetchDealerMetrics,
  fetchDealers,
  fetchFinanceCompanies,
  listFinanceMigrationOrderInDetail,
  listFinanceMigrationReport,
} from '../../services/businessService'
import {
  fetchKabupaten,
  fetchKecamatan,
  fetchProvinces,
} from '../../services/locationService'
import { useAuth } from '../../store'
import FinanceReportDetail from './components/FinanceReportDetail'
import FinanceReportSummary from './components/FinanceReportSummary'
import {
  buildDetailFinanceSummary,
  buildDonutGradient,
  buildDonutSlices,
  formatCoordinate,
  formatDateForQuery,
  formatDateTime,
  formatLeadTimeHours,
  lookupOptionName,
  normalizeText,
  ReportDetailTable,
  statusBadge,
  summarizeLocation,
  toSafeNumber,
  truncateTableText,
  type DetailFinanceSummary,
  type DonutSlice,
  type SummaryBucket,
} from './components/financeReportHelpers'

type FinanceMigrationRow = {
  order_id: string
  pooling_number: string
  pooling_at: string
  result_at?: string
  dealer_order_total?: number
  transition_total_data?: number
  dealer_name: string
  dealer_province?: string
  dealer_regency?: string
  dealer_district?: string
  dealer_village?: string
  dealer_address?: string
  consumer_name: string
  consumer_phone: string
  province: string
  regency: string
  district: string
  village: string
  address: string
  job_name: string
  net_income?: number
  motor_type_name: string
  installment_amount?: number
  otr: number
  dp_gross: number
  dp_paid: number
  dp_pct: number
  tenor: number
  order_result_status: string
  order_result_notes: string
  finance_1_name: string
  finance_1_status: string
  finance_1_notes?: string
  finance_2_name: string
  finance_2_status: string
  finance_2_notes: string
  total_approve_finance_2?: number
  total_reject_finance_2?: number
  order_created_at?: string
  order_updated_at?: string
  finance_1_decision_at?: string
  finance_2_decision_at?: string
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

type LocationNames = {
  province: string
  regency: string
  district: string
}

type FinanceReportRouteState = {
  row?: FinanceMigrationRow
  context?: {
    dealer_id?: string
    month?: string
    year?: string
    finance1?: string
  }
}

export default function FinanceReportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const selectedId = params.id || ''
  const isDetail = Boolean(selectedId)
  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_finance_dealers')
  const routeState = (location.state as FinanceReportRouteState | undefined) || undefined
  const stateRow = routeState?.row
  const stateContext = routeState?.context

  const [rows, setRows] = useState<FinanceMigrationRow[]>([])
  const [detailRow, setDetailRow] = useState<FinanceMigrationRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationNamesByOrderId, setLocationNamesByOrderId] = useState<Record<string, LocationNames>>({})

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
  const [detailOrderInRows, setDetailOrderInRows] = useState<FinanceMigrationRow[]>([])
  const [detailOrderInLoading, setDetailOrderInLoading] = useState(false)
  const [detailOrderInError, setDetailOrderInError] = useState('')
  const [detailOrderInPage, setDetailOrderInPage] = useState(1)
  const [detailOrderInLimit, setDetailOrderInLimit] = useState(10)
  const [detailOrderInTotalData, setDetailOrderInTotalData] = useState(0)
  const [detailOrderInTotalPages, setDetailOrderInTotalPages] = useState(1)
  const [detailOrderInSearchInput, setDetailOrderInSearchInput] = useState('')
  const [detailOrderInSearch, setDetailOrderInSearch] = useState('')
  const [selectedOrderInRow, setSelectedOrderInRow] = useState<FinanceMigrationRow | null>(null)
  const [detailFinanceSummary, setDetailFinanceSummary] = useState<DetailFinanceSummary | null>(null)
  const [detailFinanceSummaryLoading, setDetailFinanceSummaryLoading] = useState(false)
  const [detailFinanceSummaryError, setDetailFinanceSummaryError] = useState('')

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
    const rows = Array.isArray(dealerMetrics?.finance_companies) ? dealerMetrics?.finance_companies : []
    return [...rows].sort((a, b) => toSafeNumber(b?.total_orders) - toSafeNumber(a?.total_orders))
  }, [dealerMetrics?.finance_companies])

  const dealerMetricMaxTotal = useMemo(() => {
    const totals = dealerMetricRows.map((item) => toSafeNumber(item.total_orders))
    return Math.max(1, ...totals)
  }, [dealerMetricRows])

  const migrationSummary = useMemo(() => {
    const totalRows = rows.length
    const totalDataSum = rows.reduce((sum, row) => sum + toSafeNumber(row.transition_total_data), 0)
    const totalApproveSum = rows.reduce((sum, row) => sum + toSafeNumber(row.total_approve_finance_2), 0)
    const totalRejectSum = rows.reduce((sum, row) => sum + toSafeNumber(row.total_reject_finance_2), 0)
    const approvalRate = totalDataSum > 0 ? (totalApproveSum / totalDataSum) * 100 : 0
    return {
      totalRows,
      totalDataSum,
      totalApproveSum,
      totalRejectSum,
      approvalRate,
    }
  }, [rows])

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
      const payload = res?.data || {}
      const data = payload?.data || []

      setRows(Array.isArray(data) ? data : [])
      setTotalPages(Number(payload?.total_pages || 1))
      setTotalData(Number(payload?.total_data || 0))
      setPage(Number(payload?.current_page || page))
    } catch (err: any) {
      setRows([])
      setTotalPages(1)
      setTotalData(0)
      setError(err?.response?.data?.error || 'Failed to load finance migration report.')
    } finally {
      setLoading(false)
    }
  }

  const loadMasterData = async () => {
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
      .then(() => {
        if (cancelled) return
      })
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
      if (activeDealerId) {
        const res = await fetchDealerMetrics(activeDealerId, metricsParams)
        return (res?.data?.data || res?.data || null) as DealerMetricPayload | null
      }

      const dealerIds = dealerRows.map((item) => normalizeText(item.id)).filter(Boolean)
      if (dealerIds.length === 0) {
        return {
          total_orders: 0,
          approval_rate: 0,
          lead_time_seconds_avg: 0,
          rescue_approved_fc2: 0,
          finance_companies: [],
        } as DealerMetricPayload
      }

      const settled = await Promise.allSettled(dealerIds.map((dealerId) => fetchDealerMetrics(dealerId, metricsParams)))
      const companyMap = new Map<
      string,
      {
        finance_company_id: string
        finance_company_name: string
        total_orders: number
        approved_count: number
        rejected_count: number
        rescue_approved_fc2: number
        lead_weight_sum: number
        lead_weight_count: number
      }
      >()

      let totalOrders = 0
      let totalApproved = 0
      let totalRescue = 0
      let leadWeightSum = 0
      let leadWeightCount = 0

      settled.forEach((result) => {
        if (result.status !== 'fulfilled') return
        const payload = (result.value?.data?.data || result.value?.data || null) as DealerMetricPayload | null
        const rows = Array.isArray(payload?.finance_companies) ? payload?.finance_companies : []

        rows.forEach((item) => {
          const financeCompanyID = normalizeText(item?.finance_company_id) || normalizeText(item?.finance_company_name) || 'unknown'
          const financeCompanyName = normalizeText(item?.finance_company_name) || '-'
          const total = toSafeNumber(item?.total_orders)
          const approvedRaw = toSafeNumber(item?.approved_count)
          const rejectedRaw = toSafeNumber(item?.rejected_count)
          const approved = approvedRaw > 0 || rejectedRaw > 0
            ? approvedRaw
            : Math.max(0, Math.min(total, Math.round(toSafeNumber(item?.approval_rate) * total)))
          const rejected = approvedRaw > 0 || rejectedRaw > 0
            ? rejectedRaw
            : Math.max(0, total - approved)
          const rescue = toSafeNumber(item?.rescue_approved_fc2)
          const lead = Number(item?.lead_time_seconds_avg)

          const current = companyMap.get(financeCompanyID) || {
            finance_company_id: financeCompanyID,
            finance_company_name: financeCompanyName,
            total_orders: 0,
            approved_count: 0,
            rejected_count: 0,
            rescue_approved_fc2: 0,
            lead_weight_sum: 0,
            lead_weight_count: 0,
          }

          current.total_orders += total
          current.approved_count += approved
          current.rejected_count += rejected
          current.rescue_approved_fc2 += rescue
          if (Number.isFinite(lead) && total > 0) {
            current.lead_weight_sum += lead * total
            current.lead_weight_count += total
          }
          companyMap.set(financeCompanyID, current)

          totalOrders += total
          totalApproved += approved
          totalRescue += rescue
          if (Number.isFinite(lead) && total > 0) {
            leadWeightSum += lead * total
            leadWeightCount += total
          }
        })
      })

      const financeCompanies: DealerFinanceMetric[] = Array.from(companyMap.values())
        .map((item) => ({
          finance_company_id: item.finance_company_id,
          finance_company_name: item.finance_company_name,
          total_orders: item.total_orders,
          approved_count: item.approved_count,
          rejected_count: item.rejected_count,
          approval_rate: item.total_orders > 0 ? item.approved_count / item.total_orders : 0,
          lead_time_seconds_avg: item.lead_weight_count > 0 ? item.lead_weight_sum / item.lead_weight_count : null,
          rescue_approved_fc2: item.rescue_approved_fc2,
        }))
        .sort((a, b) => toSafeNumber(b.total_orders) - toSafeNumber(a.total_orders))

      return {
        total_orders: totalOrders,
        approval_rate: totalOrders > 0 ? totalApproved / totalOrders : 0,
        lead_time_seconds_avg: leadWeightCount > 0 ? leadWeightSum / leadWeightCount : 0,
        rescue_approved_fc2: totalRescue,
        finance_companies: financeCompanies,
      } as DealerMetricPayload
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
  }, [activeDealerId, canList, dealerMetricRange, dealerRows, isDetail])

  useEffect(() => {
    if (!canList || !isDetail || !selectedId) return

    let mounted = true
    setLoading(true)
    setError('')

    if (stateRow && stateRow.order_id === selectedId) {
      setDetailRow(stateRow)
    }

    listFinanceMigrationReport({
      page: 1,
      limit: 1,
      filters: { order_id: selectedId },
      order_by: 'pooling_at',
      order_direction: 'desc',
    })
      .then((res) => {
        if (!mounted) return
        const payload = res?.data || {}
        const data = payload?.data || []
        const row = Array.isArray(data) && data.length > 0 ? data[0] : null
        setDetailRow(row || (stateRow && stateRow.order_id === selectedId ? stateRow : null))
      })
      .catch((err: any) => {
        if (!mounted) return
        setDetailRow(stateRow && stateRow.order_id === selectedId ? stateRow : null)
        setError(err?.response?.data?.error || 'Failed to load finance migration detail.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [canList, isDetail, selectedId, stateRow])

  useEffect(() => {
    if (!isDetail) return
    setDetailOrderInSearchInput('')
    setDetailOrderInSearch('')
    setDetailOrderInPage(1)
    setSelectedOrderInRow(null)
    setDetailFinanceSummary(null)
    setDetailFinanceSummaryError('')
  }, [isDetail, selectedId])

  useEffect(() => {
    if (!canList || !isDetail || !selectedId) return
    let mounted = true

    setDetailOrderInLoading(true)
    setDetailOrderInError('')

    const params: Record<string, unknown> = {
      page: detailOrderInPage,
      limit: detailOrderInLimit,
      order_by: 'pooling_at',
      order_direction: 'desc',
    }
    if (stateContext?.month) params.month = Number(stateContext.month)
    if (stateContext?.year) params.year = Number(stateContext.year)
    if (stateContext?.finance1) params.filters = { finance_1_company_id: stateContext.finance1 }
    if (detailOrderInSearch.trim()) params.search = detailOrderInSearch.trim()

    listFinanceMigrationOrderInDetail(selectedId, params)
      .then((res) => {
        if (!mounted) return
        const payload = res?.data || {}
        const data = Array.isArray(payload?.data) ? payload.data : []
        setDetailOrderInRows(data as FinanceMigrationRow[])
        setDetailOrderInTotalPages(Number(payload?.total_pages || 1))
        setDetailOrderInTotalData(Number(payload?.total_data || 0))
        setDetailOrderInPage(Number(payload?.current_page || detailOrderInPage))
      })
      .catch((err: any) => {
        if (!mounted) return
        setDetailOrderInRows([])
        setDetailOrderInTotalPages(1)
        setDetailOrderInTotalData(0)
        setDetailOrderInError(err?.response?.data?.error || 'Failed to load order in detail data.')
      })
      .finally(() => {
        if (mounted) setDetailOrderInLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [
    canList,
    isDetail,
    selectedId,
    detailOrderInPage,
    detailOrderInLimit,
    detailOrderInSearch,
    stateContext?.finance1,
    stateContext?.month,
    stateContext?.year,
  ])

  useEffect(() => {
    if (detailOrderInPage > detailOrderInTotalPages) {
      setDetailOrderInPage(detailOrderInTotalPages)
    }
  }, [detailOrderInPage, detailOrderInTotalPages])

  useEffect(() => {
    if (!canList || !isDetail || !selectedId) return
    let mounted = true
    setDetailFinanceSummaryLoading(true)
    setDetailFinanceSummaryError('')

    const loadSummary = async () => {
      const limitPerPage = 200
      const maxPages = 120
      const collected: FinanceMigrationRow[] = []
      let nextPage = 1
      let totalPagesRemote = 1

      while (nextPage <= totalPagesRemote && nextPage <= maxPages) {
        const params: Record<string, unknown> = {
          page: nextPage,
          limit: limitPerPage,
          order_by: 'pooling_at',
          order_direction: 'desc',
        }
        if (stateContext?.month) params.month = Number(stateContext.month)
        if (stateContext?.year) params.year = Number(stateContext.year)
        if (stateContext?.finance1) params.filters = { finance_1_company_id: stateContext.finance1 }
        if (detailOrderInSearch.trim()) params.search = detailOrderInSearch.trim()

        const res = await listFinanceMigrationOrderInDetail(selectedId, params)
        const payload = res?.data || {}
        const data = Array.isArray(payload?.data) ? (payload.data as FinanceMigrationRow[]) : []
        totalPagesRemote = Number(payload?.total_pages || totalPagesRemote)
        collected.push(...data)
        nextPage += 1
      }

      if (!mounted) return
      setDetailFinanceSummary(buildDetailFinanceSummary(collected))

      if (nextPage <= totalPagesRemote) {
        setDetailFinanceSummaryError('Summary is partial due to data volume limit.')
      }
    }

    loadSummary()
      .catch((err: any) => {
        if (!mounted) return
        setDetailFinanceSummary(null)
        setDetailFinanceSummaryError(err?.response?.data?.error || 'Failed to load finance summary.')
      })
      .finally(() => {
        if (mounted) setDetailFinanceSummaryLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [canList, isDetail, selectedId, detailOrderInSearch, stateContext?.finance1, stateContext?.month, stateContext?.year])

  const sourceRows = useMemo(() => {
    if (isDetail) {
      const rowMap: Record<string, FinanceMigrationRow> = {}
      detailOrderInRows.forEach((row) => {
        rowMap[row.order_id] = row
      })
      if (detailRow && !rowMap[detailRow.order_id]) {
        rowMap[detailRow.order_id] = detailRow
      }
      return Object.values(rowMap)
    }
    return rows
  }, [detailOrderInRows, detailRow, isDetail, rows])

  useEffect(() => {
    let mounted = true

    const resolveLocationNames = async () => {
      if (!sourceRows.length) {
        if (mounted) setLocationNamesByOrderId({})
        return
      }

      let provinceOptions: OptionItem[] = []
      try {
        const provRes = await fetchProvinces()
        const raw = provRes.data?.data || provRes.data || []
        provinceOptions = Array.isArray(raw) ? raw : []
      } catch {
        provinceOptions = []
      }

      const kabupatenCache: Record<string, OptionItem[]> = {}
      const kecamatanCache: Record<string, OptionItem[]> = {}
      const nextMap: Record<string, LocationNames> = {}

      for (const item of sourceRows) {
        const provinceCode = normalizeText(item.province)
        const regencyCode = normalizeText(item.regency)
        const districtCode = normalizeText(item.district)

        const provinceName = lookupOptionName(provinceOptions, provinceCode)

        let regencyName = regencyCode || '-'
        if (provinceCode) {
          if (!kabupatenCache[provinceCode]) {
            try {
              const kabRes = await fetchKabupaten(provinceCode)
              const rawKab = kabRes.data?.data || kabRes.data || []
              kabupatenCache[provinceCode] = Array.isArray(rawKab) ? rawKab : []
            } catch {
              kabupatenCache[provinceCode] = []
            }
          }
          regencyName = lookupOptionName(kabupatenCache[provinceCode], regencyCode)
        }

        let districtName = districtCode || '-'
        if (provinceCode && regencyCode) {
          const cacheKey = `${provinceCode}::${regencyCode}`
          if (!kecamatanCache[cacheKey]) {
            try {
              const kecRes = await fetchKecamatan(provinceCode, regencyCode)
              const rawKec = kecRes.data?.data || kecRes.data || []
              kecamatanCache[cacheKey] = Array.isArray(rawKec) ? rawKec : []
            } catch {
              kecamatanCache[cacheKey] = []
            }
          }
          districtName = lookupOptionName(kecamatanCache[cacheKey], districtCode)
        }

        nextMap[item.order_id] = {
          province: provinceName,
          regency: regencyName,
          district: districtName,
        }
      }

      if (mounted) {
        setLocationNamesByOrderId(nextMap)
      }
    }

    void resolveLocationNames()
    return () => {
      mounted = false
    }
  }, [sourceRows])

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

  const applyDetailOrderInFilters = () => {
    setDetailOrderInSearch(detailOrderInSearchInput)
    setDetailOrderInPage(1)
  }

  const resetDetailOrderInFilters = () => {
    setDetailOrderInSearchInput('')
    setDetailOrderInSearch('')
    setDetailOrderInPage(1)
  }

  if (!canList) {
    return (
      <div className="page">
        <div className="card" style={{ minWidth: 0 }}>
          <h3>Report Finance</h3>
          <div className="alert">No access permission for finance migration report.</div>
        </div>
      </div>
    )
  }

  if (isDetail) {
    return (
      <FinanceReportDetail
        applyDetailOrderInFilters={applyDetailOrderInFilters}
        buildDetailFinanceSummary={buildDetailFinanceSummary}
        buildDonutGradient={buildDonutGradient}
        buildDonutSlices={buildDonutSlices}
        detailFinanceSummary={detailFinanceSummary}
        detailFinanceSummaryError={detailFinanceSummaryError}
        detailFinanceSummaryLoading={detailFinanceSummaryLoading}
        detailOrderInError={detailOrderInError}
        detailOrderInLimit={detailOrderInLimit}
        detailOrderInLoading={detailOrderInLoading}
        detailOrderInPage={detailOrderInPage}
        detailOrderInRows={detailOrderInRows}
        detailOrderInSearchInput={detailOrderInSearchInput}
        detailOrderInTotalData={detailOrderInTotalData}
        detailOrderInTotalPages={detailOrderInTotalPages}
        detailRow={detailRow}
        error={error}
        formatDateTime={formatDateTime}
        loading={loading}
        locationNamesByOrderId={locationNamesByOrderId}
        navigate={navigate}
        resetDetailOrderInFilters={resetDetailOrderInFilters}
        selectedOrderInRow={selectedOrderInRow}
        setDetailOrderInLimit={setDetailOrderInLimit}
        setDetailOrderInPage={setDetailOrderInPage}
        setDetailOrderInSearchInput={setDetailOrderInSearchInput}
        setSelectedOrderInRow={setSelectedOrderInRow}
        statusBadge={statusBadge}
        truncateTableText={truncateTableText}
      />
    )
  }

  return (
    <FinanceReportSummary
      activeDealerName={activeDealerName}
      activeDealerPoint={activeDealerPoint}
      activeFinance1Name={activeFinance1Name}
      applyFilters={applyFilters}
      dealerInput={dealerInput}
      dealerMapCenter={dealerMapCenter}
      dealerMapZoom={dealerMapZoom}
      dealerMetricMaxTotal={dealerMetricMaxTotal}
      dealerMetricRows={dealerMetricRows}
      dealerMetrics={dealerMetrics}
      dealerMetricsError={dealerMetricsError}
      dealerMetricsLoading={dealerMetricsLoading}
      dealerOptions={dealerOptions}
      dealerPoints={dealerPoints}
      dealerRows={dealerRows}
      error={error}
      finance1Input={finance1Input}
      finance1Options={finance1Options}
      loading={loading}
      limit={limit}
      masterError={masterError}
      masterLoading={masterLoading}
      migrationSummary={migrationSummary}
      monthInput={monthInput}
      navigate={navigate}
      page={page}
      resetFilters={resetFilters}
      rows={rows}
      selectedDealerId={selectedDealerId}
      setDealer={setDealer}
      setDealerInput={setDealerInput}
      setFinance1={setFinance1}
      setFinance1Input={setFinance1Input}
      setLimit={setLimit}
      setMonth={setMonth}
      setMonthInput={setMonthInput}
      setPage={setPage}
      setSelectedDealerId={setSelectedDealerId}
      setYear={setYear}
      setYearInput={setYearInput}
      statusBadge={statusBadge}
      summarizeLocation={summarizeLocation}
      toSafeNumber={toSafeNumber}
      totalData={totalData}
      totalPages={totalPages}
      truncateTableText={truncateTableText}
      yearInput={yearInput}
      yearOptions={yearOptions}
      formatCoordinate={formatCoordinate}
      formatLeadTimeHours={formatLeadTimeHours}
    />
  )
}
