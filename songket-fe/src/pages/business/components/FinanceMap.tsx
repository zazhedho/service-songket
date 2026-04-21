import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { summarizeLocation } from './financeReportHelpers'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const LeafletMapContainer = MapContainer as any
const LeafletMarker = Marker as any
const LeafletTileLayer = TileLayer as any

function MapFly({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    if (center?.length === 2) {
      map.flyTo(center, map.getZoom(), { duration: 0.5 })
    }
  }, [center, map])

  return null
}

type FinanceDealerMapProps = {
  center: [number, number]
  dealerLocationNameMap: Record<string, any>
  dealerPoints: any[]
  setSelectedDealerId: React.Dispatch<React.SetStateAction<string>>
}

export function FinanceDealerMap({
  center,
  dealerLocationNameMap,
  dealerPoints,
  setSelectedDealerId,
}: FinanceDealerMapProps) {
  return (
    <LeafletMapContainer center={center as any} zoom={8} style={{ height: 360, borderRadius: 12 }} scrollWheelZoom={false}>
      <MapFly center={center as any} />
      <LeafletTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      {dealerPoints.map((dealer: any) => (
        <LeafletMarker
          key={dealer.id}
          position={[dealer._lat, dealer._lng]}
          icon={markerIcon}
          eventHandlers={{ click: () => setSelectedDealerId(dealer.id) }}
        >
          <Popup>
            <strong>{dealer.name}</strong>
            <div>{summarizeLocation([dealerLocationNameMap[String(dealer.id)]?.regency])}</div>
            <div>{dealer.phone || '-'}</div>
          </Popup>
        </LeafletMarker>
      ))}
    </LeafletMapContainer>
  )
}

type DealerLocationMapProps = {
  lat: number
  lng: number
  name: string
}

export function DealerLocationMap({ lat, lng, name }: DealerLocationMapProps) {
  return (
    <LeafletMapContainer
      center={[lat, lng]}
      zoom={11}
      style={{ height: 300, borderRadius: 12 }}
      scrollWheelZoom={false}
    >
      <LeafletTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <LeafletMarker position={[lat, lng]} icon={markerIcon}>
        <Popup>{name}</Popup>
      </LeafletMarker>
    </LeafletMapContainer>
  )
}
