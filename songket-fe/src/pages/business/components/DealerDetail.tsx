import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { DetailTable, formatDateTime, markerIcon } from './financeHelpers'

type DealerDetailProps = {
  canManage: boolean
  dealerBasePath: string
  navigate: (path: string, options?: any) => void
  selectedDealer: any
  selectedDealerDistrictName: string
  selectedDealerProvinceName: string
  selectedDealerRegencyName: string
  selectedId: string
}

export default function DealerDetail({
  canManage,
  dealerBasePath,
  navigate,
  selectedDealer,
  selectedDealerDistrictName,
  selectedDealerProvinceName,
  selectedDealerRegencyName,
  selectedId,
}: DealerDetailProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Dealer</div>
          <div style={{ color: '#64748b' }}>Dealer profile and location map</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManage && selectedId && (
            <button className="btn" onClick={() => navigate(`${dealerBasePath}/dealers/${selectedId}/edit`, { state: { dealer: selectedDealer } })}>
              Edit Dealer
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate(dealerBasePath)}>Kembali</button>
        </div>
      </div>

      <div className="page">
        {!selectedDealer && <div className="alert">Dealer tidak ditemukan.</div>}
        {selectedDealer && (
          <>
            <div className="card" style={{ maxWidth: 960 }}>
              <h3>Dealer Information</h3>
              <DetailTable
                rows={[
                  { label: 'Name', value: selectedDealer.name || '-' },
                  { label: 'Phone', value: selectedDealer.phone || '-' },
                  { label: 'Province', value: selectedDealerProvinceName },
                  { label: 'Regency / City', value: selectedDealerRegencyName },
                  { label: 'District', value: selectedDealerDistrictName },
                  { label: 'Village', value: selectedDealer.village || '-' },
                  { label: 'Address', value: selectedDealer.address || '-' },
                  { label: 'Latitude', value: String(selectedDealer.lat ?? selectedDealer.latitude ?? '-') },
                  { label: 'Longitude', value: String(selectedDealer.lng ?? selectedDealer.longitude ?? '-') },
                  { label: 'Created At', value: formatDateTime(selectedDealer.created_at) },
                  { label: 'Updated At', value: formatDateTime(selectedDealer.updated_at) },
                ]}
              />
            </div>

            <div className="card" style={{ minHeight: 360 }}>
              <h3>Dealer Map</h3>
              <div style={{ marginTop: 10 }}>
                <MapContainer
                  center={[Number(selectedDealer.lat ?? selectedDealer.latitude ?? -8.58), Number(selectedDealer.lng ?? selectedDealer.longitude ?? 116.12)]}
                  zoom={11}
                  style={{ height: 300, borderRadius: 12 }}
                  scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  <Marker
                    position={[Number(selectedDealer.lat ?? selectedDealer.latitude ?? -8.58), Number(selectedDealer.lng ?? selectedDealer.longitude ?? 116.12)]}
                    icon={markerIcon}
                  >
                    <Popup>{selectedDealer.name}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
