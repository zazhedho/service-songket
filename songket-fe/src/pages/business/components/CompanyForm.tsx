import type { FinanceForm as FinanceFormValues, Option } from './financeHelpers'

type CompanyFormProps = {
  financeBasePath: string
  financeForm: FinanceFormValues
  financeKabupaten: Option[]
  financeKecamatan: Option[]
  handleFinanceProvince: (code: string) => Promise<void>
  handleFinanceRegency: (code: string) => Promise<void>
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
                <select value={financeForm.province} onChange={(e) => void handleFinanceProvince(e.target.value)} required>
                  <option value="">Select</option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Regency / City</label>
                <select
                  value={financeForm.regency}
                  onChange={(e) => void handleFinanceRegency(e.target.value)}
                  disabled={!financeForm.province}
                  required
                >
                  <option value="">Select</option>
                  {financeKabupaten.map((kab) => (
                    <option key={kab.code} value={kab.code}>{kab.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>District</label>
                <select
                  value={financeForm.district}
                  onChange={(e) => setFinanceForm((prev) => ({ ...prev, district: e.target.value }))}
                  disabled={!financeForm.regency}
                  required
                >
                  <option value="">Select</option>
                  {financeKecamatan.map((kec) => (
                    <option key={kec.code} value={kec.code}>{kec.name}</option>
                  ))}
                </select>
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
