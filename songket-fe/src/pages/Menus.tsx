import { useEffect, useState } from 'react'
import { createMenu, deleteMenu, listMenus, updateMenu } from '../api'

const empty = { name: '', display_name: '', path: '', icon: '', parent_id: '', order_index: 0, is_active: true }

export default function MenusPage() {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string>('')

  const load = () => listMenus().then((r) => setItems(r.data.data || r.data))
  useEffect(() => { load() }, [])

  const save = async () => {
    const body = { ...form, order_index: Number(form.order_index) }
    if (editing) await updateMenu(editing, body)
    else await createMenu(body)
    setEditing('')
    setForm(empty)
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus menu?')) return
    await deleteMenu(id)
    load()
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Menus</div>
          <div style={{ color: '#9ca3af' }}>Kelola menu & path akses</div>
        </div>
      </div>
      <div className="page grid lg:grid-cols-[1.2fr_1fr]">
        <div className="card">
          <h3>Daftar Menu</h3>
          <table className="table">
            <thead><tr><th>Nama</th><th>Path</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td>{m.display_name || m.name}</td>
                  <td>{m.path}</td>
                  <td>{m.is_active ? 'Ya' : 'Tidak'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" onClick={() => { setEditing(m.id); setForm({ ...m, parent_id: m.parent_id || '' }) }}>Edit</button>
                    <button className="btn-ghost" onClick={() => remove(m.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>{editing ? 'Edit Menu' : 'Tambah Menu'}</h3>
          <div className="grid" style={{ gap: 10 }}>
            <div><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div><label>Display Name</label><input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} /></div>
            <div><label>Path</label><input value={form.path} onChange={(e) => set('path', e.target.value)} /></div>
            <div><label>Icon</label><input value={form.icon} onChange={(e) => set('icon', e.target.value)} /></div>
            <div><label>Parent ID</label><input value={form.parent_id} onChange={(e) => set('parent_id', e.target.value)} /></div>
            <div><label>Order Index</label><input type="number" value={form.order_index} onChange={(e) => set('order_index', Number(e.target.value))} /></div>
            <div>
              <label>Active</label>
              <select value={form.is_active ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
                <option value="true">Aktif</option>
                <option value="false">Non Aktif</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={save}>{editing ? 'Update' : 'Create'}</button>
              {editing && <button className="btn-ghost" onClick={() => { setEditing(''); setForm(empty) }}>Batal</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
