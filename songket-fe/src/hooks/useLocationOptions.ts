import { useEffect, useState } from 'react'
import { fetchKabupaten, fetchKecamatan, fetchProvinces } from '../services/locationService'

export type LocationOption = {
  code: string
  name: string
}

type UseLocationOptionsParams = {
  enabled?: boolean
  loadProvinces?: boolean
  withDistricts?: boolean
  provinceCode?: string
  regencyCode?: string
}

export function useLocationOptions({
  enabled = true,
  loadProvinces = true,
  withDistricts = false,
  provinceCode = '',
  regencyCode = '',
}: UseLocationOptionsParams = {}) {
  const [provinces, setProvinces] = useState<LocationOption[]>([])
  const [regencies, setRegencies] = useState<LocationOption[]>([])
  const [districts, setDistricts] = useState<LocationOption[]>([])

  useEffect(() => {
    if (!enabled || !loadProvinces) {
      if (!enabled) setProvinces([])
      return
    }

    fetchProvinces()
      .then((res) => {
        const rows = Array.isArray(res.data?.data) ? res.data.data : []
        setProvinces(rows)
      })
      .catch(() => setProvinces([]))
  }, [enabled, loadProvinces])

  useEffect(() => {
    if (!enabled || !provinceCode) {
      setRegencies([])
      setDistricts([])
      return
    }

    fetchKabupaten(provinceCode)
      .then((res) => {
        const rows = Array.isArray(res.data?.data) ? res.data.data : []
        setRegencies(rows)
      })
      .catch(() => {
        setRegencies([])
        setDistricts([])
      })
  }, [enabled, provinceCode])

  useEffect(() => {
    if (!enabled || !withDistricts || !provinceCode || !regencyCode) {
      setDistricts([])
      return
    }

    fetchKecamatan(provinceCode, regencyCode)
      .then((res) => {
        const rows = Array.isArray(res.data?.data) ? res.data.data : []
        setDistricts(rows)
      })
      .catch(() => setDistricts([]))
  }, [enabled, provinceCode, regencyCode, withDistricts])

  return {
    provinces,
    regencies,
    districts,
    setProvinces,
    setRegencies,
    setDistricts,
  }
}
