import SearchableSelect from '../../../components/common/SearchableSelect'
import { sanitizeDigits } from '../../../utils/input'
import type { FinanceForm as FinanceFormValues, Option } from './financeHelpers'

type CompanyFormProps = {
  financeBasePath: string
  financeForm: FinanceFormValues
  financeKabupaten: Option[]
  financeKecamatan: Option[]
  handleFinanceProvince: (code: string) => void
  handleFinanceRegency: (code: string) => void
  isCompanyEdit: boolean
  navigate: (path: string, options?: any) => void
  provinces: Option[]
  savingFinance: boolean
  setFinanceForm: React.Dispatch<React.SetStateAction<FinanceFormValues>>
  submitFinance: (e: React.FormEvent) => Promise<void>
}

export default function CompanyForm({
  financeBasePath,
  financeForm,
  financeKabupaten,
  financeKecamatan,
  handleFinanceProvince,
  handleFinanceRegency,
  isCompanyEdit,
  navigate,
  provinces,
  savingFinance,
  setFinanceForm,
  submitFinance,
}: CompanyFormProps) {
  const provinceOptions = [{ value: '', label: 'Select' }, ...provinces.map((province) => ({
    value: String(province.code || ''),
    label: String(province.name || province.code || '-'),
  }))]

  const regencyOptions = [{ value: '', label: 'Select' }, ...financeKabupaten.map((kab) => ({
    value: String(kab.code || ''),
    label: String(kab.name || kab.code || '-'),
  }))]

  const districtOptions = [{ value: '', label: 'Select' }, ...financeKecamatan.map((kec) => ({
    value: String(kec.code || ''),
    label: String(kec.name || kec.code || '-'),
  }))]

  return (
    <div className="business-form-shell">
      <div className="header business-detail-header">
        <div className="business-detail-heading">
          <div className="business-detail-eyebrow">Finance Setup</div>
          <div className="business-detail-title">{isCompanyEdit ? 'Edit Finance Company' : 'Create Finance Company'}</div>
          <div className="business-detail-subtitle">Fill company identity, contact, and administrative area.</div>
        </div>
        <div className="business-detail-actions">
          <button className="btn-ghost" onClick={() => navigate(financeBasePath)}>Back to Table</button>
        </div>
      </div>

      <div className="page business-form-page">
        <form onSubmit={(e) => void submitFinance(e)} className="form-layout business-form-layout" noValidate>
          <div className="card form-section business-form-section">
            <div className="form-section-head">
              <div>
                <h3>Basic Info</h3>
                <div className="form-section-note">Primary finance company identity and contact information.</div>
              </div>
            </div>

            <div className="form-section-grid">
              <div data-field="name">
                <label>Finance Company Name</label>
                <input
                  value={financeForm.name}
                  onChange={(e) => setFinanceForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter finance company name"
                  minLength={3}
                  required
                />
              </div>
              <div data-field="phone">
                <label>Phone Number</label>
                <input type="tel" inputMode="numeric" autoComplete="tel" maxLength={20} value={financeForm.phone} onChange={(e) => setFinanceForm((prev) => ({ ...prev, phone: sanitizeDigits(e.target.value) }))} placeholder="Enter phone number" required />
              </div>
            </div>
          </div>

          <div className="card form-section business-form-section">
            <div className="form-section-head">
              <div>
                <h3>Location Details</h3>
                <div className="form-section-note">Administrative area and office address for the finance company.</div>
              </div>
            </div>

            <div className="form-section-grid">
              <div data-field="province">
                <label>Province</label>
                <SearchableSelect
                  id="company-form-province"
                  value={financeForm.province}
                  options={provinceOptions}
                  onChange={(value) => void handleFinanceProvince(value)}
                  placeholder="Select province"
                  searchPlaceholder="Search province..."
                  emptyMessage="Province not found."
                />
              </div>

              <div data-field="regency">
                <label>Regency / City</label>
                <SearchableSelect
                  id="company-form-regency"
                  value={financeForm.regency}
                  options={regencyOptions}
                  onChange={(value) => void handleFinanceRegency(value)}
                  placeholder="Select regency / city"
                  searchPlaceholder="Search regency / city..."
                  emptyMessage="Regency / city not found."
                  disabled={!financeForm.province}
                />
              </div>

              <div data-field="district">
                <label>District</label>
                <SearchableSelect
                  id="company-form-district"
                  value={financeForm.district}
                  options={districtOptions}
                  onChange={(value) => setFinanceForm((prev) => ({ ...prev, district: value }))}
                  placeholder="Select district"
                  searchPlaceholder="Search district..."
                  emptyMessage="District not found."
                  disabled={!financeForm.regency}
                />
              </div>

              <div>
                <label>Village</label>
                <input value={financeForm.village} onChange={(e) => setFinanceForm((prev) => ({ ...prev, village: e.target.value }))} placeholder="Enter village" />
              </div>

              <div className="form-field-span-full">
                <label>Address</label>
                <input value={financeForm.address} onChange={(e) => setFinanceForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Enter address" />
              </div>
            </div>
          </div>

          <div className="card form-section business-form-section business-form-action-section">
            <div className="form-actions-row business-form-actions">
              <button className="btn-ghost" type="button" onClick={() => navigate(financeBasePath)}>Cancel</button>
              <button className="btn" type="submit" disabled={savingFinance}>
                {savingFinance ? 'Saving...' : isCompanyEdit ? 'Update Finance Company' : 'Create Finance Company'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
