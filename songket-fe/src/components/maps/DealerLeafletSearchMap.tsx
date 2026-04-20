import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L, { type Map as LeafletMap } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useAlert } from '../common/ConfirmDialog'

import 'leaflet/dist/leaflet.css'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

export type DealerLeafletPlace = {
  id: string
  name: string
  formattedAddress: string
  lat: number
  lng: number
  address: Record<string, any>
}

type DealerLeafletSearchMapProps = {
  center: [number, number]
  zoom: number
  lat?: number
  lng?: number
  onPick: (place: DealerLeafletPlace) => void
}

function normalizeNominatimPlace(item: any, index: number): DealerLeafletPlace | null {
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

async function reverseGeocode(lat: number, lng: number) {
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

  if (normalized) return normalized
  return {
    id: `${lat}-${lng}`,
    name: 'Pinned Location',
    formattedAddress: '',
    lat,
    lng,
    address: {},
  } satisfies DealerLeafletPlace
}

function buildViewBox(map: LeafletMap | null) {
  if (!map) return ''
  const bounds = map.getBounds()
  return `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`
}

async function searchPlaces(query: string, limit: number, map: LeafletMap | null) {
  const queryVariants = buildSearchQueryVariants(query)

  const runNominatim = async ({
    queryText,
    includeCountry,
    includeViewbox,
    appendIndonesia,
  }: {
    queryText: string
    includeCountry: boolean
    includeViewbox: boolean
    appendIndonesia: boolean
  }) => {
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

    if (includeViewbox) {
      const viewbox = buildViewBox(map)
      if (viewbox) {
        params.set('viewbox', viewbox)
      }
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
    const payload = await response.json()
    const rows = Array.isArray(payload) ? payload : []
    return rows
      .map((item, index) => normalizeNominatimPlace(item, index))
      .filter(Boolean) as DealerLeafletPlace[]
  }

  const runPhoton = async (queryText: string) => {
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
        } satisfies DealerLeafletPlace
      })
      .filter(Boolean) as DealerLeafletPlace[]
  }

  const strategies = [
    { includeCountry: true, includeViewbox: true, appendIndonesia: false },
    { includeCountry: true, includeViewbox: false, appendIndonesia: false },
    { includeCountry: false, includeViewbox: false, appendIndonesia: true },
  ] as const

  let nominatimResult: DealerLeafletPlace[] = []
  for (const queryText of queryVariants) {
    for (const strategy of strategies) {
      try {
        const result = await runNominatim({ ...strategy, queryText })
        if (result.length > 0) {
          nominatimResult = result
          break
        }
      } catch {
        // Try next strategy
      }
    }
    if (nominatimResult.length > 0) {
      break
    }
  }

  let photonResult: DealerLeafletPlace[] = []
  for (const queryText of queryVariants) {
    try {
      photonResult = await runPhoton(queryText)
      if (photonResult.length > 0) break
    } catch {
      photonResult = []
    }
  }

  const merged = [...nominatimResult, ...photonResult]
  if (!merged.length) return []

  const dedup = new Map<string, DealerLeafletPlace>()
  for (const item of merged) {
    const key = `${item.lat.toFixed(6)}|${item.lng.toFixed(6)}|${item.name.toLowerCase()}`
    if (!dedup.has(key)) {
      dedup.set(key, item)
    }
  }
  return rankPlacesByQuery(queryVariants[0], Array.from(dedup.values()))
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

