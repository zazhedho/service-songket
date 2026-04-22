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

function buildProvinceAliasKeys(
  provinceRaw: string,
  provinceNameMap: Record<string, string>,
  provinceCodeMap: Record<string, string>,
  normalizeValue: (value?: string) => string,
) {
  const provinceRawKey = normalizeValue(provinceRaw)
  const provinceCode = String(provinceCodeMap[provinceRawKey] || provinceRaw).trim()
  const provinceCodeKey = normalizeValue(provinceCode)
  const aliases = new Set<string>()

  ;[
    provinceRaw,
    provinceCode,
    provinceNameMap[provinceRawKey],
    provinceNameMap[provinceCodeKey],
  ]
    .map((value) => normalizeValue(value))
    .filter(Boolean)
    .forEach((value) => aliases.add(value))

  return Array.from(aliases)
}

function resolveRegencyNameFromMaps(
  provinceAliases: string[],
  regencyRaw: string,
  regencyNameMap: Record<string, string>,
  normalizeValue: (value?: string) => string,
) {
  const regencyKey = normalizeValue(regencyRaw)
  for (const provinceAlias of provinceAliases) {
    const found = regencyNameMap[`${provinceAlias}|${regencyKey}`]
    if (found) return found
  }
  return humanizeLocationValue(regencyRaw)
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
  const requestedRegencyProvinceKeysRef = useRef<Set<string>>(new Set())
  const requestedDistrictKeysRef = useRef<Set<string>>(new Set())

  normalizeRef.current = normalize || defaultNormalize
  getKeyRef.current = getKey
  getProvinceRef.current = getProvince
  getRegencyRef.current = getRegency
  getDistrictRef.current = getDistrict

  const [provinceNameMap, setProvinceNameMap] = useState<Record<string, string>>({})
  const [provinceCodeMap, setProvinceCodeMap] = useState<Record<string, string>>({})
  const [regencyNameMap, setRegencyNameMap] = useState<Record<string, string>>({})
  const [districtNameMap, setDistrictNameMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    const normalizeValue = normalizeRef.current

    fetchProvinces()
      .then((res) => {
        if (!mounted) return
        const provinceRows = Array.isArray(res.data?.data) ? res.data.data : []
        const nextNameMap: Record<string, string> = {}
        const nextCodeMap: Record<string, string> = {}

        provinceRows.forEach((row: OptionItem) => {
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

        setProvinceNameMap(nextNameMap)
        setProvinceCodeMap(nextCodeMap)
      })
      .catch(() => {
        if (!mounted) return
        setProvinceNameMap({})
        setProvinceCodeMap({})
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!rows.length || Object.keys(provinceCodeMap).length === 0) return

    let mounted = true
    const normalizeValue = normalizeRef.current
    const getProvinceValue = getProvinceRef.current
    const getRegencyValue = getRegencyRef.current
    const getDistrictValue = getDistrictRef.current

    const resolveNames = async () => {
      const nextRegencyNameMap: Record<string, string> = {}
      const nextDistrictNameMap: Record<string, string> = {}

      const uniqueProvinceValues = Array.from(
        new Set(rows.map((row) => String(getProvinceValue(row) || '').trim()).filter(Boolean)),
      )

      await Promise.all(
        uniqueProvinceValues.map(async (provinceRaw) => {
          const provinceAliases = buildProvinceAliasKeys(provinceRaw, provinceNameMap, provinceCodeMap, normalizeValue)
          const provinceCode = String(provinceCodeMap[normalizeValue(provinceRaw)] || provinceRaw).trim()
          const provinceCodeKey = normalizeValue(provinceCode)
          if (!provinceCodeKey || requestedRegencyProvinceKeysRef.current.has(provinceCodeKey)) return

          requestedRegencyProvinceKeysRef.current.add(provinceCodeKey)

          try {
            const kabRes = await fetchKabupaten(provinceCode)
            const rawRegencies = Array.isArray(kabRes.data?.data) ? kabRes.data.data : []
            rawRegencies.forEach((row: any) => {
              const regCode = String(row?.code || row?.id || row?.name || '').trim()
              const regName = String(row?.name || row?.code || row?.id || '').trim()
              if (!regCode || !regName) return

              const regCodeKey = normalizeValue(regCode)
              const regNameKey = normalizeValue(regName)

              provinceAliases.forEach((provinceAlias) => {
                nextRegencyNameMap[`${provinceAlias}|${regCodeKey}`] = regName
                nextRegencyNameMap[`${provinceAlias}|${regNameKey}`] = regName
              })
            })
          } catch {
            requestedRegencyProvinceKeysRef.current.delete(provinceCodeKey)
          }
        }),
      )

      if (!mounted) return

      const mergedRegencyNameMap = Object.keys(nextRegencyNameMap).length > 0
        ? { ...regencyNameMap, ...nextRegencyNameMap }
        : regencyNameMap

      if (getDistrictValue) {
        const uniqueDistrictPairs = Array.from(
          new Set(
            rows
              .map((row) => {
                const provinceRaw = String(getProvinceValue(row) || '').trim()
                const regencyRaw = String(getRegencyValue(row) || '').trim()
                if (!provinceRaw || !regencyRaw) return ''

                const provinceCode = String(provinceCodeMap[normalizeValue(provinceRaw)] || provinceRaw).trim()
                const provinceCodeKey = normalizeValue(provinceCode)
                const regencyKey = normalizeValue(regencyRaw)
                if (!provinceCodeKey || !regencyKey) return ''
                return `${provinceCodeKey}::${regencyKey}::${provinceCode}::${regencyRaw}`
              })
              .filter(Boolean),
          ),
        )

        await Promise.all(
          uniqueDistrictPairs.map(async (entry) => {
            const [cacheProvinceKey, cacheRegencyKey, provinceCode, regencyRaw] = entry.split('::')
            const requestKey = `${cacheProvinceKey}::${cacheRegencyKey}`
            if (requestedDistrictKeysRef.current.has(requestKey)) return

            requestedDistrictKeysRef.current.add(requestKey)

            try {
              const kecRes = await fetchKecamatan(provinceCode, regencyRaw)
              const rawDistricts = Array.isArray(kecRes.data?.data) ? kecRes.data.data : []
              const provinceAliases = buildProvinceAliasKeys(provinceCode, provinceNameMap, provinceCodeMap, normalizeValue)
              const regencyName = resolveRegencyNameFromMaps(provinceAliases, regencyRaw, mergedRegencyNameMap, normalizeValue)
              const regencyAliases = new Set<string>()

              ;[regencyRaw, regencyName]
                .map((value) => normalizeValue(value))
                .filter(Boolean)
                .forEach((value) => regencyAliases.add(value))

              rawDistricts.forEach((row: any) => {
                const districtCode = String(row?.code || row?.id || row?.name || '').trim()
                const districtName = String(row?.name || row?.code || row?.id || '').trim()
                if (!districtCode || !districtName) return

                const districtCodeKey = normalizeValue(districtCode)
                const districtNameKey = normalizeValue(districtName)

                provinceAliases.forEach((provinceAlias) => {
                  regencyAliases.forEach((regencyAlias) => {
                    nextDistrictNameMap[`${provinceAlias}|${regencyAlias}|${districtCodeKey}`] = districtName
                    nextDistrictNameMap[`${provinceAlias}|${regencyAlias}|${districtNameKey}`] = districtName
                  })
                })
              })
            } catch {
              requestedDistrictKeysRef.current.delete(requestKey)
            }
          }),
        )
      }

      if (!mounted) return

      if (Object.keys(nextRegencyNameMap).length > 0) {
        setRegencyNameMap((prev) => ({ ...prev, ...nextRegencyNameMap }))
      }
      if (Object.keys(nextDistrictNameMap).length > 0) {
        setDistrictNameMap((prev) => ({ ...prev, ...nextDistrictNameMap }))
      }
    }

    void resolveNames()

    return () => {
      mounted = false
    }
  }, [rows, provinceCodeMap, provinceNameMap, regencyNameMap])

  const locationNamesByKey = useMemo(() => {
    const normalizeValue = normalizeRef.current
    const getKeyValue = getKeyRef.current
    const getProvinceValue = getProvinceRef.current
    const getRegencyValue = getRegencyRef.current
    const getDistrictValue = getDistrictRef.current
    const nextLocationNamesByKey: Record<string, ResolvedLocationNames> = {}

    rows.forEach((row) => {
      const key = String(getKeyValue(row) || '').trim()
      if (!key) return

      const provinceRaw = String(getProvinceValue(row) || '').trim()
      const regencyRaw = String(getRegencyValue(row) || '').trim()
      const districtRaw = String(getDistrictValue?.(row) || '').trim()

      const provinceAliases = buildProvinceAliasKeys(provinceRaw, provinceNameMap, provinceCodeMap, normalizeValue)
      const provinceName = provinceNameMap[normalizeValue(provinceRaw)] || humanizeLocationValue(provinceRaw)
      const regencyName = resolveRegencyNameFromMaps(provinceAliases, regencyRaw, regencyNameMap, normalizeValue)

      let districtName = humanizeLocationValue(districtRaw)
      if (districtRaw && getDistrictValue) {
        const districtKey = normalizeValue(districtRaw)
        const regencyAliases = [regencyRaw, regencyName].map((value) => normalizeValue(value)).filter(Boolean)
        for (const provinceAlias of provinceAliases) {
          for (const regencyAlias of regencyAliases) {
            const found = districtNameMap[`${provinceAlias}|${regencyAlias}|${districtKey}`]
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

    return nextLocationNamesByKey
  }, [districtNameMap, provinceCodeMap, provinceNameMap, regencyNameMap, rows])

  const displayProvince = (provinceValue?: string) => {
    const raw = String(provinceValue || '').trim()
    if (!raw) return '-'
    return provinceNameMap[normalizeRef.current(raw)] || humanizeLocationValue(raw)
  }

  const displayRegency = (provinceValue?: string, regencyValue?: string) => {
    const regRaw = String(regencyValue || '').trim()
    if (!regRaw) return '-'

    const provinceAliases = buildProvinceAliasKeys(String(provinceValue || '').trim(), provinceNameMap, provinceCodeMap, normalizeRef.current)
    const found = resolveRegencyNameFromMaps(provinceAliases, regRaw, regencyNameMap, normalizeRef.current)
    return found || humanizeLocationValue(regRaw)
  }

  return useMemo(() => ({
    locationNamesByKey,
    displayProvince,
    displayRegency,
  }), [locationNamesByKey, provinceCodeMap, provinceNameMap, regencyNameMap])
}
