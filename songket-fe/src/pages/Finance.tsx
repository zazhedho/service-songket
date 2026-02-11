import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  createDealer,
  createFinanceCompany,
  deleteDealer,
  deleteFinanceCompany,
  fetchDealerMetrics,
  fetchDealers,
  fetchFinanceCompanies,
  fetchKabupaten,
  fetchKecamatan,
  fetchLookups,
  fetchProvinces,
  updateDealer,
  updateFinanceCompany,
} from '../api'
import DealerLeafletSearchMap, { type DealerLeafletPlace } from '../components/DealerLeafletSearchMap'
import { useConfirm } from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type Option = { code: string; name: string }

type DealerForm = {
  name: string
  province: string
  regency: string
  district: string
  village: string
  phone: string
  address: string
  lat: string
  lng: string
}

type FinanceForm = {
  name: string
  province: string
  regency: string
  district: string
  village: string
  phone: string
  address: string
}

type CompanyDealerRow = {
  dealer_id: string
  dealer_name: string
  total_orders: number
  approval_rate: number
  lead_time_seconds_avg: number | null
  rescue_approved_fc2: number
}

type CompanySummary = {
  total_orders: number
  approval_rate: number
  lead_time_seconds_avg: number | null
  rescue_approved_fc2: number
  active_dealers: number
  dealer_rows: CompanyDealerRow[]
}

const initialDealerForm: DealerForm = {
  name: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  phone: '',
  address: '',
  lat: '',
  lng: '',
}

const initialFinanceForm: FinanceForm = {
  name: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  phone: '',
  address: '',
}

const INDONESIA_CENTER: [number, number] = [-2.5489, 118.0149]

function parseFinanceMode(pathname: string) {
  if (pathname.endsWith('/dealers/create')) return 'dealer_create'
  if (/\/finance\/dealers\/[^/]+\/edit$/.test(pathname)) return 'dealer_edit'
  if (/\/finance\/dealers\/[^/]+$/.test(pathname)) return 'dealer_detail'
  if (pathname.endsWith('/companies/create')) return 'company_create'
  if (/\/finance\/companies\/[^/]+\/edit$/.test(pathname)) return 'company_edit'
  if (/\/finance\/companies\/[^/]+$/.test(pathname)) return 'company_detail'
  return 'list'
}

function getListTab(searchParams: URLSearchParams): 'dealer' | 'finance' {
  return searchParams.get('tab') === 'finance' ? 'finance' : 'dealer'
}

