import { useEffect, useState } from 'react'
import { assignRoleMenus, assignRolePermissions, createRole, deleteRole, listMenus, listRoles, listPermissions, updateRole } from '../api'

const empty = { name: '', display_name: '', description: '' }

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [menus, setMenus] = useState<any[]>([])
  const [perms, setPerms] = useState<any[]>([])
  const [form, setForm] = useState(empty)
  const [selected, setSelected] = useState<string>('')
  const [permInput, setPermInput] = useState('')
  const [menuInput, setMenuInput] = useState('')

  const load = async () => {
    const r = await listRoles()
    setRoles(r.data.data || r.data)
    const m = await listMenus()
    setMenus(m.data.data || m.data)
  }

  useEffect(() => {
    load()
    listPermissions().then((p: any) => setPerms(p.data.data || p.data)).catch(() => {})
  }, [])

  const saveRole = async () => {
    if (selected) await updateRole(selected, form)
    else await createRole(form)
    setForm(empty)
    setSelected('')
    load()
  }

  const applyPerms = async () => {
    if (!selected) return
    const ids = permInput.split(',').map((s) => s.trim()).filter(Boolean)
    await assignRolePermissions(selected, ids)
    setPermInput('')
  }

  const applyMenus = async () => {
    if (!selected) return
    const ids = menuInput.split(',').map((s) => s.trim()).filter(Boolean)
    await assignRoleMenus(selected, ids)
    setMenuInput('')
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus role?')) return
    await deleteRole(id)
    load()
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Roles & Access</div>
          <div style={{ color: '#9ca3af' }}>Kelola role, menu, permission</div>
        </div>
      </div>
      <div className="page grid lg:grid-cols-[1.2fr_1fr]">
        <div className="card">
          <h3>Daftar Role</h3>
          <table className="table">
            <thead>
              <tr><th>Nama</th><th>Display</th><th></th></tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.display_name}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" onClick={() => { setSelected(r.id); setForm({ name: r.name, display_name: r.display_name, description: r.description }) }}>Edit</button>
                    <button className="btn-ghost" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>{selected ? 'Edit Role' : 'Tambah Role'}</h3>
          <div className="grid" style={{ gap: 10 }}>
            <div>
              <label>Name</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label>Display Name</label>
              <input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
            </div>
            <div>
              <label>Description</label>
              <input value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={saveRole}>{selected ? 'Update' : 'Create'}</button>
              {selected && <button className="btn-ghost" onClick={() => { setSelected(''); setForm(empty) }}>Batal</button>}
            </div>
          </div>
          {selected && (
            <div style={{ marginTop: 16 }}>
              <h4>Assign Permissions (IDs, pisah koma)</h4>
              <input value={permInput} onChange={(e) => setPermInput(e.target.value)} placeholder="perm-id-1,perm-id-2" />
              <button className="btn-ghost" style={{ marginTop: 8 }} onClick={applyPerms}>Assign Perms</button>
              <h4 style={{ marginTop: 16 }}>Assign Menus (IDs, pisah koma)</h4>
              <input value={menuInput} onChange={(e) => setMenuInput(e.target.value)} placeholder="menu-id-1,menu-id-2" />
              <button className="btn-ghost" style={{ marginTop: 8 }} onClick={applyMenus}>Assign Menus</button>
              <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>Gunakan ID dari tabel di bawah.</p>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div className="card">
                  <h4>Menus</h4>
                  <div style={{ maxHeight: 160, overflow: 'auto' }}>
                    {menus.map((m) => (
                      <div key={m.id} style={{ fontSize: 12 }}>{m.id} — {m.name}</div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <h4>Permissions</h4>
                  <div style={{ maxHeight: 160, overflow: 'auto' }}>
                    {perms.map((p) => (
                      <div key={p.id} style={{ fontSize: 12 }}>{p.id} — {p.name}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
