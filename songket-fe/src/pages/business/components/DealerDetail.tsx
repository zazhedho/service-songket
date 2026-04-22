import { Suspense, lazy } from 'react'
import DeferredMount from '../../../components/common/DeferredMount'
import { DetailTable, formatDateTime } from './financeHelpers'

const DealerLocationMap = lazy(() => import('./FinanceMap').then((module) => ({ default: module.DealerLocationMap })))

type DealerDetailProps = {
  canUpdate: boolean
  dealerBasePath: string
  navigate: (path: string, options?: any) => void
  selectedDealer: any
  selectedDealerDistrictName: string
  selectedDealerProvinceName: string
  selectedDealerRegencyName: string
  selectedId: string
}

export default function DealerDetail({
  canUpdate,
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Dealer Details</div>
          <div style={{ color: '#64748b' }}>Dealer profile and location map</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`${dealerBasePath}/dealers/${selectedId}/edit`, { state: { dealer: selectedDealer } })}>
              Edit Dealer
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate(dealerBasePath)}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedDealer && <div className="alert">Dealer not found.</div>}
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
                <DeferredMount
                  minHeight={320}
                  fallback={<div className="muted" style={{ padding: '24px 0' }}>Preparing dealer map...</div>}
                >
                  <Suspense fallback={<div className="muted" style={{ padding: '24px 0' }}>Loading dealer map...</div>}>
                    <DealerLocationMap
                      lat={Number(selectedDealer.lat ?? selectedDealer.latitude ?? -8.58)}
                      lng={Number(selectedDealer.lng ?? selectedDealer.longitude ?? 116.12)}
                      name={selectedDealer.name}
                    />
                  </Suspense>
                </DeferredMount>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
