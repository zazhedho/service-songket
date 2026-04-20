import api from './api'

const provincesCache = new Map<string, Promise<any>>()
const citiesCache = new Map<string, Promise<any>>()
const districtsCache = new Map<string, Promise<any>>()

const normalizeLocationOptions = (payload: any) => {
  if (!payload) return []

  if (Array.isArray(payload)) {
    return payload
      .map((item) => {
        if (!item) return null

        if (typeof item === 'string') {
          return { code: item, name: item }
        }

        const code = item.code ?? item.id ?? item.value ?? item.kode ?? ''
        const name = item.name ?? item.label ?? item.text ?? item.nama ?? ''

        if (!code && !name) return null

        return {
          code: String(code || name),
          name: String(name || code),
        }
      })
      .filter(Boolean)
  }

  if (typeof payload === 'object') {
    return Object.entries(payload).map(([code, name]) => ({
      code: String(code),
      name: String(name || code),
    }))
  }

  return []
}

const normalizeLocationResponse = (response: any) => {
  if (!response) return response

  const hasNestedData = response.data && typeof response.data === 'object' && 'data' in response.data
  if (hasNestedData) {
    response.data.data = normalizeLocationOptions(response.data.data)
    return response
  }

  response.data = {
    ...(typeof response.data === 'object' && !Array.isArray(response.data) ? response.data : {}),
    data: normalizeLocationOptions(response.data),
  }
  return response
}

function withCache(cache: Map<string, Promise<any>>, key: string, factory: () => Promise<any>) {
  const cached = cache.get(key)
  if (cached) return cached

  const request = factory().catch((error) => {
    cache.delete(key)
    throw error
  })

  cache.set(key, request)
  return request
}

export const fetchProvinces = () =>
  withCache(provincesCache, 'all', () =>
    api.get('/api/location/province').then(normalizeLocationResponse),
  )

export const fetchKabupaten = (pro: string) =>
  withCache(citiesCache, String(pro || '').trim(), () =>
    api.get('/api/location/city', { params: { pro } }).then(normalizeLocationResponse),
  )

export const fetchKecamatan = (pro: string, kab: string) =>
  withCache(districtsCache, `${String(pro || '').trim()}::${String(kab || '').trim()}`, () =>
    api.get('/api/location/district', { params: { pro, kab } }).then(normalizeLocationResponse),
  )

const locationService = {
  fetchProvinces,
  fetchKabupaten,
  fetchKecamatan,
}

export default locationService