function rankPlacesByQuery(query: string, places: DealerLeafletPlace[]) {
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

function LeafletMapBridge({
  onReady,
  onMapClick,
}: {
  onReady: (map: LeafletMap) => void
  onMapClick: (lat: number, lng: number) => void
}) {
  const map = useMap()

  useEffect(() => {
    onReady(map)
  }, [map, onReady])

  useMapEvents({
    click: (event) => {
      onMapClick(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

function MapFly({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 0.45 })
  }, [center, map])

  return null
}

export default function DealerLeafletSearchMap({
  center,
  zoom,
  lat,
  lng,
  onPick,
}: DealerLeafletSearchMapProps) {
  const showAlert = useAlert()
  const mapRef = useRef<LeafletMap | null>(null)
  const requestSeqRef = useRef(0)
  const blurTimerRef = useRef<number | null>(null)
  const keepMultiResultRef = useRef(false)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<DealerLeafletPlace[]>([])
  const [markers, setMarkers] = useState<DealerLeafletPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const centerPoint: [number, number] = useMemo(() => {
    if (markers.length > 0) {
      return [markers[0].lat, markers[0].lng]
    }
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [Number(lat), Number(lng)]
    }
    return center
  }, [center, lat, lng, markers])

  const fitMapToPlaces = useCallback((places: DealerLeafletPlace[]) => {
    const map = mapRef.current
    if (!map || places.length === 0) return

    if (places.length === 1) {
      map.flyTo([places[0].lat, places[0].lng], Math.max(map.getZoom(), 14), { duration: 0.45 })
      return
    }

    const bounds = L.latLngBounds(places.map((place) => [place.lat, place.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [36, 36] })
  }, [])

  const runKeywordSearch = useCallback(async () => {
    const keyword = query.trim()
    if (!keyword) {
      void showAlert('Please type location keyword.')
      setSuggestions([])
      return
    }

    requestSeqRef.current += 1
    const seq = requestSeqRef.current
    setSearching(true)
    try {
      const places = await searchPlaces(keyword, 10, mapRef.current)
      if (seq !== requestSeqRef.current) return

      if (places.length === 0) {
        void showAlert('Location not found for this keyword.')
        setMarkers([])
        setSuggestions([])
        keepMultiResultRef.current = false
        return
      }

      keepMultiResultRef.current = places.length > 1
      setMarkers(places)
      setSuggestions([])
      fitMapToPlaces(places)
      onPick(places[0])
      if (places.length === 1) {
        setQuery(places[0].formattedAddress || places[0].name)
      }
    } catch {
      if (seq !== requestSeqRef.current) return
      void showAlert('Failed to search location. Please try again.')
    } finally {
      if (seq === requestSeqRef.current) {
        setSearching(false)
      }
    }
  }, [fitMapToPlaces, onPick, query, showAlert])

  const selectSuggestion = useCallback(
    (place: DealerLeafletPlace) => {
      keepMultiResultRef.current = false
      setMarkers([place])
      setSuggestions([])
      setQuery(place.formattedAddress || place.name)
      setSearchFocused(true)
      fitMapToPlaces([place])
      onPick(place)
    },
    [fitMapToPlaces, onPick],
  )

  const handleMapClick = useCallback(async (nextLat: number, nextLng: number) => {
    keepMultiResultRef.current = false
    setSearching(true)
    try {
      const place = await reverseGeocode(nextLat, nextLng)
      setMarkers([place])
      setQuery(place.formattedAddress || query)
      setSuggestions([])
      onPick(place)
      fitMapToPlaces([place])
    } catch {
      const fallback: DealerLeafletPlace = {
        id: `${nextLat}-${nextLng}`,
        name: 'Pinned Location',
        formattedAddress: '',
        lat: nextLat,
        lng: nextLng,
        address: {},
      }
      setMarkers([fallback])
      onPick(fallback)
      fitMapToPlaces([fallback])
    } finally {
      setSearching(false)
    }
  }, [fitMapToPlaces, onPick, query])

  useEffect(() => {
    if (!searchFocused) {
      setSuggestions([])
      setLoadingSuggestions(false)
      return
    }

    const keyword = query.trim()
    if (keyword.length < 3) {
      setSuggestions([])
      setLoadingSuggestions(false)
      return
    }

    requestSeqRef.current += 1
    const seq = requestSeqRef.current
    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const places = await searchPlaces(keyword, 6, mapRef.current)
        if (seq !== requestSeqRef.current) return
        setSuggestions(places)
      } catch {
        if (seq !== requestSeqRef.current) return
        setSuggestions([])
      } finally {
        if (seq === requestSeqRef.current) {
          setLoadingSuggestions(false)
        }
      }
    }, 260)

    return () => {
      window.clearTimeout(timer)
    }
  }, [query, searchFocused])

  useEffect(() => {
    if (!(Number.isFinite(lat) && Number.isFinite(lng))) return
    if (keepMultiResultRef.current) return

    const synced: DealerLeafletPlace = {
      id: `coord-${Number(lat).toFixed(6)}-${Number(lng).toFixed(6)}`,
      name: 'Selected Location',
      formattedAddress: '',
      lat: Number(lat),
      lng: Number(lng),
      address: {},
    }
    setMarkers((prev) => {
      if (prev.length === 1 && Math.abs(prev[0].lat - synced.lat) < 0.000001 && Math.abs(prev[0].lng - synced.lng) < 0.000001) {
        return prev
      }
      return [synced]
    })
  }, [lat, lng])

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current)
        blurTimerRef.current = null
      }
    }
  }, [])

  return (
    <div className="leaflet-search-panel">
      <div className="leaflet-search-toolbar">
        <input
          className="leaflet-search-input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (!searchFocused) {
              setSearchFocused(true)
            }
          }}
          onClick={() => {
            if (!searchFocused) {
              setSearchFocused(true)
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            void runKeywordSearch()
          }}
          onFocus={() => {
            if (blurTimerRef.current) {
              window.clearTimeout(blurTimerRef.current)
              blurTimerRef.current = null
            }
            setSearchFocused(true)
          }}
          onBlur={() => {
            blurTimerRef.current = window.setTimeout(() => {
              setSearchFocused(false)
              blurTimerRef.current = null
            }, 140)
          }}
          placeholder="Search location in map"
          autoComplete="off"
        />
        <button type="button" className="btn-ghost" disabled={searching} onClick={() => void runKeywordSearch()}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchFocused && (
        <div className="leaflet-search-suggestions">
          {loadingSuggestions && (
            <div className="leaflet-search-empty">Searching suggestions...</div>
          )}
          {!loadingSuggestions && query.trim().length >= 3 && suggestions.length === 0 && (
            <div className="leaflet-search-empty">No suggestions found.</div>
          )}
          {!loadingSuggestions && suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              className="leaflet-search-item"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(item)}
            >
              {item.formattedAddress || item.name}
            </button>
          ))}
        </div>
      )}

      <MapContainer center={centerPoint} zoom={zoom} style={{ height: 320 }} scrollWheelZoom={false}>
        <MapFly center={centerPoint} />
        <LeafletMapBridge
          onReady={(map) => {
            mapRef.current = map
          }}
          onMapClick={(nextLat, nextLng) => {
            void handleMapClick(nextLat, nextLng)
          }}
        />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />

        {markers.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={markerIcon}
            draggable={markers.length === 1}
            eventHandlers={{
              click: () => {
                onPick(place)
              },
              dragend: (event: any) => {
                const next = event?.target?.getLatLng?.()
                if (!next) return
                void handleMapClick(next.lat, next.lng)
              },
            }}
          >
            <Popup>{place.formattedAddress || place.name || 'Selected Location'}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
