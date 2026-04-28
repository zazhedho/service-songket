export type GeocodedPlace = {
  id: string
  name: string
  formattedAddress: string
  lat: number
  lng: number
  address: Record<string, any>
}

type SearchOptions = {
  viewbox?: string
}

const reverseCache = new Map<string, GeocodedPlace>()
const reverseInflight = new Map<string, Promise<GeocodedPlace>>()
const searchCache = new Map<string, GeocodedPlace[]>()
const searchInflight = new Map<string, Promise<GeocodedPlace[]>>()

function trimCache<T>(cache: Map<string, T>, maxEntries: number) {
  while (cache.size > maxEntries) {
    const firstKey = cache.keys().next().value
    if (!firstKey) break
    cache.delete(firstKey)
  }
}

function normalizeNominatimPlace(item: any, index: number): GeocodedPlace | null {
  const lat = Number(item?.lat)
  const lng = Number(item?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const formattedAddress = String(item?.display_name || '').trim()
  const primaryName = String(item?.name || '').trim()
  const fallbackName = formattedAddress.split(',')[0]?.trim() || 'Selected Location'

  return {
    id: String(item?.place_id || `${lat}-${lng}-${index}`),
    name: primaryName || fallbackName,
    formattedAddress,
    lat,
    lng,
    address: (item?.address || {}) as Record<string, any>,
  }
}

function buildSearchQueryVariants(query: string) {
  const raw = String(query || '').trim()
  if (!raw) return []

  const variants = [raw]
  const expanded = raw
    .replace(/\bsman\b/gi, 'sma negeri')
    .replace(/\bsmpn\b/gi, 'smp negeri')
    .replace(/\bsdn\b/gi, 'sd negeri')
    .replace(/\bsmk\b/gi, 'smk')

  if (expanded.toLowerCase() !== raw.toLowerCase()) {
    variants.push(expanded)
  }

  return Array.from(new Set(variants))
}

function normalizeSearchText(value?: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeSearchText(value?: string) {
  return normalizeSearchText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
}

function extractNumberTokens(tokens: string[]) {
  return tokens.filter((token) => /^[0-9]+$/.test(token))
}

function rankPlacesByQuery(query: string, places: GeocodedPlace[]) {
  if (!places.length) return places
  const queryNorm = normalizeSearchText(query)
  const queryTokens = tokenizeSearchText(query)
  const queryNumbers = extractNumberTokens(queryTokens)

  const scored = places.map((place) => {
    const nameNorm = normalizeSearchText(place.name)
    const candidate = normalizeSearchText(`${place.name} ${place.formattedAddress}`)
    const candidateTokens = tokenizeSearchText(candidate)
    const candidateNumbers = extractNumberTokens(candidateTokens)
    let score = 0

    if (candidate.includes(queryNorm)) score += 140
    if (nameNorm.includes(queryNorm)) score += 90

    let matchedTokens = 0
    for (const token of queryTokens) {
      if (token.length <= 1 && !/^[0-9]+$/.test(token)) continue
      if (candidateTokens.includes(token)) {
        matchedTokens += 1
        score += 16
      } else {
        score -= 10
      }
    }

    if (queryNumbers.length > 0) {
      const allNumbersMatch = queryNumbers.every((num) => candidateNumbers.includes(num))
      score += allNumbersMatch ? 70 : -130
    }

    const coverage = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0
    if (coverage < 0.5) score -= 90
    if (nameNorm.startsWith(queryTokens[0] || '')) score += 20

    return { place, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const filtered = scored.filter((item, index) => item.score >= -20 || index < 2)
  return filtered.map((item) => item.place)
}

async function runNominatimSearch({
  queryText,
  includeCountry,
  viewbox,
  appendIndonesia,
  limit,
}: {
  queryText: string
  includeCountry: boolean
  viewbox?: string
  appendIndonesia: boolean
  limit: number
}) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
    q: appendIndonesia ? `${queryText}, Indonesia` : queryText,
    dedupe: '1',
    'accept-language': 'id,en',
  })

  if (includeCountry) {
    params.set('countrycodes', 'id')
  }

  if (viewbox) {
    params.set('viewbox', viewbox)
  }

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
  const payload = await response.json()
  const rows = Array.isArray(payload) ? payload : []
  return rows
    .map((item, index) => normalizeNominatimPlace(item, index))
    .filter(Boolean) as GeocodedPlace[]
}

async function runPhotonSearch(queryText: string, limit: number) {
  const params = new URLSearchParams({
    q: queryText,
    limit: String(limit),
  })

  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`)
  if (!response.ok) {
    return []
  }
  const payload = await response.json()
  const features = Array.isArray(payload?.features) ? payload.features : []

  return features
    .map((feature: any, index: number) => {
      const coords = feature?.geometry?.coordinates
      const lng = Number(Array.isArray(coords) ? coords[0] : Number.NaN)
      const lat = Number(Array.isArray(coords) ? coords[1] : Number.NaN)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

      const props = feature?.properties || {}
      const name = String(props?.name || props?.street || '').trim() || 'Selected Location'
      const formattedAddress = [
        name,
        [props?.street, props?.housenumber].filter(Boolean).join(' ').trim(),
        props?.district,
        props?.city,
        props?.county,
        props?.state,
        props?.country,
      ]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ')

      return {
        id: String(props?.osm_id || feature?.id || `${lat}-${lng}-${index}`),
        name,
        formattedAddress,
        lat,
        lng,
        address: {
          state: props?.state || '',
          province: props?.state || '',
          region: props?.state || '',
          county: props?.county || props?.city || '',
          regency: props?.county || props?.city || '',
          city: props?.city || props?.county || '',
          municipality: props?.city || props?.county || '',
          city_district: props?.district || props?.suburb || '',
          district: props?.district || props?.suburb || '',
          township: props?.district || '',
          suburb: props?.suburb || props?.district || '',
          village: props?.village || props?.locality || '',
          hamlet: props?.village || props?.locality || '',
          neighbourhood: props?.suburb || '',
          quarter: props?.suburb || '',
        } as Record<string, any>,
      } satisfies GeocodedPlace
    })
    .filter(Boolean) as GeocodedPlace[]
}

export async function reverseGeocodedPlace(lat: number, lng: number) {
  const key = `${lat.toFixed(6)}|${lng.toFixed(6)}`
  const cached = reverseCache.get(key)
  if (cached) return cached

  const inflight = reverseInflight.get(key)
  if (inflight) return inflight

  const request = (async () => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        String(lat),
      )}&lon=${encodeURIComponent(String(lng))}&zoom=18&addressdetails=1`,
    )
    const payload = await res.json()
    const normalized = normalizeNominatimPlace(
      {
        place_id: payload?.place_id || `${lat}-${lng}`,
        display_name: payload?.display_name || '',
        lat: String(lat),
        lon: String(lng),
        address: payload?.address || {},
        name: payload?.name || '',
      },
      0,
    )

    const result =
      normalized ||
      ({
        id: `${lat}-${lng}`,
        name: 'Pinned Location',
        formattedAddress: '',
        lat,
        lng,
        address: {},
      } satisfies GeocodedPlace)

    reverseCache.set(key, result)
    trimCache(reverseCache, 120)
    reverseInflight.delete(key)
    return result
  })().catch((error) => {
    reverseInflight.delete(key)
    throw error
  })

  reverseInflight.set(key, request)
  return request
}

