import DealerLeafletSearchMap from '../../../components/maps/DealerLeafletSearchMap'
import type { DealerForm as DealerFormValues, Option } from './financeHelpers'

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
  handleDealerProvince: (code: string) => Promise<void>
  handleDealerRegency: (code: string) => Promise<void>
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
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isDealerEdit ? 'Edit Dealer' : 'Create Dealer'}</div>
          <div style={{ color: '#64748b' }}>Dealer form is separated from the table</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate(dealerBasePath)}>Back to Table</button>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 920 }}>
          <form onSubmit={(e) => void submitDealer(e)} className="grid" style={{ gap: 10 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label>Dealer Name</label>
                <input value={dealerForm.name} onChange={(e) => setDealerForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div>
                <label>Phone Number</label>
                <input value={dealerForm.phone} onChange={(e) => setDealerForm((prev) => ({ ...prev, phone: e.target.value }))} required />
              </div>

              <div>
                <label>Province</label>
                <select value={dealerForm.province} onChange={(e) => void handleDealerProvince(e.target.value)} required>
                  <option value="">Select</option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Regency / City</label>
                <select
                  value={dealerForm.regency}
                  onChange={(e) => void handleDealerRegency(e.target.value)}
                  disabled={!dealerForm.province}
                  required
                >
                  <option value="">Select</option>
                  {dealerKabupaten.map((kab) => (
                    <option key={kab.code} value={kab.code}>{kab.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>District</label>
                <select
                  value={dealerForm.district}
                  onChange={(e) => setDealerForm((prev) => ({ ...prev, district: e.target.value }))}
                  disabled={!dealerForm.regency}
                  required
                >
                  <option value="">Select</option>
                  {dealerKecamatan.map((kec) => (
                    <option key={kec.code} value={kec.code}>{kec.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Village</label>
                <input value={dealerForm.village} onChange={(e) => setDealerForm((prev) => ({ ...prev, village: e.target.value }))} />
              </div>

              <div>
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={dealerForm.lat}
                  onChange={(e) => setDealerForm((prev) => ({ ...prev, lat: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={dealerForm.lng}
                  onChange={(e) => setDealerForm((prev) => ({ ...prev, lng: e.target.value }))}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input
                  value={dealerForm.address}
                  onChange={(e) => setDealerForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Address is auto-filled when location is selected"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ marginBottom: 0 }}>Dealer Location Map</label>
                  {locatingDealerAddress && <span style={{ color: '#64748b', fontSize: 12 }}>Resolving location...</span>}
                </div>

                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                  Search location directly on the map or click the map to pin location.
                  Suggestion dropdown, map movement, and autofill are available in this Leaflet map.
                </div>

                <DealerLeafletSearchMap
                  center={dealerFormCenter}
                  zoom={dealerFormZoom}
                  lat={dealerFormLat}
                  lng={dealerFormLng}
                  onPick={handleDealerPlaceChanged}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn-ghost" type="button" onClick={() => navigate(dealerBasePath)}>Cancel</button>
              <button className="btn" type="submit" disabled={savingDealer}>
                {savingDealer ? 'Saving...' : isDealerEdit ? 'Update Dealer' : 'Create Dealer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
