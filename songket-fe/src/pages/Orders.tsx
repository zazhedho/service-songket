import { useEffect, useState, FormEvent } from 'react'
import { createOrder, fetchOrders, fetchLookups } from '../api'
import dayjs from 'dayjs'

const defaultForm = {
  pooling_number: '',
  pooling_at: dayjs().toISOString(),
  result_at: '',
  dealer_id: '',
  finance_company_id: '',
  consumer_name: '',
  consumer_phone: '',
  regency: '',
  address: '',
  job_id: '',
  motor_type_id: '',
  dp_gross: 0,
  dp_paid: 0,
  tenor: 12,
  result_status: 'pending',
  result_notes: '',
  finance_company2_id: '',
  result_status2: '',
  result_notes2: '',
}

export default function OrdersPage() {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState(defaultForm)
  const [lookups, setLookups] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ search: '', status: '' })

  const load = () =>
    fetchOrders({ limit: 50, search: filters.search || undefined, status: filters.status || undefined }).then((r) =>
      setList(r.data.data || r.data),
    )

  useEffect(() => {
    fetchLookups().then((r) => setLookups(r.data.data || r.data))
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createOrder(form)
      setForm(defaultForm)
      load()
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const selectedMotor = lookups?.motor_types?.find((m: any) => m.id === form.motor_type_id)
  const dpPct = selectedMotor?.otr ? ((form.dp_paid / selectedMotor.otr) * 100).toFixed(1) : '0'

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Form Order In</div>
          <div style={{ color: '#9ca3af' }}>Input & review order</div>
        </div>
      </div>
      <div className="page">
        <div className="card">
          <h3>Tambah Order</h3>
          <form className="grid" style={{ gap: 12 }} onSubmit={submit}>
            <div>
              <label>Nomor Pooling</label>
              <input value={form.pooling_number} onChange={(e) => set('pooling_number', e.target.value)} required />
            </div>
            <div>
              <label>Waktu Pooling</label>
              <input
                type="datetime-local"
                value={dayjs(form.pooling_at).format('YYYY-MM-DDTHH:mm')}
                onChange={(e) => set('pooling_at', dayjs(e.target.value).toISOString())}
                required
              />
            </div>
            <div>
              <label>Waktu Hasil</label>
              <input
                type="datetime-local"
                value={form.result_at ? dayjs(form.result_at).format('YYYY-MM-DDTHH:mm') : ''}
                onChange={(e) => set('result_at', e.target.value ? dayjs(e.target.value).toISOString() : '')}
              />
            </div>
            <div>
              <label>Finance Company 1</label>
              <select value={form.finance_company_id} onChange={(e) => set('finance_company_id', e.target.value)} required>
                <option value="">Pilih</option>
                {lookups?.finance_companies?.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Nama Konsumen</label>
              <input value={form.consumer_name} onChange={(e) => set('consumer_name', e.target.value)} required />
            </div>
            <div>
              <label>No HP</label>
              <input value={form.consumer_phone} onChange={(e) => set('consumer_phone', e.target.value)} required />
            </div>
            <div>
              <label>Kabupaten</label>
              <select value={form.regency} onChange={(e) => set('regency', e.target.value)}>
                <option value="">Pilih</option>
                {lookups?.regencies?.map((r: string) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Alamat</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <label>Pekerjaan</label>
              <select value={form.job_id} onChange={(e) => set('job_id', e.target.value)}>
                <option value="">Pilih</option>
                {lookups?.jobs?.map((j: any) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Tipe Motor</label>
              <select
                value={form.motor_type_id}
                onChange={(e) => {
                  const val = e.target.value
                  set('motor_type_id', val)
                }}
              >
                <option value="">Pilih</option>
                {lookups?.motor_types?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — OTR {m.otr?.toLocaleString?.('id-ID')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>OTR (auto)</label>
              <input value={selectedMotor?.otr || ''} readOnly />
            </div>
            <div>
              <label>DP Gross</label>
              <input type="number" value={form.dp_gross} onChange={(e) => set('dp_gross', Number(e.target.value))} />
            </div>
            <div>
              <label>DP Setor</label>
              <input type="number" value={form.dp_paid} onChange={(e) => set('dp_paid', Number(e.target.value))} />
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
              <label>Hasil</label>
              <select value={form.result_status} onChange={(e) => set('result_status', e.target.value)}>
                <option value="approve">Approve</option>
                <option value="pending">Pending</option>
                <option value="reject">Reject</option>
              </select>
            </div>
            <div>
              <label>Keterangan Hasil</label>
              <input value={form.result_notes} onChange={(e) => set('result_notes', e.target.value)} />
            </div>
            {form.result_status === 'reject' && (
              <>
                <div>
                  <label>Finance Company 2</label>
                  <select value={form.finance_company2_id} onChange={(e) => set('finance_company2_id', e.target.value)}>
                    <option value="">Pilih</option>
                    {lookups?.finance_companies?.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Hasil Finance 2</label>
                  <select value={form.result_status2} onChange={(e) => set('result_status2', e.target.value)}>
                    <option value="">--</option>
                    <option value="approve">Approve</option>
                    <option value="pending">Pending</option>
                    <option value="reject">Reject</option>
                  </select>
                </div>
                <div>
                  <label>Keterangan Finance 2</label>
                  <input value={form.result_notes2} onChange={(e) => set('result_notes2', e.target.value)} />
                </div>
              </>
            )}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn-ghost" onClick={() => setForm(defaultForm)}>Reset</button>
            </div>
          </form>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
            <div>
              <label>Search</label>
              <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
            </div>
            <div>
              <label>Status</label>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                <option value="">Semua</option>
                <option value="approve">Approve</option>
                <option value="pending">Pending</option>
                <option value="reject">Reject</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Order Tersimpan</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Pooling</th>
                <th>Konsumen</th>
                <th>Finance</th>
                <th>Status</th>
                <th>Tenor</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td>{o.pooling_number}</td>
                  <td>{o.consumer_name}</td>
                  <td>
                    {lookups?.finance_companies?.find((f: any) => f.id === o.attempts?.[0]?.finance_company_id)?.name ||
                      o.attempts?.[0]?.finance_company_id}
                  </td>
                  <td><span className={`badge ${o.result_status}`}>{o.result_status}</span></td>
                  <td>{o.tenor} bln</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
