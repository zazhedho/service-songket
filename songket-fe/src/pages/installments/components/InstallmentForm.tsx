import SearchableSelect from '../../../components/common/SearchableSelect'

type InstallmentFormProps = {
  canCreate: boolean
  canUpdate: boolean
  error: string
  form: any
  isCreate: boolean
  isEdit: boolean
  loading: boolean
  navigate: (path: string, options?: any) => void
  provinces: any[]
  regencies: any[]
  save: () => Promise<void>
  setForm: React.Dispatch<React.SetStateAction<any>>
  updateProvince: (code: string) => void
  updateRegency: (code: string) => void
  formatRupiah: (value: number) => string
  parseRupiahInput: (value: string) => number
}

export default function InstallmentForm({
  canCreate,
  canUpdate,
  error,
  form,
  isCreate,
  isEdit,
  loading,
  navigate,
  provinces,
  regencies,
  save,
  setForm,
  updateProvince,
  updateRegency,
  formatRupiah,
  parseRupiahInput,
}: InstallmentFormProps) {
  const provinceOptions = [
    { value: '', label: 'Select' },
    ...provinces.map((province: any) => ({ value: province.code, label: province.name })),
  ]

  const regencyOptions = [
    { value: '', label: 'Select' },
    ...regencies.map((regency: any) => ({ value: regency.code, label: regency.name })),
  ]

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Motor Type & Installment' : 'Create Motor Type & Installment'}</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/installments')}>Back to Table</button>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 980 }}>
          {!canCreate && isCreate && <div className="alert">No permission to create data.</div>}
          {!canUpdate && isEdit && <div className="alert">No permission to update data.</div>}

          <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div><label>Motor Type</label><input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} /></div>
            <div><label>Brand</label><input value={form.brand} onChange={(e) => setForm((prev: any) => ({ ...prev, brand: e.target.value }))} /></div>
            <div><label>Model</label><input value={form.model} onChange={(e) => setForm((prev: any) => ({ ...prev, model: e.target.value }))} /></div>
            <div><label>Variant</label><input value={form.type} onChange={(e) => setForm((prev: any) => ({ ...prev, type: e.target.value }))} /></div>

            <div>
              <label>OTR</label>
              <input type="text" value={formatRupiah(form.otr)} onChange={(e) => setForm((prev: any) => ({ ...prev, otr: parseRupiahInput(e.target.value) }))} inputMode="numeric" />
            </div>

            <div>
              <label>Province</label>
              <SearchableSelect
                value={form.province_code}
                onChange={updateProvince}
                options={provinceOptions}
                placeholder="Select"
                searchPlaceholder="Search province..."
              />
            </div>

            <div>
              <label>Regency/City</label>
              <SearchableSelect
                value={form.regency_code}
                onChange={updateRegency}
                options={regencyOptions}
                placeholder="Select"
                searchPlaceholder="Search regency / city..."
                disabled={!form.province_code}
              />
            </div>

            <div>
              <label>Installment Amount</label>
              <input type="text" value={formatRupiah(form.amount)} onChange={(e) => setForm((prev: any) => ({ ...prev, amount: parseRupiahInput(e.target.value) }))} inputMode="numeric" />
            </div>

            {error && <div style={{ color: '#b91c1c', fontSize: 13, gridColumn: '1 / -1' }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, gridColumn: '1 / -1' }}>
              <button className="btn" onClick={() => void save()} disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update Installment' : 'Create Installment'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/installments')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
