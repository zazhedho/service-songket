import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchKabupaten, fetchKecamatan, fetchProvinces } from '../services/locationService'

export type ResolvedLocationNames = {
  province: string
  regency: string
  district: string
}

type UseLocationNameResolverParams<T> = {
  rows: T[]
  getKey: (row: T) => string
  getProvince: (row: T) => string | undefined
  getRegency: (row: T) => string | undefined
  getDistrict?: (row: T) => string | undefined
  normalize?: (value?: string) => string
}

type OptionItem = {
  id?: string
  code: string
  name: string
}

function looksLikeLocationCode(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return false
  if (/^\d+$/.test(raw)) return true
  if (/^[A-Z0-9._-]+$/.test(raw) && !/[a-z]/.test(raw)) return true
  return false
}

function humanizeLocationValue(value?: string) {
  const raw = String(value || '').trim()
  if (!raw) return '-'
  return looksLikeLocationCode(raw) ? '-' : raw
}

function defaultNormalize(value?: string) {
  return String(value || '').trim().toLowerCase()
}

export function useLocationNameResolver<T>({
  rows,
  getKey,
  getProvince,
  getRegency,
  getDistrict,
  normalize,
}: UseLocationNameResolverParams<T>) {
  const normalizeRef = useRef(normalize || defaultNormalize)
  const getKeyRef = useRef(getKey)
  const getProvinceRef = useRef(getProvince)
  const getRegencyRef = useRef(getRegency)
  const getDistrictRef = useRef(getDistrict)

  normalizeRef.current = normalize || defaultNormalize
  getKeyRef.current = getKey
  getProvinceRef.current = getProvince
  getRegencyRef.current = getRegency
  getDistrictRef.current = getDistrict

  const [provinceOptions, setProvinceOptions] = useState<OptionItem[]>([])
  const [provinceNameMap, setProvinceNameMap] = useState<Record<string, string>>({})
  const [provinceCodeMap, setProvinceCodeMap] = useState<Record<string, string>>({})
  const [regencyNameMap, setRegencyNameMap] = useState<Record<string, string>>({})
  const [districtNameMap, setDistrictNameMap] = useState<Record<string, string>>({})
  const [locationNamesByKey, setLocationNamesByKey] = useState<Record<string, ResolvedLocationNames>>({})

  useEffect(() => {
    let mounted = true
    const normalizeValue = normalizeRef.current

    fetchProvinces()
      .then((res) => {
        if (!mounted) return
        const rows = Array.isArray(res.data?.data) ? res.data.data : []
        const nextNameMap: Record<string, string> = {}
        const nextCodeMap: Record<string, string> = {}

        rows.forEach((row: any) => {
          const code = String(row?.code || row?.id || row?.name || '').trim()
          const name = String(row?.name || row?.code || row?.id || '').trim()
          if (!code || !name) return

          const codeKey = normalizeValue(code)
          const nameKey = normalizeValue(name)
          nextNameMap[codeKey] = name
          nextNameMap[nameKey] = name
          nextCodeMap[codeKey] = code
          nextCodeMap[nameKey] = code
        })

        setProvinceOptions(rows)
        setProvinceNameMap(nextNameMap)
        setProvinceCodeMap(nextCodeMap)
      })
      .catch(() => {
        if (!mounted) return
        setProvinceOptions([])
        setProvinceNameMap({})
        setProvinceCodeMap({})
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const normalizeValue = normalizeRef.current
    const getKeyValue = getKeyRef.current
    const getProvinceValue = getProvinceRef.current
    const getRegencyValue = getRegencyRef.current
    const getDistrictValue = getDistrictRef.current

    const resolveNames = async () => {
      if (!rows.length) {
        if (!mounted) return
        setRegencyNameMap({})
        setDistrictNameMap({})
        setLocationNamesByKey({})
        return
      }

      const nextRegencyNameMap: Record<string, string> = {}
      const nextDistrictNameMap: Record<string, string> = {}
      const nextLocationNamesByKey: Record<string, ResolvedLocationNames> = {}

      const uniqueProvinceValues = Array.from(
        new Set(rows.map((row) => String(getProvinceValue(row) || '').trim()).filter(Boolean)),
      )

      const provinceAliasMap = new Map<string, string[]>()
      const provinceCodeLookup = new Map<string, string>()

      await Promise.all(
        uniqueProvinceValues.map(async (provinceRaw) => {
          const provinceRawKey = normalizeValue(provinceRaw)
          const provinceCode = String(provinceCodeMap[provinceRawKey] || provinceRaw).trim()
          const provinceCodeKey = normalizeValue(provinceCode)
          provinceCodeLookup.set(provinceRawKey, provinceCode)
          if (!provinceCodeKey) return

          const provinceRow =
            provinceOptions.find((row: any) => normalizeValue(row?.code || row?.id || row?.name) === provinceCodeKey) ||
            provinceOptions.find((row: any) => normalizeValue(row?.name) === provinceRawKey)

          const provinceAliases = [provinceRaw]
          if (provinceRow) {
            provinceAliases.push(String(provinceRow?.code || provinceRow?.id || '').trim())
            provinceAliases.push(String(provinceRow?.name || '').trim())
          }
          provinceAliasMap.set(provinceRawKey, provinceAliases)

          try {
            const kabRes = await fetchKabupaten(provinceCode)
            const rawRegencies = Array.isArray(kabRes.data?.data) ? kabRes.data.data : []
            rawRegencies.forEach((row: any) => {
              const regCode = String(row?.code || row?.id || row?.name || '').trim()
              const regName = String(row?.name || row?.code || row?.id || '').trim()
              if (!regCode || !regName) return

              const regCodeKey = normalizeValue(regCode)
              const regNameKey = normalizeValue(regName)

              provinceAliases
                .map((value) => normalizeValue(value))
                .filter(Boolean)
                .forEach((provinceKey) => {
                  nextRegencyNameMap[`${provinceKey}|${regCodeKey}`] = regName
                  nextRegencyNameMap[`${provinceKey}|${regNameKey}`] = regName
                })
            })
          } catch {
            // noop
          }
        }),
      )

      if (getDistrictValue) {
        const regencyPairs = Array.from(
          new Set(
            rows
              .map((row) => {
                const provinceRaw = String(getProvinceValue(row) || '').trim()
                const regencyRaw = String(getRegencyValue(row) || '').trim()
                if (!provinceRaw || !regencyRaw) return ''
                const provinceCode = String(provinceCodeLookup.get(normalizeValue(provinceRaw)) || provinceRaw).trim()
                if (!provinceCode) return ''
                return `${provinceRaw}::${provinceCode}::${regencyRaw}`
              })
              .filter(Boolean),
          ),
        )

        await Promise.all(
          regencyPairs.map(async (pair) => {
            const [provinceRaw, provinceCode, regencyRaw] = pair.split('::')
            const provinceAliases = provinceAliasMap.get(normalizeValue(provinceRaw)) || [provinceRaw]
            const regencyName = (() => {
              const regencyRawKey = normalizeValue(regencyRaw)
              for (const alias of provinceAliases) {
                const found = nextRegencyNameMap[`${normalizeValue(alias)}|${regencyRawKey}`]
                if (found) return found
              }
              return regencyRaw
            })()

            try {
              const kecRes = await fetchKecamatan(provinceCode, regencyRaw)
              const rawDistricts = Array.isArray(kecRes.data?.data) ? kecRes.data.data : []
              rawDistricts.forEach((row: any) => {
                const districtCode = String(row?.code || row?.id || row?.name || '').trim()
                const districtName = String(row?.name || row?.code || row?.id || '').trim()
                if (!districtCode || !districtName) return

                const districtCodeKey = normalizeValue(districtCode)
                const districtNameKey = normalizeValue(districtName)
                const regencyAliases = [regencyRaw, regencyName]

                provinceAliases
                  .map((value) => normalizeValue(value))
                  .filter(Boolean)
                  .forEach((provinceKey) => {
                    regencyAliases
                      .map((value) => normalizeValue(value))
                      .filter(Boolean)
                      .forEach((regencyKey) => {
                        nextDistrictNameMap[`${provinceKey}|${regencyKey}|${districtCodeKey}`] = districtName
                        nextDistrictNameMap[`${provinceKey}|${regencyKey}|${districtNameKey}`] = districtName
                      })
                  })
              })
            } catch {
              // noop
            }
          }),
        )
      }

      rows.forEach((row) => {
        const key = String(getKeyValue(row) || '').trim()
        if (!key) return

        const provinceRaw = String(getProvinceValue(row) || '').trim()
        const regencyRaw = String(getRegencyValue(row) || '').trim()
        const districtRaw = String(getDistrictValue?.(row) || '').trim()

        const provinceName = provinceNameMap[normalizeValue(provinceRaw)] || humanizeLocationValue(provinceRaw)
        const provinceAliases = [provinceRaw, provinceName, provinceCodeMap[normalizeValue(provinceRaw)] || provinceRaw]
          .map((value) => normalizeValue(value))
          .filter(Boolean)

        let regencyName = humanizeLocationValue(regencyRaw)
        const regencyKey = normalizeValue(regencyRaw)
        for (const alias of provinceAliases) {
          const found = nextRegencyNameMap[`${alias}|${regencyKey}`]
          if (found) {
            regencyName = found
            break
          }
        }

        let districtName = humanizeLocationValue(districtRaw)
        if (districtRaw && getDistrictValue) {
          const districtKey = normalizeValue(districtRaw)
          const regencyAliases = [regencyRaw, regencyName].map((value) => normalizeValue(value)).filter(Boolean)
          for (const provinceAlias of provinceAliases) {
            for (const regencyAlias of regencyAliases) {
              const found = nextDistrictNameMap[`${provinceAlias}|${regencyAlias}|${districtKey}`]
              if (found) {
                districtName = found
                break
              }
            }
          }
        }

        nextLocationNamesByKey[key] = {
          province: provinceName || '-',
          regency: regencyName || '-',
          district: districtName || '-',
        }
      })

      if (!mounted) return
      setRegencyNameMap(nextRegencyNameMap)
      setDistrictNameMap(nextDistrictNameMap)
      setLocationNamesByKey(nextLocationNamesByKey)
    }

    void resolveNames()

    return () => {
      mounted = false
    }
  }, [rows, provinceCodeMap, provinceNameMap, provinceOptions])

  const displayProvince = (provinceValue?: string) => {
    const raw = String(provinceValue || '').trim()
    if (!raw) return '-'
    return provinceNameMap[normalizeRef.current(raw)] || humanizeLocationValue(raw)
  }

  const displayRegency = (provinceValue?: string, regencyValue?: string) => {
    const regRaw = String(regencyValue || '').trim()
    if (!regRaw) return '-'

    const provinceRaw = String(provinceValue || '').trim()
    const provinceName = displayProvince(provinceRaw)
    const normalizeValue = normalizeRef.current
    const provinceCode = provinceCodeMap[normalizeValue(provinceRaw)] || provinceRaw
    const lookupKeys = [provinceRaw, provinceName, provinceCode].map((value) => normalizeValue(value)).filter(Boolean)
    const regKey = normalizeValue(regRaw)

    for (const key of lookupKeys) {
      const found = regencyNameMap[`${key}|${regKey}`]
      if (found) return found
    }

    return humanizeLocationValue(regRaw)
  }

  return useMemo(() => ({
    locationNamesByKey,
    displayProvince,
    displayRegency,
  }), [locationNamesByKey, provinceNameMap, provinceCodeMap, regencyNameMap])
}
