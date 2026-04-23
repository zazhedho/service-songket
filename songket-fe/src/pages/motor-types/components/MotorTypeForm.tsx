import SearchableSelect from '../../../components/common/SearchableSelect'
import { MAX_CURRENCY_INPUT_LENGTH } from '../../../utils/currency'

type MotorTypeFormProps = {
  canCreate: boolean
  canUpdate: boolean
  error: string
  form: any
  formatRupiah: (value: number) => string
  isCreate: boolean
  isEdit: boolean
  loading: boolean
  navigate: (path: string) => void
  parseRupiahInput: (value: string) => number
  provinces: any[]
  regencies: any[]
  save: () => Promise<void>
  setForm: React.Dispatch<React.SetStateAction<any>>
  updateProvince: (code: string) => void
  updateRegency: (code: string) => void
}

export default function MotorTypeForm({
  canCreate,
  canUpdate,
  error,
  form,
  formatRupiah,
  isCreate,
  isEdit,
  loading,
  navigate,
  parseRupiahInput,
  provinces,
  regencies,
  save,
  setForm,
  updateProvince,
  updateRegency,
}: MotorTypeFormProps) {
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Motor Type' : 'Create Motor Type'}</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Back to Table</button>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 980 }}>
          {!canCreate && isCreate && <div className="alert">No permission to create data.</div>}
          {!canUpdate && isEdit && <div className="alert">No permission to update data.</div>}

          <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div>
              <label>Motor Type</label>
              <input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} placeholder="Enter motor type name" />
            </div>

            <div>
              <label>Brand</label>
              <input value={form.brand} onChange={(e) => setForm((prev: any) => ({ ...prev, brand: e.target.value }))} placeholder="Enter brand" />
            </div>

            <div>
              <label>Model</label>
              <input value={form.model} onChange={(e) => setForm((prev: any) => ({ ...prev, model: e.target.value }))} placeholder="Enter model" />
            </div>

            <div>
              <label>Type</label>
              <input value={form.type} onChange={(e) => setForm((prev: any) => ({ ...prev, type: e.target.value }))} placeholder="Enter variant type" />
            </div>

            <div>
              <label>OTR</label>
              <input
                type="text"
                value={formatRupiah(form.otr)}
                onChange={(e) => setForm((prev: any) => ({ ...prev, otr: parseRupiahInput(e.target.value) }))}
                inputMode="numeric"
                maxLength={MAX_CURRENCY_INPUT_LENGTH + 3}
                placeholder="Enter OTR amount"
              />
            </div>

            <div>
              <label>Province</label>
              <SearchableSelect
                value={form.province_code}
                onChange={updateProvince}
                options={provinceOptions}
                placeholder="Select province"
                searchPlaceholder="Search province..."
              />
            </div>

            <div>
              <label>Regency / City</label>
              <SearchableSelect
                value={form.regency_code}
                onChange={updateRegency}
                options={regencyOptions}
                placeholder="Select regency / city"
                searchPlaceholder="Search regency / city..."
                disabled={!form.province_code}
              />
            </div>

            {error && <div style={{ color: '#b91c1c', fontSize: 13, gridColumn: '1 / -1' }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, gridColumn: '1 / -1' }}>
              <button className="btn" onClick={() => void save()} disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
