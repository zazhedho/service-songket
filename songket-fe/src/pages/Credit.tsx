import { useEffect, useState, FormEvent } from 'react'
import { fetchCredit, upsertCredit, fetchProvinces, fetchKabupaten, fetchKecamatan, fetchLookups } from '../api'
import { useAuth } from '../store'

export default function CreditPage() {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState({ province: '', regency: '', district: '', village: '', address: '', job_id: '', score: 0 })
  const [loading, setLoading] = useState(false)
  const [provinces, setProvinces] = useState<any[]>([])
  const [kabupaten, setKabupaten] = useState<any[]>([])
  const [kecamatan, setKecamatan] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_credit')
  const canUpsert = perms.includes('upsert_credit')

  const load = () => fetchCredit().then((r) => setItems(r.data.data || r.data))
  useEffect(() => {
    if (canList) load()
  }, [canList])

  useEffect(() => {
    fetchProvinces().then((r) => setProvinces(r.data.data || r.data || []))
    fetchLookups().then((r) => setJobs(r.data.data?.jobs || r.data?.jobs || []))
  }, [])

  useEffect(() => {
    if (form.province) {
      fetchKabupaten(form.province).then((r) => setKabupaten(r.data.data || r.data || []))
    } else {
      setKabupaten([])
    }
    setForm((f) => ({ ...f, regency: '', district: '' }))
    setKecamatan([])
  }, [form.province])

  useEffect(() => {
    if (form.regency) {
      fetchKecamatan(form.province, form.regency).then((r) => setKecamatan(r.data.data || r.data || []))
    } else {
      setKecamatan([])
    }
    setForm((f) => ({ ...f, district: '' }))
  }, [form.regency])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canUpsert) return
    setLoading(true)
    try {
      await upsertCredit(form)
      setForm({ province: '', regency: '', district: '', village: '', address: '', job_id: '', score: 0 })
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
          {!canList && <div className="alert">Tidak ada izin melihat data.</div>}
          {canList && (
            <table className="table">
              <thead>
                <tr>
                  <th>Provinsi</th>
                  <th>Kab/Kota</th>
                  <th>Kecamatan</th>
                  <th>Kelurahan</th>
                  <th>Alamat</th>
                  <th>Job</th>
                  <th>Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>{c.province}</td>
                    <td>{c.regency}</td>
                    <td>{c.district}</td>
                    <td>{c.village}</td>
                    <td>{c.address}</td>
                    <td>{c.job?.name || c.job_id}</td>
                    <td>{c.score}</td>
                    <td>
                      {canUpsert ? (
                        <button
                          className="btn-ghost"
                          onClick={() => setForm({
                            province: c.province || '',
                            regency: c.regency || '',
                            district: c.district || '',
                            village: c.village || '',
                            address: c.address || '',
                            job_id: c.job_id,
                            score: c.score,
                          })}
                        >
                          Edit
                        </button>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>Update/Set Score</h3>
          {!canUpsert && <div className="alert">Tidak ada izin mengubah credit.</div>}
          <form className="grid" style={{ gap: 10 }} onSubmit={submit}>
            <div>
              <label>Provinsi</label>
              <select value={form.province} onChange={(e) => set('province', e.target.value)} required>
                <option value="">Pilih</option>
                {provinces.map((p: any) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Kabupaten/Kota</label>
              <select value={form.regency} onChange={(e) => set('regency', e.target.value)} required disabled={!form.province}>
                <option value="">Pilih</option>
                {kabupaten.map((k: any) => (
                  <option key={k.code} value={k.code}>{k.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Kecamatan</label>
              <select value={form.district} onChange={(e) => set('district', e.target.value)} required disabled={!form.regency}>
                <option value="">Pilih</option>
                {kecamatan.map((k: any) => (
                  <option key={k.code} value={k.code}>{k.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Kelurahan</label>
              <input value={form.village} onChange={(e) => set('village', e.target.value)} />
            </div>
            <div>
              <label>Alamat</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <label>Job</label>
              <select value={form.job_id} onChange={(e) => set('job_id', e.target.value)} required>
                <option value="">Pilih</option>
                {jobs.map((j: any) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Score</label>
              <input type="number" value={form.score} onChange={(e) => set('score', Number(e.target.value))} required />
            </div>
            <button className="btn" type="submit" disabled={loading || !canUpsert}>{loading ? 'Saving...' : 'Save'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
