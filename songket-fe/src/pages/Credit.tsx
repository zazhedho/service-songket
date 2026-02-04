import { useEffect, useState, FormEvent } from 'react'
import { fetchCredit, upsertCredit } from '../api'

export default function CreditPage() {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState({ regency: '', job_id: '', score: 0 })
  const [loading, setLoading] = useState(false)

  const load = () => fetchCredit().then((r) => setItems(r.data.data || r.data))
  useEffect(() => {
    load()
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await upsertCredit(form)
      setForm({ regency: '', job_id: '', score: 0 })
      load()
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Credit Capability</div>
          <div style={{ color: '#9ca3af' }}>Score per kabupaten & pekerjaan</div>
        </div>
      </div>
      <div className="page grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div className="card">
          <h3>Daftar</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Kabupaten</th>
                <th>Job</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>{c.regency}</td>
                  <td>{c.job?.name || c.job_id}</td>
                  <td>{c.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Update/Set Score</h3>
          <form className="grid" style={{ gap: 10 }} onSubmit={submit}>
            <div>
              <label>Kabupaten</label>
              <input value={form.regency} onChange={(e) => set('regency', e.target.value)} required />
            </div>
            <div>
              <label>Job ID</label>
              <input value={form.job_id} onChange={(e) => set('job_id', e.target.value)} required />
            </div>
            <div>
              <label>Score</label>
              <input type="number" value={form.score} onChange={(e) => set('score', Number(e.target.value))} required />
            </div>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
