import { useEffect, useState, FormEvent } from 'react'
import { fetchQuadrants, recomputeQuadrant } from '../api'

export default function QuadrantsPage() {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState({ order_threshold: 10, score_threshold: 60, from: '', to: '' })
  const [loading, setLoading] = useState(false)

  const load = () => fetchQuadrants().then((r) => setItems(r.data.data || r.data))
  useEffect(() => {
    load()
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await recomputeQuadrant(form)
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Kuadran Area x Pekerjaan</div>
          <div style={{ color: '#9ca3af' }}>Pemetaan order vs credit score</div>
        </div>
      </div>
      <div className="page grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h3>Kuadran</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))' }}>
            {items.map((q) => (
              <div key={q.id} style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 10 }}>
                <div style={{ color: '#9ca3af', fontSize: 13 }}>{q.regency} / {q.job_id}</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>Q{q.quadrant}</div>
                <div style={{ color: '#9ca3af' }}>Order: {q.order_count} | Score: {q.credit_score}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Recompute</h3>
          <form className="grid" style={{ gap: 10 }} onSubmit={submit}>
            <div>
              <label>Order Threshold</label>
              <input type="number" value={form.order_threshold} onChange={(e) => set('order_threshold', Number(e.target.value))} />
            </div>
            <div>
              <label>Score Threshold</label>
              <input type="number" value={form.score_threshold} onChange={(e) => set('score_threshold', Number(e.target.value))} />
            </div>
            <div>
              <label>From</label>
              <input type="date" value={form.from} onChange={(e) => set('from', e.target.value)} />
            </div>
            <div>
              <label>To</label>
              <input type="date" value={form.to} onChange={(e) => set('to', e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Recomputing...' : 'Recompute'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
