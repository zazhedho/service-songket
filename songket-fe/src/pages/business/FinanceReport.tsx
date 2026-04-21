import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchDealerMetrics,
  fetchDealers,
  fetchFinanceCompanies,
  getFinanceMigrationOrderInSummary,
  listFinanceMigrationOrderInDetail,
  listFinanceMigrationReport,
} from '../../services/businessService'
import {
} from '../../services/locationService'
import { useLocationNameResolver } from '../../hooks/useLocationNameResolver'
import { usePermissions } from '../../hooks/usePermissions'
import FinanceReportDetail from './components/FinanceReportDetail'
import FinanceReportSummary from './components/FinanceReportSummary'
import { useFinanceReportSummaryData } from './hooks/useFinanceReportSummaryData'
import {
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
  const { hasPermission } = usePermissions()
  const canList = hasPermission('business', 'list')
  const routeState = (location.state as FinanceReportRouteState | undefined) || undefined
  const stateRow = routeState?.row
  const stateContext = routeState?.context
  const {
    activeDealerName,
    activeDealerPoint,
    activeFinance1Name,
    applyFilters,
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
    finance1Input,
    finance1Options,
    limit,
    loading,
    masterError,
    masterLoading,
    migrationSummary,
    monthInput,
    page,
    resetFilters,
    rows,
    selectedDealerId,
    setDealer,
    setDealerInput,
    setError,
    setFinance1,
    setFinance1Input,
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
    yearInput,
    yearOptions,
  } = useFinanceReportSummaryData({
    canList,
    isDetail,
    stateContext,
  })

  const [detailRow, setDetailRow] = useState<FinanceMigrationRow | null>(null)
  const [locationNamesByOrderId, setLocationNamesByOrderId] = useState<Record<string, LocationNames>>({})
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
      const params: Record<string, unknown> = {
        order_by: 'pooling_at',
        order_direction: 'desc',
      }
      if (stateContext?.month) params.month = Number(stateContext.month)
      if (stateContext?.year) params.year = Number(stateContext.year)
      if (stateContext?.finance1) params.filters = { finance_1_company_id: stateContext.finance1 }
      if (detailOrderInSearch.trim()) params.search = detailOrderInSearch.trim()

      const res = await getFinanceMigrationOrderInSummary(selectedId, params)
      const payload = res?.data?.data || res?.data || {}
      if (!mounted) return
      setDetailFinanceSummary({
        totalOrders: toSafeNumber(payload?.total_orders),
        totalDealers: toSafeNumber(payload?.total_dealers),
        dealerCoveragePercent: toSafeNumber(payload?.dealer_coverage_percent),
        approvedCount: toSafeNumber(payload?.approved_count),
        rejectedCount: toSafeNumber(payload?.rejected_count),
        approvalRate: toSafeNumber(payload?.approval_rate),
        leadAvgSeconds: payload?.lead_avg_seconds == null ? null : toSafeNumber(payload?.lead_avg_seconds),
        rescueFc2: toSafeNumber(payload?.rescue_fc2),
        dealerTotals: Array.isArray(payload?.dealer_totals) ? payload.dealer_totals : [],
        motorTypeTotals: Array.isArray(payload?.motor_type_totals) ? payload.motor_type_totals : [],
      })
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
  const { locationNamesByKey } = useLocationNameResolver({
    rows: sourceRows,
    getKey: (row) => row.order_id,
    getProvince: (row) => row.province,
    getRegency: (row) => row.regency,
    getDistrict: (row) => row.district,
    normalize: normalizeText,
  })

  useEffect(() => {
    setLocationNamesByOrderId(locationNamesByKey)
  }, [locationNamesByKey])

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
