import { FormEvent } from 'react'
import dayjs from 'dayjs'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { formatRupiah } from '../../../utils/currency'

type OrderFormViewProps = {
  canCreate: boolean
  canUpdate: boolean
  error: string
  filteredMotorTypes: any[]
  form: any
  isCreate: boolean
  isEdit: boolean
  kabupaten: any[]
  kecamatan: any[]
  loading: boolean
  lookups: any
  navigate: (path: string, options?: any) => void
  parseNumber: (value: string) => number
  poolingRowsCount: number
  provinces: any[]
  selectedMotor: any
  set: (key: string, value: any) => void
  setError: (value: string) => void
  setForm: React.Dispatch<React.SetStateAction<any>>
  showAttempt2: boolean
  submit: (event: FormEvent) => Promise<void>
}

export default function OrderFormView({
  canCreate,
  canUpdate,
  error,
  filteredMotorTypes,
  form,
  isCreate,
  isEdit,
  kabupaten,
  kecamatan,
  loading,
  lookups,
  navigate,
  parseNumber,
  poolingRowsCount,
  provinces,
  selectedMotor,
  set,
  setError,
  setForm,
  showAttempt2,
  submit,
}: OrderFormViewProps) {
  const dpPct = selectedMotor?.otr ? ((form.dp_paid / selectedMotor.otr) * 100).toFixed(1) : '0'
  const dealerOptions = [
    { value: '', label: 'Select' },
    ...(lookups?.dealers || []).map((dealer: any) => ({ value: String(dealer.id || ''), label: String(dealer.name || dealer.id || '-') })),
  ]
  const financeCompanyOptions = [
    { value: '', label: 'Select' },
    ...(lookups?.finance_companies || []).map((finance: any) => ({ value: String(finance.id || ''), label: String(finance.name || finance.id || '-') })),
  ]
  const provinceOptions = [
    { value: '', label: 'Select' },
    ...provinces.map((prov: any) => ({ value: String(prov.code || ''), label: String(prov.name || prov.code || '-') })),
  ]
  const regencyOptions = [
    { value: '', label: 'Select' },
    ...kabupaten.map((kab: any) => ({ value: String(kab.code || ''), label: String(kab.name || kab.code || '-') })),
  ]
  const districtOptions = [
    { value: '', label: 'Select' },
    ...kecamatan.map((kec: any) => ({ value: String(kec.code || ''), label: String(kec.name || kec.code || '-') })),
  ]
  const jobOptions = [
    { value: '', label: 'Select' },
    ...(lookups?.jobs || []).map((job: any) => ({ value: String(job.id || ''), label: String(job.name || job.id || '-') })),
  ]
  const motorTypeOptions = [
    { value: '', label: 'Select' },
    ...filteredMotorTypes.map((motor: any) => ({
      value: String(motor.id || ''),
      label: `${motor.name || '-'} - OTR ${motor.otr?.toLocaleString?.('id-ID') || '0'}`,
    })),
  ]
  const resultOptions = [
    { value: 'approve', label: 'Approve' },
    { value: 'pending', label: 'Pending' },
    { value: 'reject', label: 'Reject' },
  ]
  const finance2ResultOptions = [
    { value: '', label: '--' },
    ...resultOptions,
  ]

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Order' : 'Create Order'}</div>
          <div style={{ color: '#64748b' }}>Order form is separated from the main table</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/orders')}>Back to Table</button>
      </div>

      <div className="page">
        <div className="card">
          {isCreate && !canCreate && <div className="alert">You do not have permission to create orders.</div>}
          {isEdit && !canUpdate && <div className="alert">You do not have permission to update orders.</div>}
          {error && <div className="alert" style={{ marginBottom: 10 }}>{error}</div>}

          <form
            className="grid"
            style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', alignItems: 'start' }}
            onSubmit={submit}
          >
            <div>
              <label>Dealer</label>
              <SearchableSelect
                value={form.dealer_id}
                onChange={(value) => set('dealer_id', value)}
                options={dealerOptions}
                placeholder="Select"
                searchPlaceholder="Search dealer..."
                disabled={lookups?.dealers?.length === 1}
              />
            </div>

            <div>
              <label>Pooling Number</label>
              <input value={form.pooling_number} onChange={(e) => set('pooling_number', e.target.value)} required />
            </div>

            <div>
              <label>Pooling Time</label>
              <input
                type="datetime-local"
                value={dayjs(form.pooling_at).format('YYYY-MM-DDTHH:mm')}
                onChange={(e) => set('pooling_at', dayjs(e.target.value).toISOString())}
                required
              />
            </div>

            <div>
              <label>Result Time</label>
              <input
                type="datetime-local"
                value={form.result_at ? dayjs(form.result_at).format('YYYY-MM-DDTHH:mm') : ''}
                onChange={(e) => set('result_at', e.target.value ? dayjs(e.target.value).toISOString() : '')}
              />
            </div>

            <div>
              <label>Finance Company 1</label>
              <SearchableSelect
                value={form.finance_company_id}
                onChange={(value) => set('finance_company_id', value)}
                options={financeCompanyOptions}
                placeholder="Select"
                searchPlaceholder="Search finance company..."
              />
            </div>

            <div>
              <label>Consumer Name</label>
              <input value={form.consumer_name} onChange={(e) => set('consumer_name', e.target.value)} required />
            </div>

            <div>
              <label>Phone Number</label>
              <input value={form.consumer_phone} onChange={(e) => set('consumer_phone', e.target.value)} required />
            </div>

            <div>
              <label>Province</label>
              <SearchableSelect
                value={form.province}
                onChange={(value) => setForm((prev: any) => ({ ...prev, province: value, regency: '', district: '' }))}
                options={provinceOptions}
                placeholder="Select"
                searchPlaceholder="Search province..."
              />
            </div>

            <div>
              <label>Regency / City</label>
              <SearchableSelect
                value={form.regency}
                onChange={(value) => setForm((prev: any) => ({ ...prev, regency: value, district: '' }))}
                options={regencyOptions}
                placeholder="Select"
                searchPlaceholder="Search regency / city..."
                disabled={!form.province}
              />
            </div>

            <div>
              <label>District</label>
              <SearchableSelect
                value={form.district}
                onChange={(value) => set('district', value)}
                options={districtOptions}
                placeholder="Select"
                searchPlaceholder="Search district..."
                disabled={!form.regency}
              />
            </div>

            <div>
              <label>Village</label>
              <input value={form.village} onChange={(e) => set('village', e.target.value)} placeholder="Enter village" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>

            <div>
              <label>Job</label>
              <SearchableSelect
                value={form.job_id}
                onChange={(value) => set('job_id', value)}
                options={jobOptions}
                placeholder="Select"
                searchPlaceholder="Search job..."
              />
            </div>

            <div>
              <label>Motor Type</label>
              <SearchableSelect
                value={form.motor_type_id}
                onChange={(value) => set('motor_type_id', value)}
                options={motorTypeOptions}
                placeholder="Select"
                searchPlaceholder="Search motor type..."
              />
            </div>

            <div>
              <label>OTR (auto)</label>
              <input value={selectedMotor?.otr ? formatRupiah(selectedMotor.otr) : ''} readOnly />
            </div>

            <div>
              <label>DP Gross</label>
              <input
                type="text"
                value={formatRupiah(form.dp_gross)}
                onChange={(e) => set('dp_gross', parseNumber(e.target.value))}
                inputMode="numeric"
              />
            </div>

            <div>
              <label>DP Paid</label>
              <input
                type="text"
                value={formatRupiah(form.dp_paid)}
                onChange={(e) => set('dp_paid', parseNumber(e.target.value))}
                inputMode="numeric"
              />
            </div>

            <div>
              <label>%DP (auto)</label>
              <input value={dpPct} readOnly />
            </div>

            <div>
              <label>Tenor</label>
              <input type="number" min={1} max={60} value={form.tenor} onChange={(e) => set('tenor', Number(e.target.value))} />
            </div>

            <div>
              <label>Installment</label>
              <input
                type="text"
                value={formatRupiah(form.installment)}
                onChange={(e) => set('installment', parseNumber(e.target.value))}
                inputMode="numeric"
              />
            </div>

            <div>
              <label>Result</label>
              <SearchableSelect
                value={form.result_status}
                onChange={(value) => set('result_status', value)}
                options={resultOptions}
                placeholder="Select result"
                searchPlaceholder="Search result..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label>Result Notes</label>
              <input value={form.result_notes} onChange={(e) => set('result_notes', e.target.value)} />
            </div>

            {form.result_status === 'reject' && !showAttempt2 && poolingRowsCount >= 2 && (
              <div style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: 12 }}>
                This pooling number already has 2 records, so no additional finance attempt can be added.
              </div>
            )}

            {showAttempt2 && (
              <>
                <div style={{ gridColumn: '1 / -1', marginTop: 4, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Finance Attempt 2</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 10 }}>
                    Attempt 2 appears when attempt 1 result is reject.
                  </div>
                </div>

                <div>
                  <label>Finance Company 2</label>
                  <SearchableSelect
                    value={form.finance_company2_id}
                    onChange={(value) => set('finance_company2_id', value)}
                    options={financeCompanyOptions}
                    placeholder="Select"
                    searchPlaceholder="Search finance company..."
                  />
                </div>

                <div>
                  <label>Finance 2 Result</label>
                  <SearchableSelect
                    value={form.result_status2}
                    onChange={(value) => set('result_status2', value)}
                    options={finance2ResultOptions}
                    placeholder="--"
                    searchPlaceholder="Search result..."
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Finance 2 Notes</label>
                  <input value={form.result_notes2} onChange={(e) => set('result_notes2', e.target.value)} />
                </div>
              </>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Order'}</button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  setError('')
                  navigate('/orders')
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
