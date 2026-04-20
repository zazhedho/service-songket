import { FormEvent } from 'react'
import dayjs from 'dayjs'
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
  role: string
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
  role,
  selectedMotor,
  set,
  setError,
  setForm,
  showAttempt2,
  submit,
}: OrderFormViewProps) {
  const dpPct = selectedMotor?.otr ? ((form.dp_paid / selectedMotor.otr) * 100).toFixed(1) : '0'

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
              <select
                value={form.dealer_id}
                onChange={(e) => set('dealer_id', e.target.value)}
                required
                disabled={role === 'dealer' && lookups?.dealers?.length === 1}
              >
                <option value="">Select</option>
                {lookups?.dealers?.map((dealer: any) => (
                  <option key={dealer.id} value={dealer.id}>{dealer.name}</option>
                ))}
              </select>
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
              <select value={form.finance_company_id} onChange={(e) => set('finance_company_id', e.target.value)} required>
                <option value="">Select</option>
                {lookups?.finance_companies?.map((finance: any) => (
                  <option key={finance.id} value={finance.id}>{finance.name}</option>
                ))}
              </select>
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
              <select
                value={form.province}
                onChange={(e) => setForm((prev: any) => ({ ...prev, province: e.target.value, regency: '', district: '' }))}
                required
              >
                <option value="">Select</option>
                {provinces.map((prov: any) => (
                  <option key={prov.code} value={prov.code}>{prov.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Regency / City</label>
              <select
                value={form.regency}
                onChange={(e) => setForm((prev: any) => ({ ...prev, regency: e.target.value, district: '' }))}
                disabled={!form.province}
              >
                <option value="">Select</option>
                {kabupaten.map((kab: any) => (
                  <option key={kab.code} value={kab.code}>{kab.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>District</label>
              <select value={form.district} onChange={(e) => set('district', e.target.value)} disabled={!form.regency}>
                <option value="">Select</option>
                {kecamatan.map((kec: any) => (
                  <option key={kec.code} value={kec.code}>{kec.name}</option>
                ))}
              </select>
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
              <select value={form.job_id} onChange={(e) => set('job_id', e.target.value)}>
                <option value="">Select</option>
                {lookups?.jobs?.map((job: any) => (
                  <option key={job.id} value={job.id}>{job.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Motor Type</label>
              <select value={form.motor_type_id} onChange={(e) => set('motor_type_id', e.target.value)}>
                <option value="">Select</option>
                {filteredMotorTypes.map((motor: any) => (
                  <option key={motor.id} value={motor.id}>
                    {motor.name} - OTR {motor.otr?.toLocaleString?.('id-ID')}
                  </option>
                ))}
              </select>
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
              <select value={form.result_status} onChange={(e) => set('result_status', e.target.value)}>
                <option value="approve">Approve</option>
                <option value="pending">Pending</option>
                <option value="reject">Reject</option>
              </select>
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
                  <select value={form.finance_company2_id} onChange={(e) => set('finance_company2_id', e.target.value)}>
                    <option value="">Select</option>
                    {lookups?.finance_companies?.map((finance: any) => (
                      <option key={finance.id} value={finance.id}>{finance.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Finance 2 Result</label>
                  <select value={form.result_status2} onChange={(e) => set('result_status2', e.target.value)}>
                    <option value="">--</option>
                    <option value="approve">Approve</option>
                    <option value="pending">Pending</option>
                    <option value="reject">Reject</option>
                  </select>
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
