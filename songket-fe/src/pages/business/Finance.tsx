import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import {
  createDealer,
  createFinanceCompany,
  deleteDealer,
  deleteFinanceCompany,
  fetchDealerMetrics,
  fetchDealers,
  fetchFinanceCompanies,
  updateDealer,
  updateFinanceCompany,
} from '../../services/businessService'
import {
  fetchKabupaten,
  fetchKecamatan,
  fetchProvinces,
} from '../../services/locationService'
import { fetchLookups } from '../../services/lookupService'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuth } from '../../store'
import DealerDetail from './components/DealerDetail'
import CompanyDetail from './components/CompanyDetail'
import DealerForm from './components/DealerForm'
import CompanyForm from './components/CompanyForm'
import FinanceList from './components/FinanceList'
import {
  type CompanyDealerRow,
  type CompanyLocationNames,
  type CompanySummary,
  type DealerForm,
  type DealerLocationNames,
  type FinanceForm,
  type Option,
  INDONESIA_CENTER,
  findOptionCodeByNames,
  findOptionCodeByValue,
  firstFilled,
  formatDealerLocationSummary,
  hasRegionAddressFields,
  initialDealerForm,
  initialFinanceForm,
  lookupOptionName,
  parseCoordinateValue,
  parseFinanceMode,
  resolveOptionNameValue,
  roundCoordinate,
  splitDisplayAddressSegments,
} from './components/financeHelpers'

