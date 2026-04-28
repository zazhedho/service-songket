import { Suspense, lazy } from 'react'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { sanitizeDigits, sanitizeSignedDecimal } from '../../../utils/input'
import type { DealerForm as DealerFormValues, Option } from './financeHelpers'

const DealerLeafletSearchMap = lazy(() => import('../../../components/maps/DealerLeafletSearchMap'))

type DealerFormProps = {
  dealerBasePath: string
  dealerForm: DealerFormValues
  dealerFormCenter: [number, number]
  dealerFormLat: number
  dealerFormLng: number
  dealerFormZoom: number
  dealerKabupaten: Option[]
  dealerKecamatan: Option[]
  handleDealerPlaceChanged: (place: any) => void
  handleDealerProvince: (code: string) => void
  handleDealerRegency: (code: string) => void
  isDealerEdit: boolean
  locatingDealerAddress: boolean
  navigate: (path: string, options?: any) => void
  provinces: Option[]
  savingDealer: boolean
  setDealerForm: React.Dispatch<React.SetStateAction<DealerFormValues>>
  submitDealer: (e: React.FormEvent) => Promise<void>
}

export default function DealerForm({
  dealerBasePath,
  dealerForm,
  dealerFormCenter,
  dealerFormLat,
  dealerFormLng,
  dealerFormZoom,
  dealerKabupaten,
  dealerKecamatan,
  handleDealerPlaceChanged,
  handleDealerProvince,
  handleDealerRegency,
  isDealerEdit,
  locatingDealerAddress,
  navigate,
  provinces,
  savingDealer,
  setDealerForm,
  submitDealer,
}: DealerFormProps) {
  const provinceOptions = [{ value: '', label: 'Select' }, ...provinces.map((province) => ({
    value: String(province.code || ''),
    label: String(province.name || province.code || '-'),
  }))]

  const regencyOptions = [{ value: '', label: 'Select' }, ...dealerKabupaten.map((kab) => ({
    value: String(kab.code || ''),
    label: String(kab.name || kab.code || '-'),
  }))]

  const districtOptions = [{ value: '', label: 'Select' }, ...dealerKecamatan.map((kec) => ({
    value: String(kec.code || ''),
    label: String(kec.name || kec.code || '-'),
  }))]

  return (
    <div className="business-form-shell">
      <div className="header business-detail-header">
        <div className="business-detail-heading">
          <div className="business-detail-eyebrow">Dealer Setup</div>
          <div className="business-detail-title">{isDealerEdit ? 'Edit Dealer' : 'Create Dealer'}</div>
          <div className="business-detail-subtitle">Fill dealer identity, contact, location area, and map pin.</div>
        </div>
        <div className="business-detail-actions">
          <button className="btn-ghost" onClick={() => navigate(dealerBasePath)}>Back to Table</button>
        </div>
      </div>

      <div className="page business-form-page">
        <form onSubmit={(e) => void submitDealer(e)} className="form-layout business-form-layout" noValidate>
          <div className="card form-section business-form-section">
            <div className="form-section-head">
              <div>
                <h3>Basic Info</h3>
                <div className="form-section-note">Primary dealer identity and contact information.</div>
              </div>
            </div>

            <div className="form-section-grid">
              <div data-field="name">
                <label>Dealer Name</label>
                <input
                  value={dealerForm.name}
                  onChange={(e) => setDealerForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter dealer name"
                  minLength={3}
                  required
                />
              </div>
              <div data-field="phone">
                <label>Phone Number</label>
                <input type="tel" inputMode="numeric" autoComplete="tel" maxLength={20} value={dealerForm.phone} onChange={(e) => setDealerForm((prev) => ({ ...prev, phone: sanitizeDigits(e.target.value) }))} placeholder="Enter phone number" required />
              </div>
            </div>
          </div>

          <div className="card form-section business-form-section">
            <div className="form-section-head">
              <div>
                <h3>Location Details</h3>
                <div className="form-section-note">Administrative area, pinned coordinates, and address details.</div>
              </div>
            </div>

            <div className="form-section-grid">
              <div data-field="province">
                <label>Province</label>
                <SearchableSelect
                  id="dealer-form-province"
                  value={dealerForm.province}
                  options={provinceOptions}
                  onChange={(value) => void handleDealerProvince(value)}
                  placeholder="Select province"
                  searchPlaceholder="Search province..."
                  emptyMessage="Province not found."
                />
              </div>

              <div data-field="regency">
                <label>Regency / City</label>
                <SearchableSelect
                  id="dealer-form-regency"
                  value={dealerForm.regency}
                  options={regencyOptions}
                  onChange={(value) => void handleDealerRegency(value)}
                  placeholder="Select regency / city"
                  searchPlaceholder="Search regency / city..."
                  emptyMessage="Regency / city not found."
                  disabled={!dealerForm.province}
                />
              </div>

              <div data-field="district">
                <label>District</label>
                <SearchableSelect
                  id="dealer-form-district"
                  value={dealerForm.district}
                  options={districtOptions}
                  onChange={(value) => setDealerForm((prev) => ({ ...prev, district: value }))}
                  placeholder="Select district"
                  searchPlaceholder="Search district..."
                  emptyMessage="District not found."
                  disabled={!dealerForm.regency}
                />
              </div>

              <div>
                <label>Village</label>
                <input value={dealerForm.village} onChange={(e) => setDealerForm((prev) => ({ ...prev, village: e.target.value }))} placeholder="Enter village" />
              </div>

              <div data-field="lat">
                <label>Latitude</label>
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={16}
                  value={dealerForm.lat}
                  onChange={(e) => setDealerForm((prev) => ({ ...prev, lat: sanitizeSignedDecimal(e.target.value) }))}
                  placeholder="-6.200000"
                  required
                />
              </div>

              <div data-field="lng">
                <label>Longitude</label>
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={16}
                  value={dealerForm.lng}
                  onChange={(e) => setDealerForm((prev) => ({ ...prev, lng: sanitizeSignedDecimal(e.target.value) }))}
                  placeholder="106.816666"
                  required
                />
              </div>

              <div className="form-field-span-full">
                <label>Address</label>
                <input
                  value={dealerForm.address}
                  onChange={(e) => setDealerForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Address is auto-filled when location is selected"
                />
              </div>
            </div>
          </div>

          <div className="card form-section business-form-section">
            <div className="form-section-head">
              <div>
                <h3>Map Pin</h3>
                <div className="form-section-note">Search the location directly on the map or click the map to pin the dealer.</div>
              </div>
            </div>

            <div className="form-field-span-full">
              <div className="business-form-map-head">
                <label>Dealer Location Map</label>
                {locatingDealerAddress && <span>Resolving location...</span>}
              </div>

              <Suspense fallback={<div className="business-map-loading">Loading dealer map...</div>}>
                <DealerLeafletSearchMap
                  center={dealerFormCenter}
                  zoom={dealerFormZoom}
                  lat={dealerFormLat}
                  lng={dealerFormLng}
                  onPick={handleDealerPlaceChanged}
                />
              </Suspense>
            </div>
          </div>

          <div className="card form-section business-form-section business-form-action-section">
            <div className="form-actions-row business-form-actions">
              <button className="btn-ghost" type="button" onClick={() => navigate(dealerBasePath)}>Cancel</button>
              <button className="btn" type="submit" disabled={savingDealer}>
                {savingDealer ? 'Saving...' : isDealerEdit ? 'Update Dealer' : 'Create Dealer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