export default function FinancePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const mode = parseFinanceMode(location.pathname)
  const selectedId = params.id || ''

  const isList = mode === 'list'
  const isDealerCreate = mode === 'dealer_create'
  const isDealerEdit = mode === 'dealer_edit'
  const isDealerDetail = mode === 'dealer_detail'
  const isCompanyCreate = mode === 'company_create'
  const isCompanyEdit = mode === 'company_edit'
  const isCompanyDetail = mode === 'company_detail'

  const listTab = getListTab(searchParams)

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

  const [companySummary, setCompanySummary] = useState<CompanySummary | null>(null)
  const [companySummaryLoading, setCompanySummaryLoading] = useState(false)
  const [dealerDetailMetrics, setDealerDetailMetrics] = useState<any>(null)
  const [dealerDetailMetricsLoading, setDealerDetailMetricsLoading] = useState(false)
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
    if (!selectedDealerId || !(isList && (listTab === 'dealer' || listTab === 'finance'))) {
      setMetrics(null)
      return
    }
    fetchDealerMetrics(selectedDealerId)
      .then((res) => setMetrics(res.data.data || res.data || null))
      .catch(() => setMetrics(null))
  }, [isList, listTab, selectedDealerId])

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
    if (!isDealerDetail || !selectedDealer?.id) {
      setDealerDetailMetrics(null)
      setDealerDetailMetricsLoading(false)
      return
    }

    setDealerDetailMetricsLoading(true)
    fetchDealerMetrics(selectedDealer.id)
      .then((res) => setDealerDetailMetrics(res.data.data || res.data || null))
      .catch(() => setDealerDetailMetrics(null))
      .finally(() => setDealerDetailMetricsLoading(false))
  }, [isDealerDetail, selectedDealer?.id])

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

  const financeMetricMaxTotal = useMemo(() => {
    const values = financeMetricRows.map((item: any) => Number(item?.total_orders || 0))
    return Math.max(1, ...values)
  }, [financeMetricRows])

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

  const handleDealerPlaceChanged = (place: DealerLeafletPlace) => {
    void resolveDealerLocationFromMap(place.lat, place.lng, place.formattedAddress, place.address)
  }

  const setTab = (tab: 'dealer' | 'finance') => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'finance') next.set('tab', 'finance')
    else next.delete('tab')
    setSearchParams(next, { replace: true })
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
    if (isDealerCreate) {
      setDealerForm(initialDealerForm)
      setDealerKabupaten([])
      setDealerKecamatan([])
      return
    }

    if (isDealerEdit && selectedDealer) {
      const next: DealerForm = {
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

      setDealerForm(next)

      if (next.province) {
        fetchKabupaten(next.province)
          .then((kab) => {
            const kabData = kab.data.data || kab.data || []
            setDealerKabupaten(kabData)
            if (next.regency) {
              fetchKecamatan(next.province, next.regency)
                .then((kec) => setDealerKecamatan(kec.data.data || kec.data || []))
                .catch(() => setDealerKecamatan([]))
            }
          })
          .catch(() => {
            setDealerKabupaten([])
            setDealerKecamatan([])
          })
      }
    }
  }, [isDealerCreate, isDealerEdit, selectedDealer])

  useEffect(() => {
    if (isCompanyCreate) {
      setFinanceForm(initialFinanceForm)
      setFinanceKabupaten([])
      setFinanceKecamatan([])
      return
    }

    if (isCompanyEdit && selectedCompany) {
      const next: FinanceForm = {
        name: selectedCompany.name || '',
        province: selectedCompany.province || '',
        regency: selectedCompany.regency || '',
        district: selectedCompany.district || '',
        village: selectedCompany.village || '',
        phone: selectedCompany.phone || '',
        address: selectedCompany.address || '',
      }

      setFinanceForm(next)

      if (next.province) {
        fetchKabupaten(next.province)
          .then((kab) => {
            const kabData = kab.data.data || kab.data || []
            setFinanceKabupaten(kabData)
            if (next.regency) {
              fetchKecamatan(next.province, next.regency)
                .then((kec) => setFinanceKecamatan(kec.data.data || kec.data || []))
                .catch(() => setFinanceKecamatan([]))
            }
          })
          .catch(() => {
            setFinanceKabupaten([])
            setFinanceKecamatan([])
          })
      }
    }
  }, [isCompanyCreate, isCompanyEdit, selectedCompany])

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
      province: dealerForm.province.trim(),
      regency: dealerForm.regency.trim(),
      district: dealerForm.district.trim(),
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
      navigate('/finance?tab=dealer')
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
      province: financeForm.province.trim(),
      regency: financeForm.regency.trim(),
      district: financeForm.district.trim(),
      village: financeForm.village.trim(),
      phone: financeForm.phone.trim(),
      address: financeForm.address.trim(),
    }

    setSavingFinance(true)
    try {
      if (isCompanyEdit && selectedId) await updateFinanceCompany(selectedId, payload)
      else await createFinanceCompany(payload)
      await loadBaseData()
      navigate('/finance?tab=finance')
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
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Dealer</div>
            <div style={{ color: '#64748b' }}>Dealer profile and location map</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canManage && selectedId && (
              <button className="btn" onClick={() => navigate(`/finance/dealers/${selectedId}/edit`, { state: { dealer: selectedDealer } })}>
                Edit Dealer
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/finance?tab=dealer')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedDealer && <div className="alert">Dealer tidak ditemukan.</div>}
          {selectedDealer && (
            <>
              <div className="card" style={{ maxWidth: 960 }}>
                <h3>Dealer Information</h3>
                <DetailTable
                  rows={[
                    { label: 'Name', value: selectedDealer.name || '-' },
                    { label: 'Phone', value: selectedDealer.phone || '-' },
                    { label: 'Province', value: selectedDealerProvinceName },
                    { label: 'Regency / City', value: selectedDealerRegencyName },
                    { label: 'District', value: selectedDealerDistrictName },
                    { label: 'Village', value: selectedDealer.village || '-' },
                    { label: 'Address', value: selectedDealer.address || '-' },
                    { label: 'Latitude', value: String(selectedDealer.lat ?? selectedDealer.latitude ?? '-') },
                    { label: 'Longitude', value: String(selectedDealer.lng ?? selectedDealer.longitude ?? '-') },
                    { label: 'Created At', value: formatDateTime(selectedDealer.created_at) },
                    { label: 'Updated At', value: formatDateTime(selectedDealer.updated_at) },
                  ]}
                />
              </div>

              <div className="card">
                <h3>Dealer Performance</h3>
                {dealerDetailMetricsLoading && <div className="muted">Loading dealer performance...</div>}
                {!dealerDetailMetricsLoading && !dealerDetailMetrics && (
                  <div className="muted">No performance data for this dealer yet.</div>
                )}
                {!dealerDetailMetricsLoading && dealerDetailMetrics && (
                  <>
                    <DetailTable
                      rows={[
                        { label: 'Total Orders', value: Number(dealerDetailMetrics.total_orders || 0) },
                        {
                          label: 'Approval Rate',
                          value: `${(Number(dealerDetailMetrics.approval_rate || 0) * 100).toFixed(1)}%`,
                        },
                        {
                          label: 'Lead Time Avg (s)',
                          value:
                            dealerDetailMetrics.lead_time_seconds_avg == null
                              ? '-'
                              : Number(dealerDetailMetrics.lead_time_seconds_avg).toFixed(1),
                        },
                        { label: 'Rescue FC2', value: Number(dealerDetailMetrics.rescue_approved_fc2 || 0) },
                        {
                          label: 'Finance Companies',
                          value: Array.isArray(dealerDetailMetrics.finance_companies)
                            ? dealerDetailMetrics.finance_companies.length
                            : 0,
                        },
                      ]}
                    />

                    <div style={{ marginTop: 12 }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Finance Company</th>
                            <th>Total Orders</th>
                            <th>Approval Rate</th>
                            <th>Lead Avg (s)</th>
                            <th>Rescue FC2</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dealerDetailMetrics.finance_companies || []).map((item: any) => (
                            <tr key={item.finance_company_id}>
                              <td>{item.finance_company_name || '-'}</td>
                              <td>{Number(item.total_orders || 0)}</td>
                              <td>{(Number(item.approval_rate || 0) * 100).toFixed(1)}%</td>
                              <td>{item.lead_time_seconds_avg ? Number(item.lead_time_seconds_avg).toFixed(1) : '-'}</td>
                              <td>{Number(item.rescue_approved_fc2 || 0)}</td>
                            </tr>
                          ))}
                          {(dealerDetailMetrics.finance_companies || []).length === 0 && (
                            <tr>
                              <td colSpan={5}>No related finance company data for this dealer.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              <div className="card" style={{ minHeight: 360 }}>
                <h3>Dealer Map</h3>
                <div style={{ marginTop: 10 }}>
                  <MapContainer
                    center={[Number(selectedDealer.lat ?? selectedDealer.latitude ?? -8.58), Number(selectedDealer.lng ?? selectedDealer.longitude ?? 116.12)]}
                    zoom={11}
                    style={{ height: 300, borderRadius: 12 }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    <Marker
                      position={[Number(selectedDealer.lat ?? selectedDealer.latitude ?? -8.58), Number(selectedDealer.lng ?? selectedDealer.longitude ?? 116.12)]}
                      icon={markerIcon}
                    >
                      <Popup>{selectedDealer.name}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (isCompanyDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Finance Company</div>
            <div style={{ color: '#64748b' }}>Company profile and performance summary</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canManage && selectedId && (
              <button className="btn" onClick={() => navigate(`/finance/companies/${selectedId}/edit`, { state: { company: selectedCompany } })}>
                Edit Finance Company
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/finance?tab=finance')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedCompany && <div className="alert">Finance company tidak ditemukan.</div>}
          {selectedCompany && (
            <>
              <div className="card" style={{ maxWidth: 960 }}>
                <h3>Finance Company Information</h3>
                <DetailTable
                  rows={[
                    { label: 'Name', value: selectedCompany.name || '-' },
                    { label: 'Phone', value: selectedCompany.phone || '-' },
                    { label: 'Province', value: selectedCompanyProvinceName },
                    { label: 'Regency / City', value: selectedCompanyRegencyName },
                    { label: 'District', value: selectedCompanyDistrictName },
                    { label: 'Village', value: selectedCompany.village || '-' },
                    { label: 'Address', value: selectedCompany.address || '-' },
                    { label: 'Created At', value: formatDateTime(selectedCompany.created_at) },
                    { label: 'Updated At', value: formatDateTime(selectedCompany.updated_at) },
                  ]}
                />
              </div>

              <div className="card">
                <h3>Finance Performence Summary</h3>
                {companySummaryLoading && <div className="muted">Loading performance summary...</div>}
                {!companySummaryLoading && !companySummary && <div className="muted">No performance data yet.</div>}

                {!companySummaryLoading && companySummary && (
                  <>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
                      <Metric label="Total Order" value={companySummary.total_orders} />
                      <Metric label="Approval Rate" value={`${(companySummary.approval_rate * 100).toFixed(1)}%`} />
                      <Metric label="Lead Avg (s)" value={companySummary.lead_time_seconds_avg != null ? companySummary.lead_time_seconds_avg.toFixed(1) : '-'} />
                      <Metric label="Rescue FC2" value={companySummary.rescue_approved_fc2} />
                    </div>

                    <div style={{ marginTop: 10, color: '#64748b', fontSize: 12 }}>
                      Dealer aktif: {companySummary.active_dealers} dari {dealers.length} dealer
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Dealer</th>
                            <th>Total Order</th>
                            <th>Approval Rate</th>
                            <th>Lead Avg (s)</th>
                            <th>Rescue FC2</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companySummary.dealer_rows.map((row) => (
                            <tr key={row.dealer_id}>
                              <td>{row.dealer_name}</td>
                              <td>{row.total_orders}</td>
                              <td>{(row.approval_rate * 100).toFixed(1)}%</td>
                              <td>{row.lead_time_seconds_avg != null ? row.lead_time_seconds_avg.toFixed(1) : '-'}</td>
                              <td>{row.rescue_approved_fc2}</td>
                            </tr>
                          ))}
                          {companySummary.dealer_rows.length === 0 && (
                            <tr>
                              <td colSpan={5}>No dealer performance data yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (isDealerCreate || isDealerEdit) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isDealerEdit ? 'Edit Dealer' : 'Input Dealer Baru'}</div>
            <div style={{ color: '#64748b' }}>Form dealer terpisah dari tabel</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/finance?tab=dealer')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 920 }}>
            <form onSubmit={submitDealer} className="grid" style={{ gap: 10 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label>Nama Dealer</label>
                  <input value={dealerForm.name} onChange={(e) => setDealerForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div>
                  <label>No Telepon</label>
                  <input value={dealerForm.phone} onChange={(e) => setDealerForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                </div>

                <div>
                  <label>Provinsi</label>
                  <select value={dealerForm.province} onChange={(e) => void handleDealerProvince(e.target.value)} required>
                    <option value="">Pilih</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>{province.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kab/Kota</label>
                  <select
                    value={dealerForm.regency}
                    onChange={(e) => void handleDealerRegency(e.target.value)}
                    disabled={!dealerForm.province}
                    required
                  >
                    <option value="">Pilih</option>
                    {dealerKabupaten.map((kab) => (
                      <option key={kab.code} value={kab.code}>{kab.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kecamatan</label>
                  <select
                    value={dealerForm.district}
                    onChange={(e) => setDealerForm((prev) => ({ ...prev, district: e.target.value }))}
                    disabled={!dealerForm.regency}
                    required
                  >
                    <option value="">Pilih</option>
                    {dealerKecamatan.map((kec) => (
                      <option key={kec.code} value={kec.code}>{kec.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kelurahan</label>
                  <input value={dealerForm.village} onChange={(e) => setDealerForm((prev) => ({ ...prev, village: e.target.value }))} />
                </div>

                <div>
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={dealerForm.lat}
                    onChange={(e) => setDealerForm((prev) => ({ ...prev, lat: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={dealerForm.lng}
                    onChange={(e) => setDealerForm((prev) => ({ ...prev, lng: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Alamat</label>
                  <input
                    value={dealerForm.address}
                    onChange={(e) => setDealerForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Address is auto-filled when location is selected"
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ marginBottom: 0 }}>Dealer Location Map</label>
                    {locatingDealerAddress && <span style={{ color: '#64748b', fontSize: 12 }}>Resolving location...</span>}
                  </div>

                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                    Search location directly on the map or click the map to pin location.
                    Suggestion dropdown, map movement, and autofill are available in this Leaflet map.
                  </div>

                  <DealerLeafletSearchMap
                    center={dealerFormCenter}
                    zoom={dealerFormZoom}
                    lat={dealerFormLat}
                    lng={dealerFormLng}
                    onPick={handleDealerPlaceChanged}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn-ghost" type="button" onClick={() => navigate('/finance?tab=dealer')}>Batal</button>
                <button className="btn" type="submit" disabled={savingDealer}>
                  {savingDealer ? 'Menyimpan...' : isDealerEdit ? 'Update Dealer' : 'Tambah Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (isCompanyCreate || isCompanyEdit) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isCompanyEdit ? 'Edit Finance Company' : 'Input Finance Company Baru'}</div>
            <div style={{ color: '#64748b' }}>Form finance company terpisah dari tabel</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/finance?tab=finance')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 920 }}>
            <form onSubmit={submitFinance} className="grid" style={{ gap: 10 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label>Nama Finance Company</label>
                  <input value={financeForm.name} onChange={(e) => setFinanceForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div>
                  <label>No Telepon</label>
                  <input value={financeForm.phone} onChange={(e) => setFinanceForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                </div>

                <div>
                  <label>Provinsi</label>
                  <select value={financeForm.province} onChange={(e) => void handleFinanceProvince(e.target.value)} required>
                    <option value="">Pilih</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>{province.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kab/Kota</label>
                  <select
                    value={financeForm.regency}
                    onChange={(e) => void handleFinanceRegency(e.target.value)}
                    disabled={!financeForm.province}
                    required
                  >
                    <option value="">Pilih</option>
                    {financeKabupaten.map((kab) => (
                      <option key={kab.code} value={kab.code}>{kab.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kecamatan</label>
                  <select
                    value={financeForm.district}
                    onChange={(e) => setFinanceForm((prev) => ({ ...prev, district: e.target.value }))}
                    disabled={!financeForm.regency}
                    required
                  >
                    <option value="">Pilih</option>
                    {financeKecamatan.map((kec) => (
                      <option key={kec.code} value={kec.code}>{kec.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kelurahan</label>
                  <input value={financeForm.village} onChange={(e) => setFinanceForm((prev) => ({ ...prev, village: e.target.value }))} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Alamat</label>
                  <input value={financeForm.address} onChange={(e) => setFinanceForm((prev) => ({ ...prev, address: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn-ghost" type="button" onClick={() => navigate('/finance?tab=finance')}>Batal</button>
                <button className="btn" type="submit" disabled={savingFinance}>
                  {savingFinance ? 'Menyimpan...' : isCompanyEdit ? 'Update Finance' : 'Tambah Finance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
          <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Dealer & Finance Management</div>
          <div style={{ color: '#64748b' }}>Map is shown for Dealer only. Finance Company is shown in table format.</div>
        </div>
      </div>

      <div className="page" style={{ display: 'grid', gap: 14 }}>
        <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={listTab === 'dealer' ? 'btn' : 'btn-ghost'} onClick={() => setTab('dealer')}>Dealers</button>
          <button className={listTab === 'finance' ? 'btn' : 'btn-ghost'} onClick={() => setTab('finance')}>Finance</button>
        </div>

        {listTab === 'dealer' && (
          <>
            <div className="card">
              <div style={{ marginBottom: 10 }}>
                <label>Search Dealer</label>
                <input value={dealerSearch} onChange={(e) => setDealerSearch(e.target.value)} placeholder="Search by name/regency/phone" />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label>Dealer Province Filter</label>
                <select value={dealerProvinceFilter} onChange={(e) => setDealerProvinceFilter(e.target.value)}>
                  <option value="">All</option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3>Dealers</h3>
                {canManage && <button className="btn" onClick={() => navigate('/finance/dealers/create')}>Create Dealer</button>}
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Regency</th>
                    <th>Phone</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dealers.map((dealer) => (
                    <tr key={dealer.id} style={dealer.id === selectedDealerId ? { background: '#eef6ff' } : undefined}>
                      <td>{dealer.name}</td>
                      <td>{dealer.regency || '-'}</td>
                      <td>{dealer.phone || '-'}</td>
                      <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="btn-ghost"
                          style={dealer.id === selectedDealerId ? { borderColor: '#2563eb', color: '#1d4ed8', background: '#eff6ff' } : undefined}
                          onClick={() => setSelectedDealerId(dealer.id)}
                        >
                          {dealer.id === selectedDealerId ? 'Selected' : 'Focus'}
                        </button>
                        <button className="btn-ghost" onClick={() => navigate(`/finance/dealers/${dealer.id}`, { state: { dealer } })}>View</button>
                        {canManage && (
                          <button className="btn-ghost" onClick={() => navigate(`/finance/dealers/${dealer.id}/edit`, { state: { dealer } })}>Edit</button>
                        )}
                        {canManage && <button className="btn-ghost" onClick={() => void removeDealer(dealer.id)}>Delete</button>}
                      </td>
                    </tr>
                  ))}
                  {dealers.length === 0 && (
                    <tr>
                      <td colSpan={4}>No dealers available.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Pagination
                page={dealerPage}
                totalPages={dealerTotalPages}
                totalData={dealerTotalData}
                limit={dealerLimit}
                onPageChange={setDealerPage}
                onLimitChange={(next) => {
                  setDealerLimit(next)
                  setDealerPage(1)
                }}
              />
            </div>

            <div className="card" style={{ minHeight: 430 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Dealer Map</h3>
                <div style={{ color: '#64748b', fontSize: 12 }}>{selectedDealerName} • {dealerPoints.length} points</div>
              </div>

              <div style={{ marginTop: 10 }}>
                <MapContainer center={center as any} zoom={8} style={{ height: 360, borderRadius: 12 }} scrollWheelZoom={false}>
                  <MapFly center={center as any} />
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  {dealerPoints.map((dealer) => (
                    <Marker
                      key={dealer.id}
                      position={[dealer._lat, dealer._lng]}
                      icon={markerIcon}
                      eventHandlers={{ click: () => setSelectedDealerId(dealer.id) }}
                    >
                      <Popup>
                        <strong>{dealer.name}</strong>
                        <div>{dealer.regency}</div>
                        <div>{dealer.phone || '-'}</div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Dealer Performance</h3>
                <div style={{ color: '#64748b', fontSize: 12 }}>{selectedDealerName}</div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 12 }}>
                <div>
                  <label>Select Dealer</label>
                  <select value={selectedDealerId} onChange={(e) => setSelectedDealerId(e.target.value)}>
                    <option value="">Select dealer</option>
                    {dealers.map((dealer) => (
                      <option key={dealer.id} value={dealer.id}>{dealer.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedDealerId && <div style={{ marginTop: 12, color: '#64748b' }}>Select a dealer to view metrics.</div>}
              {selectedDealerId && !metrics && <div style={{ marginTop: 12, color: '#64748b' }}>No metrics available for selected dealer.</div>}

              {metrics && (
                <>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
                    <Metric label="Total Order" value={metrics.total_orders} />
                    <Metric label="Approval Rate" value={`${((metrics.approval_rate || 0) * 100).toFixed(1)}%`} />
                    <Metric label="Lead Time Avg (s)" value={metrics.lead_time_seconds_avg ? metrics.lead_time_seconds_avg.toFixed(1) : '-'} />
                    <Metric label="Rescue FC2" value={metrics.rescue_approved_fc2} />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {listTab === 'finance' && (
          <>
            <div className="card">
              <div style={{ marginBottom: 10 }}>
                <label>Search Finance Company</label>
                <input value={financeSearch} onChange={(e) => setFinanceSearch(e.target.value)} placeholder="Search by name/regency/phone" />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label>Finance Province Filter</label>
                <select value={financeProvinceFilter} onChange={(e) => setFinanceProvinceFilter(e.target.value)}>
                  <option value="">All</option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3>Finance Company</h3>
                {canManage && <button className="btn" onClick={() => navigate('/finance/companies/create')}>Create Finance</button>}
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Regency</th>
                    <th>Phone</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {financeCompanies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td>{company.regency || '-'}</td>
                      <td>{company.phone || '-'}</td>
                      <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn-ghost" onClick={() => navigate(`/finance/companies/${company.id}`, { state: { company } })}>View</button>
                        {canManage && (
                          <button className="btn-ghost" onClick={() => navigate(`/finance/companies/${company.id}/edit`, { state: { company } })}>Edit</button>
                        )}
                        {canManage && <button className="btn-ghost" onClick={() => void removeFinance(company.id)}>Delete</button>}
                      </td>
                    </tr>
                  ))}
                  {financeCompanies.length === 0 && (
                    <tr>
                      <td colSpan={4}>No finance company available.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Pagination
                page={financePage}
                totalPages={financeTotalPages}
                totalData={financeTotalData}
                limit={financeLimit}
                onPageChange={setFinancePage}
                onLimitChange={(next) => {
                  setFinanceLimit(next)
                  setFinancePage(1)
                }}
              />
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Finance Performence</h3>
                <div style={{ color: '#64748b', fontSize: 12 }}>{selectedDealerName}</div>
              </div>

              <div style={{ marginTop: 12, maxWidth: 360 }}>
                <label>Select Dealer</label>
                <select value={selectedDealerId} onChange={(e) => setSelectedDealerId(e.target.value)}>
                  <option value="">Select dealer</option>
                  {dealers.map((dealer) => (
                    <option key={dealer.id} value={dealer.id}>{dealer.name}</option>
                  ))}
                </select>
              </div>

              {!selectedDealerId && <div style={{ marginTop: 12, color: '#64748b' }}>Select a dealer to view finance company performance.</div>}
              {selectedDealerId && !metrics && <div style={{ marginTop: 12, color: '#64748b' }}>No metrics available for selected dealer.</div>}

              {metrics && (
                <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 12, marginTop: 12 }}>
                  <div>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Finance</th>
                          <th>Total</th>
                          <th>Approve</th>
                          <th>Lead Avg</th>
                          <th>Rescue FC2</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeMetricRows.map((fc: any) => (
                          <tr key={fc.finance_company_id}>
                            <td>{fc.finance_company_name}</td>
                            <td>{fc.total_orders}</td>
                            <td>{((fc.approval_rate || 0) * 100).toFixed(1)}%</td>
                            <td>{fc.lead_time_seconds_avg ? fc.lead_time_seconds_avg.toFixed(1) : '-'}</td>
                            <td>{fc.rescue_approved_fc2 || 0}</td>
                          </tr>
                        ))}
                        {financeMetricRows.length === 0 && (
                          <tr>
                            <td colSpan={5}>No finance company metric for this dealer.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ border: '1px solid #dde4ee', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Summary Chart</div>
                    {financeMetricRows.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No summary data yet.</div>}
                    {financeMetricRows.map((fc: any) => {
                      const total = Number(fc?.total_orders || 0)
                      const width = Math.max(8, (total / financeMetricMaxTotal) * 100)
                      return (
                        <div key={`chart-${fc.finance_company_id}`} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>{fc.finance_company_name || '-'}</span>
                            <span>{total}</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 999, background: '#dbe5f2', marginTop: 4 }}>
                            <div
                              style={{
                                width: `${Math.min(100, width)}%`,
                                height: '100%',
                                borderRadius: 999,
                                background: '#2563eb',
                                transition: 'width .25s ease',
                              }}
                            />
                          </div>
                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                            Approval {(Number(fc?.approval_rate || 0) * 100).toFixed(1)}%
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MapFly({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center?.length === 2) map.flyTo(center, map.getZoom(), { duration: 0.5 })
  }, [center, map])
  return null
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #dbe3ef' }}>
      <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 19 }}>{value}</div>
    </div>
  )
}

function DetailTable({ rows }: { rows: Array<{ label: string; value: any }> }) {
  return (
    <table className="table" style={{ marginTop: 10 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: '36%', textTransform: 'none', letterSpacing: 'normal' }}>{row.label}</th>
            <td style={{ fontWeight: 600, wordBreak: 'break-word' }}>{row.value ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function lookupOptionName(list: Option[] | undefined, code?: string) {
  if (!code) return '-'
  const rawCode = String(code).trim()
  const normalized = rawCode.toLowerCase()
  const found =
    list?.find((item) => String(item?.code || '').trim().toLowerCase() === normalized) ||
    list?.find((item) => String(item?.name || '').trim().toLowerCase() === normalized)
  return found?.name || rawCode
}

function findOptionCodeByNames(list: Option[] | undefined, names: Array<string | undefined>) {
  const options = Array.isArray(list) ? list : []
  const candidates = names
    .map((name) => normalizeLocationName(name))
    .filter(Boolean)

  if (!candidates.length || !options.length) return ''

  for (const candidate of candidates) {
    const exact = options.find((item) => normalizeLocationName(item?.name) === candidate)
    if (exact?.code) return String(exact.code)
  }

  for (const candidate of candidates) {
    const fuzzy = options.find((item) => {
      const optionName = normalizeLocationName(item?.name)
      return optionName.includes(candidate) || candidate.includes(optionName)
    })
    if (fuzzy?.code) return String(fuzzy.code)
  }

  return ''
}

function normalizeLocationName(value?: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\(/g, ' ')
    .replace(/\)/g, ' ')
    .replace(/\./g, ' ')
    .replace(/,/g, ' ')
    .replace(/\badministrasi\b/g, ' ')
    .replace(/\badm\b/g, ' ')
    .replace(/\bkotamadya\b/g, ' ')
    .replace(/\bkab\s*adm\b/g, ' ')
    .replace(/\bkota\s*adm\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^provinsi\s+/, '')
    .replace(/^prov\s+/, '')
    .replace(/^kota administrasi\s+/, '')
    .replace(/^kabupaten administrasi\s+/, '')
    .replace(/^kabupaten\s+/, '')
    .replace(/^kab\s+/, '')
    .replace(/^kab\s*\.\s+/, '')
    .replace(/^kota\s+/, '')
    .replace(/^kecamatan\s+/, '')
    .replace(/^kec\s+/, '')
    .replace(/^daerah khusus ibukota\s+/, '')
    .replace(/^daerah istimewa\s+/, '')
    .replace(/^dki\s+/, '')
    .replace(/^di\s+/, '')
}

function firstFilled(values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = String(value || '').trim()
    if (trimmed) return trimmed
  }
  return ''
}

function splitDisplayAddressSegments(displayAddress: string) {
  return String(displayAddress || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function hasRegionAddressFields(address: Record<string, any>) {
  if (!address || typeof address !== 'object') return false
  return Boolean(
    firstFilled([
      address.state,
      address.province,
      address.region,
      address.state_district,
      address.city,
      address.county,
      address.municipality,
      address.regency,
      address.city_district,
      address.district,
    ]),
  )
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US')
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6))
}

function parseCoordinateValue(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return Number.NaN
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}