export default function FinancePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseFinanceMode(location.pathname)
  const selectedId = params.id || ''

  const isList = mode === 'list'
  const isDealerCreate = mode === 'dealer_create'
  const isDealerEdit = mode === 'dealer_edit'
  const isDealerDetail = mode === 'dealer_detail'
  const isCompanyCreate = mode === 'company_create'
  const isCompanyEdit = mode === 'company_edit'
  const isCompanyDetail = mode === 'company_detail'

  const isBusinessTabMode = location.pathname.startsWith('/business')
  const listSection: 'dealer' | 'finance' = (
    location.pathname.startsWith('/dealer') || location.pathname.startsWith('/business/dealer')
  ) ? 'dealer' : 'finance'
  const dealerBasePath = isBusinessTabMode ? '/business/dealer' : '/dealer'
  const financeBasePath = isBusinessTabMode ? '/business/finance' : '/finance'

  const perms = useAuth((s) => s.permissions)
  const canView = perms.includes('list_finance_dealers')
  const canManage = canView
  const confirm = useConfirm()

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

  const [selectedDealerId, setSelectedDealerId] = useState<string>('')
  const [metrics, setMetrics] = useState<any>(null)
  const [dealerSearch, setDealerSearch] = useState('')
  const [financeSearch, setFinanceSearch] = useState('')
  const [dealerProvinceFilter, setDealerProvinceFilter] = useState('')
  const [financeProvinceFilter, setFinanceProvinceFilter] = useState('')

  const [provinces, setProvinces] = useState<Option[]>([])
  const [dealerKabupaten, setDealerKabupaten] = useState<Option[]>([])
  const [dealerKecamatan, setDealerKecamatan] = useState<Option[]>([])
  const [financeKabupaten, setFinanceKabupaten] = useState<Option[]>([])
  const [financeKecamatan, setFinanceKecamatan] = useState<Option[]>([])

  const [dealerForm, setDealerForm] = useState<DealerForm>(initialDealerForm)
  const [financeForm, setFinanceForm] = useState<FinanceForm>(initialFinanceForm)
  const [savingDealer, setSavingDealer] = useState(false)
  const [savingFinance, setSavingFinance] = useState(false)
  const [locatingDealerAddress, setLocatingDealerAddress] = useState(false)
  const dealerLocationReqRef = useRef(0)
  const dealerKabupatenCacheRef = useRef<Record<string, Option[]>>({})
  const dealerKecamatanCacheRef = useRef<Record<string, Option[]>>({})
  const [dealerLocationNameMap, setDealerLocationNameMap] = useState<Record<string, DealerLocationNames>>({})
  const [financeCompanyLocationNameMap, setFinanceCompanyLocationNameMap] = useState<Record<string, CompanyLocationNames>>({})

  const [companySummary, setCompanySummary] = useState<CompanySummary | null>(null)
  const [companySummaryLoading, setCompanySummaryLoading] = useState(false)
  const [detailDealerKabupaten, setDetailDealerKabupaten] = useState<Option[]>([])
  const [detailDealerKecamatan, setDetailDealerKecamatan] = useState<Option[]>([])
  const [detailCompanyKabupaten, setDetailCompanyKabupaten] = useState<Option[]>([])
  const [detailCompanyKecamatan, setDetailCompanyKecamatan] = useState<Option[]>([])

  const stateDealer = (location.state as any)?.dealer || null
  const stateCompany = (location.state as any)?.company || null

  const loadDealers = async () => {
    const dealerRes = await fetchDealers({
      page: dealerPage,
      limit: dealerLimit,
      search: dealerSearch || undefined,
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
    const [companyRes, lookupRes] = await Promise.all([
      fetchFinanceCompanies({
        page: financePage,
        limit: financeLimit,
        search: financeSearch || undefined,
        filters: { province: financeProvinceFilter || undefined },
      }),
      fetchLookups(),
    ])

    const companyData = companyRes.data.data || companyRes.data || []
    setFinanceCompanies(companyData)
    setFinanceTotalPages(companyRes.data.total_pages || 1)
    setFinanceTotalData(companyRes.data.total_data || 0)
    setFinancePage(companyRes.data.current_page || financePage)

    if (!Array.isArray(companyData) || companyData.length === 0) {
      const fallback = lookupRes.data.data?.finance_companies || lookupRes.data?.finance_companies || []
      setFinanceCompanies(Array.isArray(fallback) ? fallback : [])
    }
  }

  const loadBaseData = async () => {
    if (!canView) return
    try {
      const [provRes] = await Promise.all([fetchProvinces(), loadDealers(), loadFinanceCompanies()])
      setProvinces(provRes.data.data || provRes.data || [])
    } catch {
      setProvinces([])
      setDealers([])
      setFinanceCompanies([])
    }
  }

  useEffect(() => {
    void loadBaseData()
  }, [
    canView,
    dealerLimit,
    dealerPage,
    dealerProvinceFilter,
    dealerSearch,
    financeLimit,
    financePage,
    financeProvinceFilter,
    financeSearch,
    mode,
  ])

  useEffect(() => {
    setDealerPage(1)
  }, [dealerSearch])

  useEffect(() => {
    setDealerPage(1)
  }, [dealerProvinceFilter])

  useEffect(() => {
    setFinancePage(1)
  }, [financeSearch])

  useEffect(() => {
    setFinancePage(1)
  }, [financeProvinceFilter])

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

  const selectedDealer = useMemo(() => {
    if (!selectedId) return null
    return dealers.find((dealer) => dealer.id === selectedId) || (stateDealer?.id === selectedId ? stateDealer : null)
  }, [dealers, selectedId, stateDealer])

  const selectedCompany = useMemo(() => {
    if (!selectedId) return null
    return financeCompanies.find((company) => company.id === selectedId) || (stateCompany?.id === selectedId ? stateCompany : null)
  }, [financeCompanies, selectedId, stateCompany])

  useEffect(() => {
    if (!isDealerDetail || !selectedDealer?.province) {
      setDetailDealerKabupaten([])
      setDetailDealerKecamatan([])
      return
    }

    fetchKabupaten(String(selectedDealer.province))
      .then((res) => {
        const kabupaten = res.data.data || res.data || []
        setDetailDealerKabupaten(kabupaten)
        if (!selectedDealer?.regency) {
          setDetailDealerKecamatan([])
          return
        }
        return fetchKecamatan(String(selectedDealer.province), String(selectedDealer.regency))
          .then((kecRes) => setDetailDealerKecamatan(kecRes.data.data || kecRes.data || []))
          .catch(() => setDetailDealerKecamatan([]))
      })
      .catch(() => {
        setDetailDealerKabupaten([])
        setDetailDealerKecamatan([])
      })
  }, [isDealerDetail, selectedDealer?.province, selectedDealer?.regency])

  useEffect(() => {
    if (!isCompanyDetail || !selectedCompany?.province) {
      setDetailCompanyKabupaten([])
      setDetailCompanyKecamatan([])
      return
    }

    fetchKabupaten(String(selectedCompany.province))
      .then((res) => {
        const kabupaten = res.data.data || res.data || []
        setDetailCompanyKabupaten(kabupaten)
        if (!selectedCompany?.regency) {
          setDetailCompanyKecamatan([])
          return
        }
        return fetchKecamatan(String(selectedCompany.province), String(selectedCompany.regency))
          .then((kecRes) => setDetailCompanyKecamatan(kecRes.data.data || kecRes.data || []))
          .catch(() => setDetailCompanyKecamatan([]))
      })
      .catch(() => {
        setDetailCompanyKabupaten([])
        setDetailCompanyKecamatan([])
      })
  }, [isCompanyDetail, selectedCompany?.province, selectedCompany?.regency])

  useEffect(() => {
    if (!isCompanyDetail || !selectedCompany?.id || dealers.length === 0) {
      setCompanySummary(null)
      return
    }

    setCompanySummaryLoading(true)
    Promise.all(
      dealers.map(async (dealer) => {
        try {
          const res = await fetchDealerMetrics(dealer.id)
          const data = res.data.data || res.data || {}
          const rows = Array.isArray(data.finance_companies) ? data.finance_companies : []
          const row = rows.find((fc: any) => fc.finance_company_id === selectedCompany.id)
          if (!row) return null

          return {
            dealer_id: dealer.id,
            dealer_name: dealer.name || '-',
            total_orders: Number(row.total_orders || 0),
            approval_rate: Number(row.approval_rate || 0),
            lead_time_seconds_avg:
              row.lead_time_seconds_avg == null ? null : Number(row.lead_time_seconds_avg),
            rescue_approved_fc2: Number(row.rescue_approved_fc2 || 0),
          } as CompanyDealerRow
        } catch {
          return null
        }
      }),
    )
      .then((results) => {
        const rows = results.filter((item): item is CompanyDealerRow => item !== null)

        const totalOrders = rows.reduce((sum, item) => sum + item.total_orders, 0)
        const approvedCount = rows.reduce((sum, item) => sum + item.approval_rate * item.total_orders, 0)
        const rescueCount = rows.reduce((sum, item) => sum + item.rescue_approved_fc2, 0)

        let leadWeight = 0
        let leadTotal = 0
        rows.forEach((item) => {
          if (item.lead_time_seconds_avg != null && item.total_orders > 0) {
            leadWeight += item.lead_time_seconds_avg * item.total_orders
            leadTotal += item.total_orders
          }
        })

        const summary: CompanySummary = {
          total_orders: totalOrders,
          approval_rate: totalOrders > 0 ? approvedCount / totalOrders : 0,
          lead_time_seconds_avg: leadTotal > 0 ? leadWeight / leadTotal : null,
          rescue_approved_fc2: rescueCount,
          active_dealers: rows.filter((item) => item.total_orders > 0).length,
          dealer_rows: rows.sort((a, b) => b.total_orders - a.total_orders),
        }

        setCompanySummary(summary)
      })
      .finally(() => setCompanySummaryLoading(false))
  }, [dealers, isCompanyDetail, selectedCompany?.id])

  const dealerPoints = useMemo(() => {
    return dealers
      .map((dealer) => ({ ...dealer, _lat: Number(dealer.lat ?? dealer.latitude), _lng: Number(dealer.lng ?? dealer.longitude) }))
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

  const selectedDealerProvinceName = lookupOptionName(provinces, selectedDealer?.province)
  const selectedDealerRegencyName = lookupOptionName(detailDealerKabupaten, selectedDealer?.regency)
  const selectedDealerDistrictName = lookupOptionName(detailDealerKecamatan, selectedDealer?.district)
  const selectedCompanyProvinceName = lookupOptionName(provinces, selectedCompany?.province)
  const selectedCompanyRegencyName = lookupOptionName(detailCompanyKabupaten, selectedCompany?.regency)
  const selectedCompanyDistrictName = lookupOptionName(detailCompanyKecamatan, selectedCompany?.district)

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
  const dealerTransitionTotalPages = Math.max(
    1,
    Math.ceil(dealerTransitionTotalData / dealerTransitionLimit),
  )
  const dealerTransitionRows = useMemo(() => {
    const start = (dealerTransitionPage - 1) * dealerTransitionLimit
    return filteredTransitionRows.slice(start, start + dealerTransitionLimit)
  }, [dealerTransitionLimit, dealerTransitionPage, filteredTransitionRows])

  const selectedTransitionSummary = useMemo(() => {
    const total = filteredTransitionRows.reduce((sum, item: any) => sum + Number(item?.total_data || 0), 0)
    const approved = filteredTransitionRows.reduce((sum, item: any) => sum + Number(item?.approved_count || 0), 0)
    const rejected = filteredTransitionRows.reduce((sum, item: any) => sum + Number(item?.rejected_count || 0), 0)
    return {
      total,
      approved,
      rejected,
      approvalRate: total > 0 ? approved / total : 0,
    }
  }, [filteredTransitionRows])

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

  const dealerFormLat = parseCoordinateValue(dealerForm.lat)
  const dealerFormLng = parseCoordinateValue(dealerForm.lng)
  const dealerFormHasCoordinate = Number.isFinite(dealerFormLat) && Number.isFinite(dealerFormLng)
  const dealerFormFallbackCenter: [number, number] = isDealerCreate ? INDONESIA_CENTER : center
  const dealerFormCenter: [number, number] = dealerFormHasCoordinate ? [dealerFormLat, dealerFormLng] : dealerFormFallbackCenter
  const dealerFormZoom = dealerFormHasCoordinate ? 12 : isDealerCreate ? 5 : 8

  const setDealerCoordinates = (lat: number, lng: number) => {
    setDealerForm((prev) => ({
      ...prev,
      lat: String(roundCoordinate(lat)),
      lng: String(roundCoordinate(lng)),
    }))
  }

  const fetchKabupatenByProvinceCode = async (provinceCode: string) => {
    if (!provinceCode) return []
    const cached = dealerKabupatenCacheRef.current[provinceCode]
    if (cached) return cached

    try {
      const kabRes = await fetchKabupaten(provinceCode)
      const list = kabRes.data.data || kabRes.data || []
      dealerKabupatenCacheRef.current[provinceCode] = Array.isArray(list) ? list : []
      return dealerKabupatenCacheRef.current[provinceCode]
    } catch {
      dealerKabupatenCacheRef.current[provinceCode] = []
      return []
    }
  }

  const fetchKecamatanByProvinceRegencyCode = async (provinceCode: string, regencyCode: string) => {
    if (!provinceCode || !regencyCode) return []
    const cacheKey = `${provinceCode}::${regencyCode}`
    const cached = dealerKecamatanCacheRef.current[cacheKey]
    if (cached) return cached

    try {
      const kecRes = await fetchKecamatan(provinceCode, regencyCode)
      const list = kecRes.data.data || kecRes.data || []
      dealerKecamatanCacheRef.current[cacheKey] = Array.isArray(list) ? list : []
      return dealerKecamatanCacheRef.current[cacheKey]
    } catch {
      dealerKecamatanCacheRef.current[cacheKey] = []
      return []
    }
  }

  useEffect(() => {
    let mounted = true

    const resolveDealerLocationNames = async () => {
      if (!dealers.length) {
        if (mounted) setDealerLocationNameMap({})
        return
      }

      let provinceOptions = provinces
      if (!provinceOptions.length) {
        try {
          const provRes = await fetchProvinces()
          provinceOptions = provRes.data.data || provRes.data || []
          if (mounted) {
            setProvinces(provinceOptions)
          }
        } catch {
          provinceOptions = []
        }
      }

      const kabupatenByProvince: Record<string, Option[]> = {}
      const kecamatanByRegency: Record<string, Option[]> = {}
      const uniqueProvinceCodes = Array.from(
        new Set(
          dealers
            .map((dealer) => String(dealer?.province || '').trim())
            .filter(Boolean),
        ),
      )
      await Promise.all(
        uniqueProvinceCodes.map(async (provinceCode) => {
          kabupatenByProvince[provinceCode] = await fetchKabupatenByProvinceCode(provinceCode)
        }),
      )

      const uniqueRegencyKeys = Array.from(
        new Set(
          dealers
            .map((dealer) => {
              const provinceCode = String(dealer?.province || '').trim()
              const regencyCode = String(dealer?.regency || '').trim()
              return provinceCode && regencyCode ? `${provinceCode}::${regencyCode}` : ''
            })
            .filter(Boolean),
        ),
      )
      await Promise.all(
        uniqueRegencyKeys.map(async (key) => {
          const [provinceCode, regencyCode] = key.split('::')
          kecamatanByRegency[key] = await fetchKecamatanByProvinceRegencyCode(provinceCode, regencyCode)
        }),
      )

      const nextMap: Record<string, DealerLocationNames> = {}
      dealers.forEach((dealer) => {
        const dealerId = String(dealer?.id || '').trim()
        if (!dealerId) return

        const provinceCode = String(dealer?.province || '').trim()
        const regencyCode = String(dealer?.regency || '').trim()
        const districtCode = String(dealer?.district || '').trim()

        const provinceName = lookupOptionName(provinceOptions, provinceCode)
        const regencyName = provinceCode
          ? lookupOptionName(kabupatenByProvince[provinceCode] || [], regencyCode)
          : lookupOptionName([], regencyCode)
        const districtName = provinceCode && regencyCode
          ? lookupOptionName(kecamatanByRegency[`${provinceCode}::${regencyCode}`] || [], districtCode)
          : lookupOptionName([], districtCode)

        nextMap[dealerId] = {
          province: provinceName,
          regency: regencyName,
          district: districtName,
        }
      })

      if (mounted) {
        setDealerLocationNameMap(nextMap)
      }
    }

    void resolveDealerLocationNames()
    return () => {
      mounted = false
    }
  }, [dealers, provinces])

  useEffect(() => {
    let mounted = true

    const resolveFinanceCompanyLocationNames = async () => {
      if (!financeCompanies.length) {
        if (mounted) setFinanceCompanyLocationNameMap({})
        return
      }

      const kabupatenByProvince: Record<string, Option[]> = {}
      const uniqueProvinceCodes = Array.from(
        new Set(
          financeCompanies
            .map((company) => String(company?.province || '').trim())
            .filter(Boolean),
        ),
      )

      await Promise.all(
        uniqueProvinceCodes.map(async (provinceCode) => {
          kabupatenByProvince[provinceCode] = await fetchKabupatenByProvinceCode(provinceCode)
        }),
      )

      const nextMap: Record<string, CompanyLocationNames> = {}
      financeCompanies.forEach((company) => {
        const companyID = String(company?.id || '').trim()
        if (!companyID) return

        const provinceCode = String(company?.province || '').trim()
        const regencyCode = String(company?.regency || '').trim()
        const regencyName = provinceCode
          ? lookupOptionName(kabupatenByProvince[provinceCode] || [], regencyCode)
          : lookupOptionName([], regencyCode)

        nextMap[companyID] = {
          regency: regencyName,
        }
      })

      if (mounted) setFinanceCompanyLocationNameMap(nextMap)
    }

    void resolveFinanceCompanyLocationNames()
    return () => {
      mounted = false
    }
  }, [financeCompanies])

  const inferProvinceFromMasterByRegency = async (
    provinceOptions: Option[],
    regencyCandidates: string[],
  ) => {
    if (!provinceOptions.length || !regencyCandidates.length) {
      return null
    }

    for (const province of provinceOptions) {
      const kabupatenList = await fetchKabupatenByProvinceCode(String(province.code || ''))
      if (!kabupatenList.length) continue

      const matchedRegency = findOptionCodeByNames(kabupatenList, regencyCandidates)
      if (!matchedRegency) continue

      return {
        provinceCode: String(province.code || ''),
        kabupatenList,
        regencyCode: matchedRegency,
      }
    }

    return null
  }

  const applyDealerAddressByCoordinate = async (
    lat: number,
    lng: number,
    displayAddress: string,
    address: Record<string, any>,
  ) => {
    const displayAddressSegments = splitDisplayAddressSegments(displayAddress)
    const provinceName = firstFilled([
      address.state,
      address.province,
      address.region,
      address.state_district,
    ])
    const regencyName = firstFilled([
      address.city,
      address.county,
      address.municipality,
      address.regency,
      address.city_district,
      address.state_district,
      address.town,
      displayAddressSegments[1],
      displayAddressSegments[2],
    ])
    const districtName = firstFilled([
      address.city_district,
      address.suburb,
      address.district,
      address.township,
      address.neighbourhood,
      address.quarter,
      address.village,
      displayAddressSegments[0],
    ])
    const villageName = firstFilled([address.village, address.hamlet, address.suburb, address.neighbourhood])

    let nextProvince = ''
    let nextRegency = ''
    let nextDistrict = ''
    let nextKabupaten: Option[] = []
    let nextKecamatan: Option[] = []
    let provinceOptions = provinces

    if (!provinceOptions.length) {
      try {
        const provRes = await fetchProvinces()
        provinceOptions = provRes.data.data || provRes.data || []
        setProvinces(provinceOptions)
      } catch {
        provinceOptions = []
      }
    }

    const regencyCandidates = [regencyName, ...displayAddressSegments].filter(Boolean)

    if (provinceName) {
      nextProvince = findOptionCodeByNames(provinceOptions, [provinceName, ...displayAddressSegments])
    }

    if (!nextProvince && regencyCandidates.length > 0) {
      const inferred = await inferProvinceFromMasterByRegency(provinceOptions, regencyCandidates)
      if (inferred?.provinceCode) {
        nextProvince = inferred.provinceCode
        nextKabupaten = inferred.kabupatenList
        nextRegency = inferred.regencyCode || ''
      }
    }

    if (nextProvince) {
      if (!nextKabupaten.length) {
        nextKabupaten = await fetchKabupatenByProvinceCode(nextProvince)
      }
      if (regencyName || displayAddressSegments.length > 0) {
        nextRegency = findOptionCodeByNames(nextKabupaten, [regencyName, ...displayAddressSegments])
      }
    }

    if (nextProvince && nextRegency) {
      try {
        const kecRes = await fetchKecamatan(nextProvince, nextRegency)
        nextKecamatan = kecRes.data.data || kecRes.data || []
      } catch {
        nextKecamatan = []
      }
      if (districtName || displayAddressSegments.length > 0) {
        nextDistrict = findOptionCodeByNames(nextKecamatan, [districtName, villageName, ...displayAddressSegments])
      }
    }

    setDealerKabupaten(nextKabupaten)
    setDealerKecamatan(nextKecamatan)
    setDealerForm((prev) => ({
      ...prev,
      province: nextProvince,
      regency: nextRegency,
      district: nextDistrict,
      village: villageName || prev.village,
      address: displayAddress || prev.address,
      lat: String(roundCoordinate(lat)),
      lng: String(roundCoordinate(lng)),
    }))
  }

  const resolveDealerLocationFromMap = async (
    lat: number,
    lng: number,
    presetDisplayAddress?: string,
    presetAddress?: Record<string, any>,
  ) => {
    dealerLocationReqRef.current += 1
    const seq = dealerLocationReqRef.current
    setLocatingDealerAddress(true)
    setDealerCoordinates(lat, lng)

    try {
      let displayAddress = String(presetDisplayAddress || '').trim()
      let address = presetAddress || {}

      if (!displayAddress || Object.keys(address).length === 0 || !hasRegionAddressFields(address)) {
        const reverseRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
            String(lat),
          )}&lon=${encodeURIComponent(String(lng))}&zoom=18&addressdetails=1`,
        )
        const reversePayload = await reverseRes.json()
        displayAddress = String(reversePayload?.display_name || '').trim()
        address = reversePayload?.address || {}
      }

      if (seq !== dealerLocationReqRef.current) return
      await applyDealerAddressByCoordinate(lat, lng, displayAddress, address)
    } catch {
      if (seq !== dealerLocationReqRef.current) return
      setDealerCoordinates(lat, lng)
    } finally {
      if (seq === dealerLocationReqRef.current) {
        setLocatingDealerAddress(false)
      }
    }
  }

  const handleDealerPlaceChanged = (place: any) => {
    void resolveDealerLocationFromMap(place.lat, place.lng, place.formattedAddress, place.address)
  }

  const handleDealerProvince = async (code: string) => {
    setDealerForm((prev) => ({ ...prev, province: code, regency: '', district: '' }))
    setDealerKecamatan([])

    if (!code) {
      setDealerKabupaten([])
      return
    }

    try {
      const res = await fetchKabupaten(code)
      setDealerKabupaten(res.data.data || res.data || [])
    } catch {
      setDealerKabupaten([])
    }
  }

  const handleDealerRegency = async (code: string) => {
    setDealerForm((prev) => ({ ...prev, regency: code, district: '' }))

    if (!dealerForm.province || !code) {
      setDealerKecamatan([])
      return
    }

    try {
      const res = await fetchKecamatan(dealerForm.province, code)
      setDealerKecamatan(res.data.data || res.data || [])
    } catch {
      setDealerKecamatan([])
    }
  }

  const handleFinanceProvince = async (code: string) => {
    setFinanceForm((prev) => ({ ...prev, province: code, regency: '', district: '' }))
    setFinanceKecamatan([])

    if (!code) {
      setFinanceKabupaten([])
      return
    }

    try {
      const res = await fetchKabupaten(code)
      setFinanceKabupaten(res.data.data || res.data || [])
    } catch {
      setFinanceKabupaten([])
    }
  }

  const handleFinanceRegency = async (code: string) => {
    setFinanceForm((prev) => ({ ...prev, regency: code, district: '' }))

    if (!financeForm.province || !code) {
      setFinanceKecamatan([])
      return
    }

    try {
      const res = await fetchKecamatan(financeForm.province, code)
      setFinanceKecamatan(res.data.data || res.data || [])
    } catch {
      setFinanceKecamatan([])
    }
  }

  useEffect(() => {
    let mounted = true

    if (isDealerCreate) {
      setDealerForm(initialDealerForm)
      setDealerKabupaten([])
      setDealerKecamatan([])
      return
    }

    if (isDealerEdit && selectedDealer) {
      const raw: DealerForm = {
        name: selectedDealer.name || '',
        province: selectedDealer.province || '',
        regency: selectedDealer.regency || '',
        district: selectedDealer.district || '',
        village: selectedDealer.village || '',
        phone: selectedDealer.phone || '',
        address: selectedDealer.address || '',
        lat: String(selectedDealer.lat ?? selectedDealer.latitude ?? ''),
        lng: String(selectedDealer.lng ?? selectedDealer.longitude ?? ''),
      }

      const prepareEditDealerForm = async () => {
        let provinceOptions = provinces
        if (!provinceOptions.length) {
          try {
            const provRes = await fetchProvinces()
            provinceOptions = provRes.data.data || provRes.data || []
            if (mounted) setProvinces(provinceOptions)
          } catch {
            provinceOptions = []
          }
        }

        let provinceCode = findOptionCodeByValue(provinceOptions, raw.province)
        let kabData: Option[] = []

        if (!provinceCode && raw.regency) {
          const inferred = await inferProvinceFromMasterByRegency(provinceOptions, [raw.regency, raw.address])
          if (inferred?.provinceCode) {
            provinceCode = inferred.provinceCode
            kabData = inferred.kabupatenList || []
          }
        }

        if (provinceCode && kabData.length === 0) {
          kabData = await fetchKabupatenByProvinceCode(provinceCode)
        }

        const regencyCode = findOptionCodeByValue(kabData, raw.regency)
        let kecData: Option[] = []
        if (provinceCode && regencyCode) {
          kecData = await fetchKecamatanByProvinceRegencyCode(provinceCode, regencyCode)
        }
        const districtCode = findOptionCodeByValue(kecData, raw.district)

        if (!mounted) return
        setDealerKabupaten(kabData)
        setDealerKecamatan(kecData)
        setDealerForm({
          ...raw,
          province: provinceCode || raw.province,
          regency: regencyCode || raw.regency,
          district: districtCode || raw.district,
        })
      }

      void prepareEditDealerForm()
    }

    return () => {
      mounted = false
    }
  }, [isDealerCreate, isDealerEdit, provinces, selectedDealer])

  useEffect(() => {
    let mounted = true

    if (isCompanyCreate) {
      setFinanceForm(initialFinanceForm)
      setFinanceKabupaten([])
      setFinanceKecamatan([])
      return
    }

    if (isCompanyEdit && selectedCompany) {
      const raw: FinanceForm = {
        name: selectedCompany.name || '',
        province: selectedCompany.province || '',
        regency: selectedCompany.regency || '',
        district: selectedCompany.district || '',
        village: selectedCompany.village || '',
        phone: selectedCompany.phone || '',
        address: selectedCompany.address || '',
      }

      const prepareEditCompanyForm = async () => {
        let provinceOptions = provinces
        if (!provinceOptions.length) {
          try {
            const provRes = await fetchProvinces()
            provinceOptions = provRes.data.data || provRes.data || []
            if (mounted) setProvinces(provinceOptions)
          } catch {
            provinceOptions = []
          }
        }

        let provinceCode = findOptionCodeByValue(provinceOptions, raw.province)
        let kabData: Option[] = []

        if (!provinceCode && raw.regency) {
          const inferred = await inferProvinceFromMasterByRegency(provinceOptions, [raw.regency, raw.address])
          if (inferred?.provinceCode) {
            provinceCode = inferred.provinceCode
            kabData = inferred.kabupatenList || []
          }
        }

        if (provinceCode && kabData.length === 0) {
          kabData = await fetchKabupatenByProvinceCode(provinceCode)
        }

        const regencyCode = findOptionCodeByValue(kabData, raw.regency)
        let kecData: Option[] = []
        if (provinceCode && regencyCode) {
          kecData = await fetchKecamatanByProvinceRegencyCode(provinceCode, regencyCode)
        }
        const districtCode = findOptionCodeByValue(kecData, raw.district)

        if (!mounted) return
        setFinanceKabupaten(kabData)
        setFinanceKecamatan(kecData)
        setFinanceForm({
          ...raw,
          province: provinceCode || raw.province,
          regency: regencyCode || raw.regency,
          district: districtCode || raw.district,
        })
      }

      void prepareEditCompanyForm()
    }

    return () => {
      mounted = false
    }
  }, [isCompanyCreate, isCompanyEdit, provinces, selectedCompany])

  const submitDealer = async (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return

    const lat = parseCoordinateValue(dealerForm.lat)
    const lng = parseCoordinateValue(dealerForm.lng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      window.alert('Latitude/Longitude tidak valid')
      return
    }

    const payload = {
      name: dealerForm.name.trim(),
      province: resolveOptionNameValue(provinces, dealerForm.province),
      regency: resolveOptionNameValue(dealerKabupaten, dealerForm.regency),
      district: resolveOptionNameValue(dealerKecamatan, dealerForm.district),
      village: dealerForm.village.trim(),
      phone: dealerForm.phone.trim(),
      address: dealerForm.address.trim(),
      lat,
      lng,
    }

    setSavingDealer(true)
    try {
      if (isDealerEdit && selectedId) await updateDealer(selectedId, payload)
      else await createDealer(payload)
      await loadBaseData()
      navigate(dealerBasePath)
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menyimpan dealer')
    } finally {
      setSavingDealer(false)
    }
  }

  const submitFinance = async (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return

    const payload = {
      name: financeForm.name.trim(),
      province: resolveOptionNameValue(provinces, financeForm.province),
      regency: resolveOptionNameValue(financeKabupaten, financeForm.regency),
      district: resolveOptionNameValue(financeKecamatan, financeForm.district),
      village: financeForm.village.trim(),
      phone: financeForm.phone.trim(),
      address: financeForm.address.trim(),
    }

    setSavingFinance(true)
    try {
      if (isCompanyEdit && selectedId) await updateFinanceCompany(selectedId, payload)
      else await createFinanceCompany(payload)
      await loadBaseData()
      navigate(financeBasePath)
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menyimpan finance company')
    } finally {
      setSavingFinance(false)
    }
  }

  const removeDealer = async (id: string) => {
    if (!canManage) return
    const ok = await confirm({
      title: 'Delete Dealer',
      description: 'Are you sure you want to delete this dealer?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await deleteDealer(id)
      await loadBaseData()
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menghapus dealer')
    }
  }

  const removeFinance = async (id: string) => {
    if (!canManage) return
    const ok = await confirm({
      title: 'Delete Finance Company',
      description: 'Are you sure you want to delete this finance company?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await deleteFinanceCompany(id)
      await loadBaseData()
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menghapus finance company')
    }
  }

  if (!canView) {
    return (
      <div className="page">
        <div className="card">
          <h3>Peta & Finance</h3>
          <div className="alert">Tidak ada izin melihat finance.</div>
        </div>
      </div>
    )
  }

  if (isDealerDetail) {
    return (
      <DealerDetail
        canManage={canManage}
        dealerBasePath={dealerBasePath}
        navigate={navigate}
        selectedDealer={selectedDealer}
        selectedDealerDistrictName={selectedDealerDistrictName}
        selectedDealerProvinceName={selectedDealerProvinceName}
        selectedDealerRegencyName={selectedDealerRegencyName}
        selectedId={selectedId}
      />
    )
  }

  if (isCompanyDetail) {
    return (
      <CompanyDetail
        canManage={canManage}
        companySummary={companySummary}
        companySummaryLoading={companySummaryLoading}
        dealers={dealers}
        financeBasePath={financeBasePath}
        navigate={navigate}
        selectedCompany={selectedCompany}
        selectedCompanyDistrictName={selectedCompanyDistrictName}
        selectedCompanyProvinceName={selectedCompanyProvinceName}
        selectedCompanyRegencyName={selectedCompanyRegencyName}
        selectedId={selectedId}
      />
    )
  }

  if (isDealerCreate || isDealerEdit) {
    return (
      <DealerForm
        dealerBasePath={dealerBasePath}
        dealerForm={dealerForm}
        dealerFormCenter={dealerFormCenter}
        dealerFormLat={dealerFormLat}
        dealerFormLng={dealerFormLng}
        dealerFormZoom={dealerFormZoom}
        dealerKabupaten={dealerKabupaten}
        dealerKecamatan={dealerKecamatan}
        handleDealerPlaceChanged={handleDealerPlaceChanged}
        handleDealerProvince={handleDealerProvince}
        handleDealerRegency={handleDealerRegency}
        isDealerEdit={isDealerEdit}
        locatingDealerAddress={locatingDealerAddress}
        navigate={navigate}
        provinces={provinces}
        savingDealer={savingDealer}
        setDealerForm={setDealerForm}
        submitDealer={submitDealer}
      />
    )
  }

  if (isCompanyCreate || isCompanyEdit) {
    return (
      <CompanyForm
        financeBasePath={financeBasePath}
        financeForm={financeForm}
        financeKabupaten={financeKabupaten}
        financeKecamatan={financeKecamatan}
        handleFinanceProvince={handleFinanceProvince}
        handleFinanceRegency={handleFinanceRegency}
        isCompanyEdit={isCompanyEdit}
        navigate={navigate}
        provinces={provinces}
        savingFinance={savingFinance}
        setFinanceForm={setFinanceForm}
        submitFinance={submitFinance}
      />
    )
  }

  return (
    <div>
      {isBusinessTabMode && (
        <div className="business-tabs-pane">
          <button type="button" className="business-tab-btn" onClick={() => navigate('/business')}>
            Summary
          </button>
          <button
            type="button"
            className={`business-tab-btn ${listSection === 'finance' ? 'active' : ''}`}
            onClick={() => navigate('/business/finance')}
          >
            Finance
          </button>
          <button
            type="button"
            className={`business-tab-btn ${listSection === 'dealer' ? 'active' : ''}`}
            onClick={() => navigate('/business/dealer')}
          >
            Dealer
          </button>
        </div>
      )}

      <FinanceList
        canManage={canManage}
        center={center}
        dealerBasePath={dealerBasePath}
        dealerFinanceLimit={dealerFinanceLimit}
        dealerFinancePage={dealerFinancePage}
        dealerFinanceRows={dealerFinanceRows}
        dealerFinanceTotalData={dealerFinanceTotalData}
        dealerFinanceTotalPages={dealerFinanceTotalPages}
        dealerLocationNameMap={dealerLocationNameMap}
        dealerLimit={dealerLimit}
        dealerPage={dealerPage}
        dealerPoints={dealerPoints}
        dealerProvinceFilter={dealerProvinceFilter}
        dealerSearch={dealerSearch}
        dealerTotalData={dealerTotalData}
        dealerTotalPages={dealerTotalPages}
        dealers={dealers}
        financeBasePath={financeBasePath}
        financeCompanies={financeCompanies}
        financeCompanyLocationNameMap={financeCompanyLocationNameMap}
        financeLimit={financeLimit}
        financeMetricMaxTotal={financeMetricMaxTotal}
        financeMetricRows={financeMetricRows}
        financePage={financePage}
        financeProvinceFilter={financeProvinceFilter}
        financeSearch={financeSearch}
        financeTotalData={financeTotalData}
        financeTotalPages={financeTotalPages}
        listSection={listSection}
        metrics={metrics}
        navigate={navigate}
        provinces={provinces}
        removeDealer={removeDealer}
        removeFinance={removeFinance}
        selectedDealerId={selectedDealerId}
        selectedDealerName={selectedDealerName}
        setDealerFinanceLimit={setDealerFinanceLimit}
        setDealerFinancePage={setDealerFinancePage}
        setDealerPage={setDealerPage}
        setDealerProvinceFilter={setDealerProvinceFilter}
        setDealerSearch={setDealerSearch}
        setFinanceLimit={setFinanceLimit}
        setFinancePage={setFinancePage}
        setFinanceProvinceFilter={setFinanceProvinceFilter}
        setFinanceSearch={setFinanceSearch}
        setSelectedDealerId={setSelectedDealerId}
      />
    </div>
  )
}
