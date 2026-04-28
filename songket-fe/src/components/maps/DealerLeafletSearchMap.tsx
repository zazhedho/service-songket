import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L, { type Map as LeafletMap } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useAlert } from '../common/ConfirmDialog'
import { reverseGeocodedPlace, searchGeocodedPlaces, type GeocodedPlace } from '../../utils/geocoding'

import 'leaflet/dist/leaflet.css'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const LeafletMapContainer = MapContainer as any
const LeafletMarker = Marker as any
const LeafletTileLayer = TileLayer as any

export type DealerLeafletPlace = GeocodedPlace

type DealerLeafletSearchMapProps = {
  center: [number, number]
  zoom: number
  lat?: number
  lng?: number
  onPick: (place: DealerLeafletPlace) => void
}

function buildViewBox(map: LeafletMap | null) {
  if (!map) return ''
  const bounds = map.getBounds()
  return `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`
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
      const places = await searchGeocodedPlaces(keyword, 10, { viewbox: buildViewBox(mapRef.current) })
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
      const place = await reverseGeocodedPlace(nextLat, nextLng)
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
        const places = await searchGeocodedPlaces(keyword, 6, { viewbox: buildViewBox(mapRef.current) })
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

      <LeafletMapContainer center={centerPoint} zoom={zoom} style={{ height: 320 }} scrollWheelZoom={false}>
        <MapFly center={centerPoint} />
        <LeafletMapBridge
          onReady={(map) => {
            mapRef.current = map
          }}
          onMapClick={(nextLat, nextLng) => {
            void handleMapClick(nextLat, nextLng)
          }}
        />
        <LeafletTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />

        {markers.map((place) => (
          <LeafletMarker
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
          </LeafletMarker>
        ))}
      </LeafletMapContainer>
    </div>
  )
}
