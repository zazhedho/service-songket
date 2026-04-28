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
    <div className="motor-installment-shell">
      <div className="header motor-installment-header">
        <div className="motor-installment-heading">
          <div className="motor-installment-eyebrow">Product Setup</div>
          <div className="motor-installment-title">{isEdit ? 'Edit Motor Type' : 'Create Motor Type'}</div>
          <div className="motor-installment-subtitle">Define product identity, OTR price, and area coverage.</div>
        </div>
        <div className="motor-installment-actions">
          <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Back to Table</button>
        </div>
      </div>

      <div className="page motor-installment-page">
        <div className="card form-section motor-installment-form-card">
          {!canCreate && isCreate && <div className="alert">No permission to create data.</div>}
          {!canUpdate && isEdit && <div className="alert">No permission to update data.</div>}

          <div className="form-section-head">
            <div>
              <h3>Motor Information</h3>
              <div className="form-section-note">Keep model and variant readable for order and installment references.</div>
            </div>
          </div>

          <div className="form-section-grid">
            <div data-field="name">
              <label>Motor Type</label>
              <input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} placeholder="Enter motor type name" required />
            </div>

            <div data-field="brand">
              <label>Brand</label>
              <input value={form.brand} onChange={(e) => setForm((prev: any) => ({ ...prev, brand: e.target.value }))} placeholder="Enter brand" required />
            </div>

            <div data-field="model">
              <label>Model</label>
              <input value={form.model} onChange={(e) => setForm((prev: any) => ({ ...prev, model: e.target.value }))} placeholder="Enter model" required />
            </div>

            <div data-field="type">
              <label>Type</label>
              <input value={form.type} onChange={(e) => setForm((prev: any) => ({ ...prev, type: e.target.value }))} placeholder="Enter variant type" required />
            </div>

            <div data-field="otr">
              <label>OTR</label>
              <input
                type="text"
                value={formatRupiah(form.otr)}
                onChange={(e) => setForm((prev: any) => ({ ...prev, otr: parseRupiahInput(e.target.value) }))}
                inputMode="numeric"
                maxLength={MAX_CURRENCY_INPUT_LENGTH + 3}
                placeholder="Enter OTR amount"
                required
              />
            </div>

            <div data-field="province_code">
              <label>Province</label>
              <SearchableSelect
                value={form.province_code}
                onChange={updateProvince}
                options={provinceOptions}
                placeholder="Select province"
                searchPlaceholder="Search province..."
              />
            </div>

            <div data-field="regency_code">
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

            {error && <div className="motor-installment-form-error">{error}</div>}

            <div className="form-actions-row motor-installment-form-actions">
              <button className="btn" type="button" onClick={() => void save()} disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </button>
              <button className="btn-ghost" type="button" onClick={() => navigate('/motor-types')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
