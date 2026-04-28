import SearchableSelect from '../../../components/common/SearchableSelect'
import { MAX_CURRENCY_INPUT_LENGTH } from '../../../utils/currency'

type JobFormProps = {
  addArea: () => void
  areaLabel: (area: any) => string
  canCreate: boolean
  canUpdate: boolean
  error: string
  form: any
  isCreate: boolean
  isEdit: boolean
  kabupaten: any[]
  loading: boolean
  navigate: (path: string, options?: any) => void
  provinces: any[]
  removeArea: (index: number) => void
  save: () => Promise<void>
  setForm: React.Dispatch<React.SetStateAction<any>>
}

export default function JobForm({
  addArea,
  areaLabel,
  canCreate,
  canUpdate,
  error,
  form,
  isCreate,
  isEdit,
  kabupaten,
  loading,
  navigate,
  provinces,
  removeArea,
  save,
  setForm,
}: JobFormProps) {
  const provinceOptions = [
    { value: '', label: 'Select province' },
    ...provinces.map((province: any) => ({ value: province.code, label: province.name })),
  ]

  const regencyOptions = [
    { value: '', label: 'Select regency/city' },
    ...kabupaten.map((item: any) => ({ value: item.code, label: item.name })),
  ]

  return (
    <div className="job-net-shell">
      <div className="header job-net-header">
        <div className="job-net-heading">
          <div className="job-net-eyebrow">Income Setup</div>
          <div className="job-net-title">{isEdit ? 'Edit Job & Net Income' : 'Create Job & Net Income'}</div>
          <div className="job-net-subtitle">Set the job profile, income value, and coverage area.</div>
        </div>
        <div className="job-net-actions">
          <button className="btn-ghost" onClick={() => navigate('/jobs')}>Back to Table</button>
        </div>
      </div>

      <div className="page job-net-page">
        <div className="card form-section job-net-form-card">
          {!canCreate && isCreate && <div className="alert">No permission to create data.</div>}
          {!canUpdate && isEdit && <div className="alert">No permission to update data.</div>}

          <div className="form-section-head">
            <div>
              <h3>Job & Income</h3>
              <div className="form-section-note">Job name and net income are stored with one or more coverage areas.</div>
            </div>
          </div>

          <div className="form-section-grid">
            <div>
              <label>Job Name</label>
              <input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} placeholder="Enter job name" />
            </div>

            <div>
              <label>Net Income</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.net_income}
                onChange={(e) => setForm((prev: any) => ({ ...prev, net_income: e.target.value }))}
                maxLength={MAX_CURRENCY_INPUT_LENGTH}
                placeholder="Enter net income"
              />
            </div>

            <div className="job-net-area-panel form-field-span-full">
              <div className="job-net-area-head">
                <div>
                  <div className="job-net-area-title">Coverage Area</div>
                  <div className="job-net-area-note">Add at least one regency or city for this net income rule.</div>
                </div>
                <span>{form.selected_areas.length} selected</span>
              </div>
              <div className="job-net-area-picker">
                <div>
                  <label>Province</label>
                  <SearchableSelect
                    value={form.province_code}
                    onChange={(value) => setForm((prev: any) => ({ ...prev, province_code: value, regency_code: '' }))}
                    options={provinceOptions}
                    placeholder="Select province"
                    searchPlaceholder="Search province..."
                  />
                </div>

                <div>
                  <label>Regency / City</label>
                  <SearchableSelect
                    value={form.regency_code}
                    onChange={(value) => setForm((prev: any) => ({ ...prev, regency_code: value }))}
                    options={regencyOptions}
                    placeholder="Select regency/city"
                    searchPlaceholder="Search regency / city..."
                    disabled={!form.province_code}
                  />
                </div>

                <div>
                  <button className="btn-ghost" type="button" onClick={addArea}>Add Area</button>
                </div>
              </div>

              <div className="job-net-selected-area-list">
                {form.selected_areas.length === 0 && (
                  <div className="job-net-area-empty">No area selected.</div>
                )}
                {form.selected_areas.length > 0 && (
                  <div className="job-net-area-stack">
                    {form.selected_areas.map((area: any, idx: number) => (
                      <div
                        key={`${area.province_code}-${area.regency_code}-${idx}`}
                        className="job-net-area-row"
                      >
                        <div className="job-net-area-row-main">
                          <div>{area.regency_name || areaLabel(area)}</div>
                          <span>{area.province_name || '-'}</span>
                        </div>
                        <button className="btn-ghost" type="button" onClick={() => removeArea(idx)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <div className="job-net-form-error">{error}</div>}

            <div className="form-actions-row job-net-form-actions">
              <button className="btn" type="button" onClick={() => void save()} disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </button>
              <button className="btn-ghost" type="button" onClick={() => navigate('/jobs')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
