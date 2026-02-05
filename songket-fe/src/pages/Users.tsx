import { useEffect, useState } from 'react'
import {
  adminCreateUser,
  deleteUserById,
  listUsers,
  updateUserById,
  listPermissions,
  getUserPermissions,
  setUserPermissions,
} from '../api'
import { useAuth } from '../store'

const empty = { name: '', email: '', phone: '', password: '', role: 'dealer' }

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const perms = useAuth((s) => s.permissions)
  const role = useAuth((s) => s.role)

  const canList = perms.includes('list_users')
  const canCreate = perms.includes('create_users')
  const canUpdate = perms.includes('update_users')
  const canDelete = perms.includes('delete_users')
  const canSetUserPerm = role === 'superadmin' // hanya superadmin

  const load = () => listUsers().then((r) => setUsers(r.data.data || r.data))
  const [allPerms, setAllPerms] = useState<any[]>([])
  const [permUserId, setPermUserId] = useState<string | null>(null)
  const [permChecked, setPermChecked] = useState<string[]>([])
  const [permLoading, setPermLoading] = useState(false)
  const [permDraft, setPermDraft] = useState<string[]>([]) // for create/edit form

  type Perm = { id: string; name?: string; display_name?: string; resource?: string; action?: string }
  const groupPerms = (permsArr: Perm[]) => {
    const grouped: Record<string, Perm[]> = {}
    permsArr.forEach((p) => {
      const res = p.resource || 'other'
      grouped[res] = grouped[res] || []
      grouped[res].push(p)
    })
    Object.values(grouped).forEach((list) =>
      list.sort((a, b) => (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')),
    )
    return grouped
  }

  const groupedAll = groupPerms(allPerms)
  const filterResourcesByRole = (grouped: Record<string, Perm[]>) => {
    if (role === 'superadmin') return grouped
    if (role === 'main_dealer') {
      const allow = ['orders', 'finance', 'credit', 'quadrants', 'commodities', 'news', 'scrape_sources', 'menus']
      return Object.fromEntries(Object.entries(grouped).filter(([res]) => allow.includes(res)))
    }
    if (role === 'dealer') {
      const allow = ['orders']
      return Object.fromEntries(Object.entries(grouped).filter(([res]) => allow.includes(res)))
    }
    return grouped
  }
  const groupedByRole = filterResourcesByRole(groupedAll)
  const filterResourcesByTargetRole = (targetRole: string, grouped: Record<string, Perm[]>) => {
    if (targetRole === 'superadmin' || targetRole === 'admin') return grouped
    if (targetRole === 'main_dealer') {
      const allow = ['orders', 'finance', 'credit', 'quadrants', 'commodities', 'news', 'dashboard', 'prices']
      return Object.fromEntries(Object.entries(grouped).filter(([res]) => allow.includes(res)))
    }
    if (targetRole === 'dealer') {
      const allow = ['orders', 'dashboard']
      return Object.fromEntries(Object.entries(grouped).filter(([res]) => allow.includes(res)))
    }
    return grouped
  }

  useEffect(() => {
    if (canList) load()
    if (canSetUserPerm)
      listPermissions({ limit: 500, page: 1, order_by: 'resource', order_direction: 'asc' }).then((p: any) =>
        setAllPerms(p.data.data || p.data || []),
      )
  }, [canList, canSetUserPerm])

  const save = async () => {
    if (!canCreate && !canUpdate) return
    setLoading(true)
    setError('')
    try {
      if (editing) {
        const body: any = { ...form }
        if (!body.password) delete body.password
        await updateUserById(editing, body)
      } else {
        const body: any = { ...form }
        if (canSetUserPerm && permDraft.length > 0) body.permission_ids = permDraft
        await adminCreateUser(body)
      }
      setForm(empty)
      setEditing(null)
      setPermDraft([])
      load()
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Gagal')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    if (!confirm('Delete user?')) return
    await deleteUserById(id)
    load()
  }

  const openPermModal = async (userId: string) => {
    if (!canSetUserPerm) return
    setPermLoading(true)
    setPermUserId(userId)
    try {
      const res = await getUserPermissions(userId)
      const ids = (res.data?.data || res.data || []).map((p: any) => p.id)
      setPermChecked(ids)
    } finally {
      setPermLoading(false)
    }
  }

  const togglePerm = (id: string) => {
    setPermChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const saveUserPerms = async () => {
    if (!permUserId) return
    setPermLoading(true)
    try {
      await setUserPermissions(permUserId, permChecked)
    } finally {
      setPermLoading(false)
    }
  }

  const startEdit = (u: any) => {
    setEditing(u.id)
    setForm({ name: u.name, email: u.email, phone: u.phone, password: '', role: u.role })
    setPermDraft([]) // we don't preload perms into draft for edit; manage via Permissions button
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const renderPermTable = (
    selected: string[],
    toggle: (id: string) => void,
    customGrouped?: Record<string, Perm[]>,
  ) => {
    const sourceGrouped = customGrouped || groupedByRole
    const resources = Object.keys(sourceGrouped).sort((a, b) => a.localeCompare(b))
    if (!resources.length) return <div style={{ color: '#9ca3af', fontSize: 12 }}>Permission belum tersedia.</div>

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {resources.map((res) => (
          <div key={res} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 8 }}>
            <div className="perm-resource" style={{ marginBottom: 6 }}>
              {res.replace(/_/g, ' ')}
            </div>
            <div className="perm-table">
              <div className="perm-row perm-head">
                <div>Permission</div>
                <div>Action</div>
                <div className="perm-cell">Allow</div>
              </div>
              {sourceGrouped[res].map((p) => {
                const checked = selected.includes(p.id)
                return (
                  <div key={p.id} className="perm-row">
                    <div className="perm-title">{p.display_name || p.name}</div>
                    <div className="perm-meta">{p.action}</div>
                    <div className="perm-cell">
                      <input
                        type="checkbox"
                        className="perm-checkbox"
                        checked={checked}
                        onChange={() => toggle(p.id)}
                        title={p.display_name || p.name}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div style={{ color: '#9ca3af', fontSize: 11 }}>Checkbox diperkecil agar tabel tidak melebar.</div>
      </div>
    )
  }

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
          {!canList && <div className="alert">Tidak ada izin melihat data.</div>}
          {canList && (
            <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge pending">{u.role}</span>
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    {canUpdate && <button className="btn-ghost" onClick={() => startEdit(u)}>Edit</button>}
                    {canDelete && <button className="btn-ghost" onClick={() => remove(u.id)}>Delete</button>}
                    {canSetUserPerm && <button className="btn-ghost" onClick={() => openPermModal(u.id)}>Permissions</button>}
                    {!canUpdate && !canDelete && !canSetUserPerm && '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
        <div className="card">
          <h3>{editing ? 'Edit User' : 'Tambah User'}</h3>
          {!canCreate && !canUpdate && <div className="alert">Tidak ada izin ubah/buat user.</div>}
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
            {canSetUserPerm && !editing && (
              <div>
                <label>Permission (opsional, hanya superadmin)</label>
                {renderPermTable(
                  permDraft,
                  (id) => setPermDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
                  filterResourcesByTargetRole(form.role, groupedAll),
                )}
              </div>
            )}
            {canSetUserPerm && editing && (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                Ubah permission user via tombol Permissions di tabel user.
              </div>
            )}
            {canSetUserPerm && !editing && permDraft.length === 0 && (
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Checklist sesuai role, opsional.</div>
            )}
            {!canSetUserPerm && editing && (
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Permission hanya dapat diatur oleh superadmin.</div>
            )}
            {canSetUserPerm && editing && (
              <div>
                <label>Permission (opsional, hanya superadmin)</label>
                {renderPermTable(permDraft, (id) =>
                  setPermDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
                  filterResourcesByTargetRole(form.role, groupedAll),
                )}
              </div>
            )}
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
          {canSetUserPerm && permUserId && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>Set Permissions User</h3>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>User ID: {permUserId}</div>
              </div>
              {permLoading && <div>Loading permissions...</div>}
              {!permLoading && (
                <>
                  {renderPermTable(permChecked, togglePerm)}
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={saveUserPerms} disabled={permLoading}>{permLoading ? 'Saving...' : 'Save Permissions'}</button>
                    <button className="btn-ghost" onClick={() => { setPermUserId(null); setPermChecked([]) }}>Tutup</button>
                  </div>
                </>
              )}
            </div>
          )}
    </div>
  )
}
