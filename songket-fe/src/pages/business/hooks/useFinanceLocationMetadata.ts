import { useEffect, useRef, useState } from 'react'
import {
  fetchKabupaten,
  fetchKecamatan,
  fetchProvinces,
} from '../../../services/locationService'
import {
  lookupOptionName,
  type CompanyLocationNames,
  type DealerLocationNames,
  type Option,
} from '../components/financeHelpers'

type UseFinanceLocationMetadataParams = {
  dealers: any[]
  financeCompanies: any[]
  isDealerDetail: boolean
  isCompanyDetail: boolean
  provinces: Option[]
  selectedCompany: any
  selectedDealer: any
  setProvinces: React.Dispatch<React.SetStateAction<Option[]>>
}

export function useFinanceLocationMetadata({
  dealers,
  financeCompanies,
  isDealerDetail,
  isCompanyDetail,
  provinces,
  selectedCompany,
  selectedDealer,
  setProvinces,
}: UseFinanceLocationMetadataParams) {
  const dealerKabupatenCacheRef = useRef<Record<string, Option[]>>({})
  const dealerKecamatanCacheRef = useRef<Record<string, Option[]>>({})
  const [dealerLocationNameMap, setDealerLocationNameMap] = useState<Record<string, DealerLocationNames>>({})
  const [financeCompanyLocationNameMap, setFinanceCompanyLocationNameMap] = useState<Record<string, CompanyLocationNames>>({})
  const [detailDealerKabupaten, setDetailDealerKabupaten] = useState<Option[]>([])
  const [detailDealerKecamatan, setDetailDealerKecamatan] = useState<Option[]>([])
  const [detailCompanyKabupaten, setDetailCompanyKabupaten] = useState<Option[]>([])
  const [detailCompanyKecamatan, setDetailCompanyKecamatan] = useState<Option[]>([])

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
          if (mounted) setProvinces(provinceOptions)
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
  }, [dealers, provinces, setProvinces])

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

  return {
    dealerLocationNameMap,
    detailCompanyKabupaten,
    detailCompanyKecamatan,
    detailDealerKabupaten,
    detailDealerKecamatan,
    fetchKabupatenByProvinceCode,
    fetchKecamatanByProvinceRegencyCode,
    financeCompanyLocationNameMap,
  }
}
