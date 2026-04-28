import { FormEvent, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createDealer,
  createFinanceCompany,
  deleteDealer,
  deleteFinanceCompany,
  updateDealer,
  updateFinanceCompany,
} from '../../services/businessService'
import {
  fetchKabupaten,
  fetchKecamatan,
  fetchProvinces,
} from '../../services/locationService'
import { useAlert, useConfirm } from '../../components/common/ConfirmDialog'
import { useLocationOptions } from '../../hooks/useLocationOptions'
import { usePermissions } from '../../hooks/usePermissions'
import { focusFirstInvalidField } from '../../utils/formFocus'
import { reverseGeocodedPlace } from '../../utils/geocoding'
import FinanceList from './components/FinanceList'
import {
  type DealerForm as DealerFormState,
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
import { useFinanceData } from './hooks/useFinanceData'
import { useFinanceLocationMetadata } from './hooks/useFinanceLocationMetadata'

const DealerDetail = lazy(() => import('./components/DealerDetail'))
const CompanyDetail = lazy(() => import('./components/CompanyDetail'))
const DealerForm = lazy(() => import('./components/DealerForm'))
const CompanyForm = lazy(() => import('./components/CompanyForm'))

function FinanceModeLoader() {
  return (
    <div className="page">
      <div className="card">Loading finance view...</div>
    </div>
  )
}

export default function FinancePage() {
  const showAlert = useAlert()
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

  const { hasPermission } = usePermissions()
  const canView = hasPermission('business', 'list')
  const canCreate = hasPermission('business', 'create')
  const canUpdate = hasPermission('business', 'update')
  const canDelete = hasPermission('business', 'delete')
  const confirm = useConfirm()

  const {
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
  } = useFinanceData({
    canView,
    isList,
    isCompanyDetail,
    modeKey: mode,
    selectedCompanyId: selectedId,
  })

  const [dealerForm, setDealerForm] = useState<DealerFormState>(initialDealerForm)
  const [financeForm, setFinanceForm] = useState<FinanceForm>(initialFinanceForm)
  const [savingDealer, setSavingDealer] = useState(false)
  const [savingFinance, setSavingFinance] = useState(false)
  const [locatingDealerAddress, setLocatingDealerAddress] = useState(false)
  const dealerLocationReqRef = useRef(0)

  const stateDealer = (location.state as any)?.dealer || null
  const stateCompany = (location.state as any)?.company || null
  const {
    provinces,
    setProvinces,
  } = useLocationOptions({
    enabled: canView,
  })
  const {
    regencies: dealerKabupaten,
    districts: dealerKecamatan,
    setRegencies: setDealerKabupaten,
    setDistricts: setDealerKecamatan,
  } = useLocationOptions({
    enabled: isDealerCreate || isDealerEdit,
    loadProvinces: false,
    provinceCode: dealerForm.province,
    regencyCode: dealerForm.regency,
    withDistricts: true,
  })
  const {
    regencies: financeKabupaten,
    districts: financeKecamatan,
    setRegencies: setFinanceKabupaten,
    setDistricts: setFinanceKecamatan,
  } = useLocationOptions({
    enabled: isCompanyCreate || isCompanyEdit,
    loadProvinces: false,
    provinceCode: financeForm.province,
    regencyCode: financeForm.regency,
    withDistricts: true,
  })

  const selectedDealer = useMemo(() => {
    if (!selectedId) return null
    return dealers.find((dealer) => dealer.id === selectedId) || (stateDealer?.id === selectedId ? stateDealer : null)
  }, [dealers, selectedId, stateDealer])

  const selectedCompany = useMemo(() => {
    if (!selectedId) return null
    return financeCompanies.find((company) => company.id === selectedId) || (stateCompany?.id === selectedId ? stateCompany : null)
  }, [financeCompanies, selectedId, stateCompany])

  const {
    dealerLocationNameMap,
    detailCompanyKabupaten,
    detailCompanyKecamatan,
    detailDealerKabupaten,
    detailDealerKecamatan,
    fetchKabupatenByProvinceCode,
    fetchKecamatanByProvinceRegencyCode,
    financeCompanyLocationNameMap,
  } = useFinanceLocationMetadata({
    dealers,
    financeCompanies,
    isDealerDetail,
    isCompanyDetail,
    provinces,
    selectedCompany,
    selectedDealer,
    setProvinces,
  })

  const selectedDealerProvinceName = lookupOptionName(provinces, selectedDealer?.province)
  const selectedDealerRegencyName = lookupOptionName(detailDealerKabupaten, selectedDealer?.regency)
  const selectedDealerDistrictName = lookupOptionName(detailDealerKecamatan, selectedDealer?.district)
  const selectedCompanyProvinceName = lookupOptionName(provinces, selectedCompany?.province)
  const selectedCompanyRegencyName = lookupOptionName(detailCompanyKabupaten, selectedCompany?.regency)
  const selectedCompanyDistrictName = lookupOptionName(detailCompanyKecamatan, selectedCompany?.district)

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
        const reversePlace = await reverseGeocodedPlace(lat, lng)
        displayAddress = String(reversePlace.formattedAddress || '').trim()
        address = reversePlace.address || {}
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

  const handleDealerProvince = (code: string) => {
    setDealerForm((prev) => ({ ...prev, province: code, regency: '', district: '' }))
    if (!code) {
      setDealerKabupaten([])
      setDealerKecamatan([])
    }
  }

  const handleDealerRegency = (code: string) => {
    setDealerForm((prev) => ({ ...prev, regency: code, district: '' }))
    if (!code) {
      setDealerKecamatan([])
    }
  }

  const handleFinanceProvince = (code: string) => {
    setFinanceForm((prev) => ({ ...prev, province: code, regency: '', district: '' }))
    if (!code) {
      setFinanceKabupaten([])
      setFinanceKecamatan([])
    }
  }

  const handleFinanceRegency = (code: string) => {
    setFinanceForm((prev) => ({ ...prev, regency: code, district: '' }))
    if (!code) {
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
      const raw: DealerFormState = {
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
    if ((isDealerEdit && !canUpdate) || (!isDealerEdit && !canCreate)) return

    const dealerName = dealerForm.name.trim()

    if (dealerName.length < 3) {
      focusFirstInvalidField('name')
      await showAlert('Dealer name must be at least 3 characters long.')
      return
    }
    if (!dealerForm.phone.trim()) {
      focusFirstInvalidField('phone')
      await showAlert('Phone number is required.')
      return
    }
    if (!dealerForm.province || !dealerForm.regency || !dealerForm.district) {
      focusFirstInvalidField(!dealerForm.province ? 'province' : !dealerForm.regency ? 'regency' : 'district')
      await showAlert('Province, regency / city, and district are required.')
      return
    }

    const lat = parseCoordinateValue(dealerForm.lat)
    const lng = parseCoordinateValue(dealerForm.lng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      focusFirstInvalidField(!Number.isFinite(lat) ? 'lat' : 'lng')
      await showAlert('Latitude/Longitude tidak valid')
      return
    }

    const payload = {
      name: dealerName,
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
      await reloadBusinessData()
      navigate(dealerBasePath)
    } catch (err: any) {
      await showAlert(err?.response?.data?.error || 'Failed to save dealer.')
    } finally {
      setSavingDealer(false)
    }
  }

  const submitFinance = async (e: FormEvent) => {
    e.preventDefault()
    if ((isCompanyEdit && !canUpdate) || (!isCompanyEdit && !canCreate)) return

    const financeCompanyName = financeForm.name.trim()

    if (financeCompanyName.length < 3) {
      focusFirstInvalidField('name')
      await showAlert('Finance company name must be at least 3 characters long.')
      return
    }
    if (!financeForm.phone.trim()) {
      focusFirstInvalidField('phone')
      await showAlert('Phone number is required.')
      return
    }
    if (!financeForm.province || !financeForm.regency || !financeForm.district) {
      focusFirstInvalidField(!financeForm.province ? 'province' : !financeForm.regency ? 'regency' : 'district')
      await showAlert('Province, regency / city, and district are required.')
      return
    }

    const payload = {
      name: financeCompanyName,
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
      await reloadBusinessData()
      navigate(financeBasePath)
    } catch (err: any) {
      await showAlert(err?.response?.data?.error || 'Failed to save finance company.')
    } finally {
      setSavingFinance(false)
    }
  }

  const removeDealer = async (id: string) => {
    if (!canDelete) return
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
      await reloadBusinessData()
    } catch (err: any) {
      await showAlert(err?.response?.data?.error || 'Failed to delete dealer.')
    }
  }

  const removeFinance = async (id: string) => {
    if (!canDelete) return
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
      await reloadBusinessData()
    } catch (err: any) {
      await showAlert(err?.response?.data?.error || 'Failed to delete finance company.')
    }
  }

  if (!canView) {
    return (
      <div className="page">
        <div className="card">
          <h3>Map & Finance</h3>
          <div className="alert">You do not have permission to view business data.</div>
        </div>
      </div>
    )
  }

  if (isDealerDetail) {
    return (
      <Suspense fallback={<FinanceModeLoader />}>
        <DealerDetail
          canUpdate={canUpdate}
          dealerBasePath={dealerBasePath}
          navigate={navigate}
          selectedDealer={selectedDealer}
          selectedDealerDistrictName={selectedDealerDistrictName}
          selectedDealerProvinceName={selectedDealerProvinceName}
          selectedDealerRegencyName={selectedDealerRegencyName}
          selectedId={selectedId}
        />
      </Suspense>
    )
  }

  if (isCompanyDetail) {
    return (
      <Suspense fallback={<FinanceModeLoader />}>
        <CompanyDetail
          canUpdate={canUpdate}
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
      </Suspense>
    )
  }

  if (isDealerCreate || isDealerEdit) {
    return (
      <Suspense fallback={<FinanceModeLoader />}>
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
      </Suspense>
    )
  }

  if (isCompanyCreate || isCompanyEdit) {
    return (
      <Suspense fallback={<FinanceModeLoader />}>
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
      </Suspense>
    )
  }

  return (
    <div>
      <FinanceList
        canCreate={canCreate}
        canDelete={canDelete}
        canUpdate={canUpdate}
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
        isBusinessTabMode={isBusinessTabMode}
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
        setDealerLimit={setDealerLimit}
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
