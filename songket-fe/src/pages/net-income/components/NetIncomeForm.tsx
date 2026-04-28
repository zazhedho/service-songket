import SearchableSelect from '../../../components/common/SearchableSelect'
import { MAX_CURRENCY_INPUT_LENGTH } from '../../../utils/currency'

type NetIncomeFormProps = {
  addArea: () => void
  areaLabel: (area: any) => string
  canCreate: boolean
  canUpdate: boolean
  error: string
  form: any
  isCreate: boolean
  isEdit: boolean
  jobs: any[]
  kabupaten: any[]
  loading: boolean
  navigate: (path: string) => void
  provinces: any[]
  removeArea: (index: number) => void
  save: () => Promise<void>
  setForm: React.Dispatch<React.SetStateAction<any>>
  formatRupiahInput: (value: string) => string
}

export default function NetIncomeForm({
  addArea,
  areaLabel,
  canCreate,
  canUpdate,
  error,
  form,
  isCreate,
  isEdit,
  jobs,
  kabupaten,
  loading,
  navigate,
  provinces,
  removeArea,
  save,
  setForm,
  formatRupiahInput,
}: NetIncomeFormProps) {
  const jobOptions = [
    { value: '', label: 'Select job' },
    ...jobs.map((job: any) => ({ value: job.id, label: job.name })),
  ]

  const provinceOptions = [
    { value: '', label: 'Select province' },
    ...provinces.map((province: any) => ({ value: province.code, label: province.name })),
  ]

  const regencyOptions = [
    { value: '', label: 'Select regency/city' },
    ...kabupaten.map((item: any) => ({ value: item.code, label: item.name })),
  ]

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Net Income' : 'Create Net Income'}</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/net-income')}>Back to Table</button>
      </div>

      <div className="page">
        <div className="card" style={{ width: '100%' }}>
          {!canCreate && isCreate && <div className="alert">No permission to create data.</div>}
          {!canUpdate && isEdit && <div className="alert">No permission to update data.</div>}

          <div className="grid" style={{ gap: 10 }}>
            <div data-field="job_id">
              <label>Job</label>
              <SearchableSelect
                value={form.job_id}
                onChange={(value) => setForm((prev: any) => ({ ...prev, job_id: value }))}
                options={jobOptions}
                placeholder="Select job"
                searchPlaceholder="Search job..."
              />
            </div>

            <div data-field="net_income">
              <label>Net Income</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.net_income}
                onChange={(e) => setForm((prev: any) => ({ ...prev, net_income: formatRupiahInput(e.target.value) }))}
                maxLength={MAX_CURRENCY_INPUT_LENGTH}
                placeholder="Enter net income"
              />
            </div>

            <div style={{ border: '1px solid #dde4ee', borderRadius: 10, padding: 12, background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Add Net Income Area</div>
              <div className="grid" style={{ gap: 10 }}>
                <div data-field="province_code">
                  <label>Province</label>
                  <SearchableSelect
                    value={form.province_code}
                    onChange={(value) => setForm((prev: any) => ({ ...prev, province_code: value, regency_code: '' }))}
                    options={provinceOptions}
                    placeholder="Select province"
                    searchPlaceholder="Search province..."
                  />
                </div>

                <div data-field="regency_code">
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

              <div style={{ marginTop: 10 }}>
                {form.selected_areas.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No selected area yet.</div>}
                {form.selected_areas.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.selected_areas.map((area: any, idx: number) => (
                      <div
                        key={`${area.province_code}-${area.regency_code}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          border: '1px solid #dde4ee',
                          borderRadius: 8,
                          padding: '8px 10px',
                          background: '#fff',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{areaLabel(area)}</div>
                        <button className="btn-ghost" type="button" onClick={() => removeArea(idx)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => void save()} disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/net-income')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
