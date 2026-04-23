import SearchableSelect from '../../../components/common/SearchableSelect'
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
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isCompanyEdit ? 'Edit Finance Company' : 'Create Finance Company'}</div>
          <div style={{ color: '#64748b' }}>Finance company form is separated from the table</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate(financeBasePath)}>Back to Table</button>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 920 }}>
          <form onSubmit={(e) => void submitFinance(e)} className="grid" style={{ gap: 10 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label>Finance Company Name</label>
                <input value={financeForm.name} onChange={(e) => setFinanceForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div>
                <label>Phone Number</label>
                <input value={financeForm.phone} onChange={(e) => setFinanceForm((prev) => ({ ...prev, phone: e.target.value }))} required />
              </div>

              <div>
                <label>Province</label>
                <SearchableSelect
                  id="company-form-province"
                  value={financeForm.province}
                  options={provinceOptions}
                  onChange={(value) => void handleFinanceProvince(value)}
                  placeholder="Select"
                  searchPlaceholder="Search province..."
                  emptyMessage="Province not found."
                />
              </div>

              <div>
                <label>Regency / City</label>
                <SearchableSelect
                  id="company-form-regency"
                  value={financeForm.regency}
                  options={regencyOptions}
                  onChange={(value) => void handleFinanceRegency(value)}
                  placeholder="Select"
                  searchPlaceholder="Search regency / city..."
                  emptyMessage="Regency / city not found."
                  disabled={!financeForm.province}
                />
              </div>

              <div>
                <label>District</label>
                <SearchableSelect
                  id="company-form-district"
                  value={financeForm.district}
                  options={districtOptions}
                  onChange={(value) => setFinanceForm((prev) => ({ ...prev, district: value }))}
                  placeholder="Select"
                  searchPlaceholder="Search district..."
                  emptyMessage="District not found."
                  disabled={!financeForm.regency}
                />
              </div>

              <div>
                <label>Village</label>
                <input value={financeForm.village} onChange={(e) => setFinanceForm((prev) => ({ ...prev, village: e.target.value }))} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input value={financeForm.address} onChange={(e) => setFinanceForm((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn-ghost" type="button" onClick={() => navigate(financeBasePath)}>Cancel</button>
              <button className="btn" type="submit" disabled={savingFinance}>
                {savingFinance ? 'Saving...' : isCompanyEdit ? 'Update Finance Company' : 'Create Finance Company'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
