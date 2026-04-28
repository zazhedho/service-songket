import { Suspense, lazy } from 'react'
import DeferredMount from '../../../components/common/DeferredMount'
import { formatDealerLocationSummary, formatDateTime } from './financeHelpers'

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

function formatCoordinate(value: unknown) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(6) : '-'
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
  const lat = Number(selectedDealer?.lat ?? selectedDealer?.latitude)
  const lng = Number(selectedDealer?.lng ?? selectedDealer?.longitude)
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng)
  const locationSummary = formatDealerLocationSummary(selectedDealer, {
    province: selectedDealerProvinceName,
    regency: selectedDealerRegencyName,
    district: selectedDealerDistrictName,
  })

  return (
    <div className="business-detail-shell">
      <div className="header business-detail-header">
        <div className="business-detail-heading">
          <div className="business-detail-eyebrow">Dealer Profile</div>
          <div className="business-detail-title">Dealer Details</div>
          <div className="business-detail-subtitle">Dealer identity, area, and map position in one page.</div>
        </div>
        <div className="business-detail-actions">
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`${dealerBasePath}/dealers/${selectedId}/edit`, { state: { dealer: selectedDealer } })}>
              Edit Dealer
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate(dealerBasePath)}>Back</button>
        </div>
      </div>

      <div className="page business-detail-page">
        {!selectedDealer && <div className="alert">Dealer not found.</div>}
        {selectedDealer && (
          <>
            <div className="card business-dealer-detail-hero">
              <div className="business-dealer-detail-hero-main">
                <div className="business-dealer-detail-kicker">Dealer</div>
                <div className="business-dealer-detail-name">{selectedDealer.name || '-'}</div>
                <div className="business-dealer-detail-note">{locationSummary}</div>
              </div>
              <div className="business-dealer-detail-badges">
                <span className={`business-dealer-detail-badge ${hasCoordinates ? 'success' : 'muted'}`}>
                  {hasCoordinates ? 'Map Ready' : 'No Coordinates'}
                </span>
                <span className="business-dealer-detail-badge muted">
                  {selectedDealer.phone?.trim() ? selectedDealer.phone : 'Phone not set'}
                </span>
              </div>
            </div>

            <div className="business-dealer-grid business-dealer-detail-layout">
              <div className="card business-section">
                <div className="business-section-head">
                  <h3 className="business-section-title">Dealer Information</h3>
                  <span className="business-section-side">Profile</span>
                </div>
                <div className="business-dealer-detail-card">
                  <div className="business-dealer-detail-grid">
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Dealer Name</div>
                      <div className="business-dealer-detail-value">{selectedDealer.name || '-'}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Phone</div>
                      <div className="business-dealer-detail-value">{selectedDealer.phone || '-'}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Created At</div>
                      <div className="business-dealer-detail-value">{formatDateTime(selectedDealer.created_at)}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Updated At</div>
                      <div className="business-dealer-detail-value">{formatDateTime(selectedDealer.updated_at)}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Address</div>
                      <div className="business-dealer-detail-value">{selectedDealer.address || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card business-section">
                <div className="business-section-head">
                  <h3 className="business-section-title">Location Information</h3>
                  <span className="business-section-side">Area</span>
                </div>
                <div className="business-dealer-detail-card">
                  <div className="business-dealer-detail-grid">
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Province</div>
                      <div className="business-dealer-detail-value">{selectedDealerProvinceName}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Regency / City</div>
                      <div className="business-dealer-detail-value">{selectedDealerRegencyName}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">District</div>
                      <div className="business-dealer-detail-value">{selectedDealerDistrictName}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Village</div>
                      <div className="business-dealer-detail-value">{selectedDealer.village || '-'}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Latitude</div>
                      <div className="business-dealer-detail-value">{formatCoordinate(selectedDealer.lat ?? selectedDealer.latitude)}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Longitude</div>
                      <div className="business-dealer-detail-value">{formatCoordinate(selectedDealer.lng ?? selectedDealer.longitude)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card business-section">
              <div className="business-section-head">
                <h3 className="business-section-title">Dealer Map</h3>
                {hasCoordinates ? (
                  <a
                    className="btn-ghost"
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Maps
                  </a>
                ) : (
                  <span className="business-section-side">Location unavailable</span>
                )}
              </div>
              <div className="business-dealer-detail-card">
                <div className="business-map-shell">
                  <DeferredMount
                    minHeight={320}
                    fallback={<div className="business-map-loading">Preparing dealer map...</div>}
                  >
                    <Suspense fallback={<div className="business-map-loading">Loading dealer map...</div>}>
                      <DealerLocationMap
                        lat={hasCoordinates ? lat : -8.58}
                        lng={hasCoordinates ? lng : 116.12}
                        name={selectedDealer.name}
                      />
                    </Suspense>
                  </DeferredMount>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
