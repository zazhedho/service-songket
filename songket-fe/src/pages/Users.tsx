import { useEffect, useState } from 'react'
import { adminCreateUser, deleteUserById, listUsers, updateUserById } from '../api'

const empty = { name: '', email: '', phone: '', password: '', role: 'dealer' }

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = () => listUsers().then((r) => setUsers(r.data.data || r.data))

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    setLoading(true)
    setError('')
    try {
      if (editing) {
        const body: any = { ...form }
        if (!body.password) delete body.password
        await updateUserById(editing, body)
      } else {
        await adminCreateUser(form)
      }
      setForm(empty)
      setEditing(null)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Gagal')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete user?')) return
    await deleteUserById(id)
    load()
  }

  const startEdit = (u: any) => {
    setEditing(u.id)
    setForm({ name: u.name, email: u.email, phone: u.phone, password: '', role: u.role })
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>User Management</div>
          <div style={{ color: '#9ca3af' }}>Create, edit, delete users</div>
        </div>
      </div>
      <div className="page grid lg:grid-cols-[1.2fr_1fr]">
        <div className="card">
          <h3>Daftar User</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge pending">{u.role}</span></td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" onClick={() => startEdit(u)}>Edit</button>
                    <button className="btn-ghost" onClick={() => remove(u.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>{editing ? 'Edit User' : 'Tambah User'}</h3>
          <div className="grid" style={{ gap: 10 }}>
            <div>
              <label>Nama</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label>Password {editing && '(opsional)'}</label>
              <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
            </div>
            <div>
              <label>Role</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="superadmin">Superadmin</option>
                <option value="admin">Admin</option>
                <option value="main_dealer">Main Dealer</option>
                <option value="dealer">Dealer</option>
              </select>
            </div>
            {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
              {editing && (
                <button className="btn-ghost" onClick={() => { setEditing(null); setForm(empty) }}>Batal</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
