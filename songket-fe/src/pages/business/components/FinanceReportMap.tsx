import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function ReportMapFly({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    if (center?.length === 2) {
      map.flyTo(center, zoom, { duration: 0.5 })
    }
  }, [center, map, zoom])

  return null
}

type FinanceReportDealerMapProps = {
  dealerMapCenter: [number, number]
  dealerMapZoom: number
  dealerPoints: any[]
  setDealerInput: React.Dispatch<React.SetStateAction<string>>
  setSelectedDealerId: React.Dispatch<React.SetStateAction<string>>
  summarizeLocation: (parts: unknown[]) => string
  truncateTableText: (value: unknown, max?: number) => string
}

export default function FinanceReportDealerMap({
  dealerMapCenter,
  dealerMapZoom,
  dealerPoints,
  setDealerInput,
  setSelectedDealerId,
  summarizeLocation,
  truncateTableText,
}: FinanceReportDealerMapProps) {
  return (
    <MapContainer center={dealerMapCenter} zoom={dealerMapZoom} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ReportMapFly center={dealerMapCenter} zoom={dealerMapZoom} />
      {dealerPoints.map((dealerItem) => (
        <Marker
          key={`business-map-${dealerItem.id}`}
          position={[dealerItem._lat, dealerItem._lng]}
          icon={markerIcon}
          eventHandlers={{
            click: () => {
              setSelectedDealerId(dealerItem.id)
              setDealerInput(dealerItem.id)
            },
          }}
        >
          <Popup>
            <div style={{ fontWeight: 700 }}>{dealerItem.name || '-'}</div>
            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              {summarizeLocation([dealerItem.regency, dealerItem.district, dealerItem.village])}
            </div>
            {dealerItem.phone && (
              <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>
                {dealerItem.phone}
              </div>
            )}
            {dealerItem.address && (
              <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>
                {truncateTableText(dealerItem.address, 72)}
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