export async function searchGeocodedPlaces(query: string, limit: number, options?: SearchOptions) {
  const normalizedQuery = String(query || '').trim()
  if (!normalizedQuery) return []

  const viewbox = String(options?.viewbox || '').trim()
  const key = `${normalizedQuery.toLowerCase()}|${limit}|${viewbox}`
  const cached = searchCache.get(key)
  if (cached) return cached

  const inflight = searchInflight.get(key)
  if (inflight) return inflight

  const request = (async () => {
    const queryVariants = buildSearchQueryVariants(normalizedQuery)
    const strategies = [
      { includeCountry: true, useViewbox: true, appendIndonesia: false },
      { includeCountry: true, useViewbox: false, appendIndonesia: false },
      { includeCountry: false, useViewbox: false, appendIndonesia: true },
    ] as const

    let nominatimResult: GeocodedPlace[] = []
    for (const queryText of queryVariants) {
      for (const strategy of strategies) {
        try {
          const result = await runNominatimSearch({
            queryText,
            includeCountry: strategy.includeCountry,
            viewbox: strategy.useViewbox ? viewbox : '',
            appendIndonesia: strategy.appendIndonesia,
            limit,
          })
          if (result.length > 0) {
            nominatimResult = result
            break
          }
        } catch {
          // try next strategy
        }
      }
      if (nominatimResult.length > 0) break
    }

    let photonResult: GeocodedPlace[] = []
    for (const queryText of queryVariants) {
      try {
        photonResult = await runPhotonSearch(queryText, limit)
        if (photonResult.length > 0) break
      } catch {
        photonResult = []
      }
    }

    const merged = [...nominatimResult, ...photonResult]
    if (!merged.length) {
      searchCache.set(key, [])
      trimCache(searchCache, 120)
      searchInflight.delete(key)
      return []
    }

    const dedup = new Map<string, GeocodedPlace>()
    for (const item of merged) {
      const dedupKey = `${item.lat.toFixed(6)}|${item.lng.toFixed(6)}|${item.name.toLowerCase()}`
      if (!dedup.has(dedupKey)) {
        dedup.set(dedupKey, item)
      }
    }

    const result = rankPlacesByQuery(queryVariants[0], Array.from(dedup.values()))
    searchCache.set(key, result)
    trimCache(searchCache, 120)
    searchInflight.delete(key)
    return result
  })().catch((error) => {
    searchInflight.delete(key)
    throw error
  })

  searchInflight.set(key, request)
  return request
}
