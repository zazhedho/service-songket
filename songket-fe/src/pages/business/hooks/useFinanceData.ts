import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchDealerMetrics,
  fetchDealers,
  fetchFinanceCompanyMetrics,
  fetchFinanceCompanies,
} from '../../../services/businessService'
import { fetchLookups } from '../../../services/lookupService'
import type { CompanySummary } from '../components/financeHelpers'

type UseFinanceDataParams = {
  canView: boolean
  isList: boolean
  isCompanyDetail: boolean
  modeKey: string
  selectedCompanyId?: string
}

export function useFinanceData({
  canView,
  isList,
  isCompanyDetail,
  modeKey,
  selectedCompanyId,
}: UseFinanceDataParams) {
  const [dealers, setDealers] = useState<any[]>([])
  const [financeCompanies, setFinanceCompanies] = useState<any[]>([])
  const [dealerPage, setDealerPage] = useState(1)
  const [dealerLimit, setDealerLimit] = useState(20)
  const [dealerTotalPages, setDealerTotalPages] = useState(1)
  const [dealerTotalData, setDealerTotalData] = useState(0)
  const [financePage, setFinancePage] = useState(1)
  const [financeLimit, setFinanceLimit] = useState(20)
  const [financeTotalPages, setFinanceTotalPages] = useState(1)
  const [financeTotalData, setFinanceTotalData] = useState(0)
  const [dealerFinancePage, setDealerFinancePage] = useState(1)
  const [dealerFinanceLimit, setDealerFinanceLimit] = useState(10)
  const [selectedTransitionFromFinanceID, setSelectedTransitionFromFinanceID] = useState('')
  const [dealerTransitionPage, setDealerTransitionPage] = useState(1)
  const [dealerTransitionLimit, setDealerTransitionLimit] = useState(5)
  const [selectedDealerId, setSelectedDealerId] = useState('')
  const [metrics, setMetrics] = useState<any>(null)
  const [dealerSearch, setDealerSearch] = useState('')
  const [financeSearch, setFinanceSearch] = useState('')
  const [debouncedDealerSearch, setDebouncedDealerSearch] = useState('')
  const [debouncedFinanceSearch, setDebouncedFinanceSearch] = useState('')
  const [dealerProvinceFilter, setDealerProvinceFilter] = useState('')
  const [financeProvinceFilter, setFinanceProvinceFilter] = useState('')
  const [companySummary, setCompanySummary] = useState<CompanySummary | null>(null)
  const [companySummaryLoading, setCompanySummaryLoading] = useState(false)
  const financeCompanyFallbackRef = useRef<any[] | null>(null)

  const loadDealers = async () => {
    const dealerRes = await fetchDealers({
      page: dealerPage,
      limit: dealerLimit,
      search: debouncedDealerSearch || undefined,
      filters: { province: dealerProvinceFilter || undefined },
    })
    const dealerData = dealerRes.data.data || dealerRes.data || []

    setDealers(dealerData)
    setDealerTotalPages(dealerRes.data.total_pages || 1)
    setDealerTotalData(dealerRes.data.total_data || 0)
    setDealerPage(dealerRes.data.current_page || dealerPage)

    if (!selectedDealerId && dealerData.length > 0) {
      setSelectedDealerId(dealerData[0].id)
    }
  }

  const loadFinanceCompanies = async () => {
    const companyRes = await fetchFinanceCompanies({
      page: financePage,
      limit: financeLimit,
      search: debouncedFinanceSearch || undefined,
      filters: { province: financeProvinceFilter || undefined },
    })

    const companyData = companyRes.data.data || companyRes.data || []
    setFinanceCompanies(companyData)
    setFinanceTotalPages(companyRes.data.total_pages || 1)
    setFinanceTotalData(companyRes.data.total_data || 0)
    setFinancePage(companyRes.data.current_page || financePage)

    if (!Array.isArray(companyData) || companyData.length === 0) {
      if (!financeCompanyFallbackRef.current) {
        const lookupRes = await fetchLookups()
        const fallback = lookupRes.data.data?.finance_companies || lookupRes.data?.finance_companies || []
        financeCompanyFallbackRef.current = Array.isArray(fallback) ? fallback : []
      }
      const fallback = financeCompanyFallbackRef.current || []
      setFinanceCompanies(Array.isArray(fallback) ? fallback : [])
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedDealerSearch(dealerSearch)
    }, 250)
    return () => {
      window.clearTimeout(timer)
    }
  }, [dealerSearch])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFinanceSearch(financeSearch)
    }, 250)
    return () => {
      window.clearTimeout(timer)
    }
  }, [financeSearch])

  const reloadBusinessData = async () => {
    if (!canView) return
    try {
      await Promise.all([loadDealers(), loadFinanceCompanies()])
    } catch {
      setDealers([])
      setFinanceCompanies([])
    }
  }

  useEffect(() => {
    if (!canView) {
      setDealers([])
      setFinanceCompanies([])
      setMetrics(null)
      setCompanySummary(null)
      return
    }

    void reloadBusinessData()
  }, [
    canView,
    dealerLimit,
    dealerPage,
    dealerProvinceFilter,
    debouncedDealerSearch,
    financeLimit,
    financePage,
    financeProvinceFilter,
    debouncedFinanceSearch,
    modeKey,
  ])

  useEffect(() => {
    setDealerPage(1)
  }, [dealerSearch, dealerProvinceFilter])

  useEffect(() => {
    setFinancePage(1)
  }, [financeSearch, financeProvinceFilter])

  useEffect(() => {
    if (!selectedDealerId || !isList) {
      setMetrics(null)
      return
    }

    fetchDealerMetrics(selectedDealerId)
      .then((res) => setMetrics(res.data.data || res.data || null))
      .catch(() => setMetrics(null))
  }, [isList, selectedDealerId])

  useEffect(() => {
    if (dealers.length === 0) {
      setSelectedDealerId('')
      return
    }

    if (!selectedDealerId || !dealers.some((item) => item.id === selectedDealerId)) {
      setSelectedDealerId(dealers[0].id)
    }
  }, [dealers, selectedDealerId])

  useEffect(() => {
    if (!isCompanyDetail || !selectedCompanyId) {
      setCompanySummary(null)
      return
    }

    setCompanySummaryLoading(true)
    fetchFinanceCompanyMetrics(selectedCompanyId)
      .then((res) => {
        const payload = (res.data.data || res.data || null) as CompanySummary | null
        setCompanySummary(payload)
      })
      .catch(() => {
        setCompanySummary(null)
      })
      .finally(() => setCompanySummaryLoading(false))
  }, [isCompanyDetail, selectedCompanyId])

  const dealerPoints = useMemo(() => {
    return dealers
      .map((dealer) => ({
        ...dealer,
        _lat: Number(dealer.lat ?? dealer.latitude),
        _lng: Number(dealer.lng ?? dealer.longitude),
      }))
      .filter((dealer) => Number.isFinite(dealer._lat) && Number.isFinite(dealer._lng))
  }, [dealers])

  const currentDealer = dealers.find((dealer) => dealer.id === selectedDealerId)
  const selectedDealerName = currentDealer?.name || '-'
  const currentLat = Number(currentDealer?.lat ?? currentDealer?.latitude)
  const currentLng = Number(currentDealer?.lng ?? currentDealer?.longitude)

  const center: [number, number] =
    Number.isFinite(currentLat) && Number.isFinite(currentLng)
      ? [currentLat, currentLng]
      : dealerPoints.length > 0
        ? [dealerPoints[0]._lat, dealerPoints[0]._lng]
        : [-8.58, 116.12]

  const financeMetricRows = useMemo(() => {
    const rows = Array.isArray(metrics?.finance_companies) ? metrics.finance_companies : []
    return [...rows].sort((a: any, b: any) => Number(b?.total_orders || 0) - Number(a?.total_orders || 0))
  }, [metrics?.finance_companies])

  const financeApprovalTransitionRows = useMemo(() => {
    const rows = Array.isArray(metrics?.finance_approval_transitions) ? metrics.finance_approval_transitions : []
    return [...rows]
      .map((item: any) => ({
        finance_1_company_id: String(item?.finance_1_company_id || ''),
        finance_1_company_name: String(item?.finance_1_company_name || '-'),
        finance_2_company_id: String(item?.finance_2_company_id || ''),
        finance_2_company_name: String(item?.finance_2_company_name || '-'),
        total_data: Number(item?.total_data || 0),
        approved_count: Number(item?.approved_count || 0),
        rejected_count: Number(item?.rejected_count || 0),
        approval_rate: Number(item?.approval_rate || 0),
      }))
      .filter((item) => item.finance_1_company_id && item.finance_2_company_id)
  }, [metrics?.finance_approval_transitions])

  const financeApprovalTransitionSummaryRows = useMemo(() => {
    const rows = Array.isArray(metrics?.finance_approval_transition_summary)
      ? metrics.finance_approval_transition_summary
      : []
    return rows
  }, [metrics?.finance_approval_transition_summary])

  const transitionFromFinanceOptions = useMemo(() => {
    const map = new Map<string, string>()
    financeApprovalTransitionRows.forEach((item: any) => {
      const id = String(item?.finance_1_company_id || '')
      if (!id || map.has(id)) return
      map.set(id, String(item?.finance_1_company_name || '-'))
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [financeApprovalTransitionRows])

  const selectedTransitionFromFinanceName = useMemo(() => {
    const found = transitionFromFinanceOptions.find((item) => item.id === selectedTransitionFromFinanceID)
    return found?.name || '-'
  }, [selectedTransitionFromFinanceID, transitionFromFinanceOptions])

  const filteredTransitionRows = useMemo(() => {
    if (!selectedTransitionFromFinanceID) return []
    return financeApprovalTransitionRows.filter(
      (item: any) => String(item?.finance_1_company_id || '') === selectedTransitionFromFinanceID,
    )
  }, [financeApprovalTransitionRows, selectedTransitionFromFinanceID])

  const financeMetricMaxTotal = useMemo(() => {
    const values = financeMetricRows.map((item: any) => Number(item?.total_orders || 0))
    return Math.max(1, ...values)
  }, [financeMetricRows])

  const dealerFinanceTotalData = financeMetricRows.length
  const dealerFinanceTotalPages = Math.max(1, Math.ceil(dealerFinanceTotalData / dealerFinanceLimit))
  const dealerFinanceRows = useMemo(() => {
    const start = (dealerFinancePage - 1) * dealerFinanceLimit
    return financeMetricRows.slice(start, start + dealerFinanceLimit)
  }, [dealerFinanceLimit, dealerFinancePage, financeMetricRows])

  const dealerTransitionTotalData = filteredTransitionRows.length
  const dealerTransitionTotalPages = Math.max(1, Math.ceil(dealerTransitionTotalData / dealerTransitionLimit))
  const dealerTransitionRows = useMemo(() => {
    const start = (dealerTransitionPage - 1) * dealerTransitionLimit
    return filteredTransitionRows.slice(start, start + dealerTransitionLimit)
  }, [dealerTransitionLimit, dealerTransitionPage, filteredTransitionRows])

  const selectedTransitionSummary = useMemo(() => {
    const summary = financeApprovalTransitionSummaryRows.find(
      (item: any) => String(item?.finance_1_company_id || '') === selectedTransitionFromFinanceID,
    )
    const total = Number(summary?.total_data || 0)
    const approved = Number(summary?.approved_count || 0)
    const rejected = Number(summary?.rejected_count || 0)

    return {
      total,
      approved,
      rejected,
      approvalRate: Number(summary?.approval_rate || 0),
    }
  }, [financeApprovalTransitionSummaryRows, selectedTransitionFromFinanceID])

  useEffect(() => {
    setDealerFinancePage(1)
    setDealerTransitionPage(1)
  }, [selectedDealerId])

  useEffect(() => {
    if (dealerFinancePage > dealerFinanceTotalPages) {
      setDealerFinancePage(dealerFinanceTotalPages)
    }
  }, [dealerFinancePage, dealerFinanceTotalPages])

  useEffect(() => {
    if (transitionFromFinanceOptions.length === 0) {
      setSelectedTransitionFromFinanceID('')
      return
    }

    const hasSelected = transitionFromFinanceOptions.some((item) => item.id === selectedTransitionFromFinanceID)
    if (!hasSelected) {
      setSelectedTransitionFromFinanceID(transitionFromFinanceOptions[0].id)
    }
  }, [selectedTransitionFromFinanceID, transitionFromFinanceOptions])

  useEffect(() => {
    setDealerTransitionPage(1)
  }, [selectedTransitionFromFinanceID])

  useEffect(() => {
    if (dealerTransitionPage > dealerTransitionTotalPages) {
      setDealerTransitionPage(dealerTransitionTotalPages)
    }
  }, [dealerTransitionPage, dealerTransitionTotalPages])

  return {
    companySummary,
    companySummaryLoading,
    center,
    dealerFinanceLimit,
    dealerFinancePage,
    dealerFinanceRows,
    dealerFinanceTotalData,
    dealerFinanceTotalPages,
    dealerLimit,
    dealerPage,
    dealerPoints,
    dealerProvinceFilter,
    dealerSearch,
    dealerTotalData,
    dealerTotalPages,
    dealers,
    filteredTransitionRows,
    financeApprovalTransitionRows,
    financeCompanies,
    financeLimit,
    financeMetricMaxTotal,
    financeMetricRows,
    financePage,
    financeProvinceFilter,
    financeSearch,
    financeTotalData,
    financeTotalPages,
    metrics,
    reloadBusinessData,
    selectedDealerId,
    selectedDealerName,
    selectedTransitionFromFinanceID,
    selectedTransitionFromFinanceName,
    selectedTransitionSummary,
    setDealerFinanceLimit,
    setDealerFinancePage,
    setDealerLimit,
    setDealerPage,
    setDealerProvinceFilter,
    setDealerSearch,
    setFinanceLimit,
    setFinancePage,
    setFinanceProvinceFilter,
    setFinanceSearch,
    setSelectedDealerId,
    setSelectedTransitionFromFinanceID,
    transitionFromFinanceOptions,
  }
}
