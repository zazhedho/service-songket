import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createMenu, deleteMenu, listMenus, updateMenu } from '../api'
import { useAuth } from '../store'

const empty = { name: '', display_name: '', path: '', icon: '', parent_id: '', order_index: 0, is_active: true }

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/menus\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function MenusPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_menus')
  const canCreate = perms.includes('create_menu')
  const canUpdate = perms.includes('update_menu')
  const canDelete = perms.includes('delete_menu')

  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stateItem = (location.state as any)?.menu || null

  const load = async () => {
    const res = await listMenus()
    setItems(res.data.data || res.data || [])
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setItems([]))
    }
  }, [canList, isDetail, isEdit])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null)
  }, [items, selectedId, stateItem])

  useEffect(() => {
    if (isCreate) {
      setForm(empty)
      return
    }

    if (isEdit && selectedItem) {
      setForm({
        name: selectedItem.name || '',
        display_name: selectedItem.display_name || '',
        path: selectedItem.path || '',
        icon: selectedItem.icon || '',
        parent_id: selectedItem.parent_id || '',
        order_index: Number(selectedItem.order_index || 0),
        is_active: Boolean(selectedItem.is_active),
      })
    }
  }, [isCreate, isEdit, selectedItem])

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setError('')

    try {
      const body = { ...form, order_index: Number(form.order_index) }
      if (isEdit && selectedId) await updateMenu(selectedId, body)
      else await createMenu(body)
      setForm(empty)
      navigate('/menus')
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Gagal menyimpan menu'
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    if (!window.confirm('Hapus menu?')) return
    await deleteMenu(id)
    await load()
  }

  const set = (key: keyof typeof empty, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Menu</div>
            <div style={{ color: '#64748b' }}>Informasi path dan konfigurasi menu</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/menus/${selectedId}/edit`, { state: { menu: selectedItem } })}>
                Edit Menu
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/menus')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedItem && <div className="alert">Menu tidak ditemukan.</div>}
          {selectedItem && (
            <div className="card" style={{ maxWidth: 760 }}>
              <DetailRow label="Name" value={selectedItem.name} />
              <DetailRow label="Display Name" value={selectedItem.display_name} />
              <DetailRow label="Path" value={selectedItem.path} />
              <DetailRow label="Icon" value={selectedItem.icon} />
              <DetailRow label="Parent ID" value={selectedItem.parent_id || '-'} />
              <DetailRow label="Order Index" value={String(selectedItem.order_index ?? 0)} />
              <DetailRow label="Active" value={selectedItem.is_active ? 'Ya' : 'Tidak'} />
              <DetailRow label="Menu ID" value={selectedItem.id} />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isCreate || isEdit) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Menu' : 'Input Menu Baru'}</div>
            <div style={{ color: '#64748b' }}>Form menu dipisahkan dari tabel</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/menus')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 860 }}>
            {!canCreate && isCreate && <div className="alert">Tidak ada izin membuat menu.</div>}
            {!canUpdate && isEdit && <div className="alert">Tidak ada izin mengubah menu.</div>}

            <div className="grid" style={{ gap: 10 }}>
              <div><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div><label>Display Name</label><input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} /></div>
              <div><label>Path</label><input value={form.path} onChange={(e) => set('path', e.target.value)} /></div>
              <div><label>Icon</label><input value={form.icon} onChange={(e) => set('icon', e.target.value)} /></div>
              <div><label>Parent ID</label><input value={form.parent_id} onChange={(e) => set('parent_id', e.target.value)} /></div>
              <div>
                <label>Order Index</label>
                <input type="number" value={form.order_index} onChange={(e) => set('order_index', Number(e.target.value))} />
              </div>
              <div>
                <label>Active</label>
                <select value={form.is_active ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
                  <option value="true">Aktif</option>
                  <option value="false">Non Aktif</option>
                </select>
              </div>

              {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => void save()} disabled={loading}>
                  {loading ? 'Saving...' : isEdit ? 'Update Menu' : 'Create Menu'}
                </button>
                <button className="btn-ghost" onClick={() => navigate('/menus')}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Menus</div>
          <div style={{ color: '#64748b' }}>Daftar menu dengan aksi create/edit/detail/delete</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/menus/create')}>Input Menu</button>}
      </div>

      <div className="page">
        <div className="card">
          <h3>Daftar Menu</h3>
          {!canList && <div className="alert">Tidak ada izin melihat menu.</div>}
          {canList && (
            <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Path</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.display_name || item.name}</td>
                    <td>{item.path || '-'}</td>
                    <td>{item.is_active ? 'Ya' : 'Tidak'}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-ghost" onClick={() => navigate(`/menus/${item.id}`, { state: { menu: item } })}>View</button>
                      {canUpdate && (
                        <button className="btn-ghost" onClick={() => navigate(`/menus/${item.id}/edit`, { state: { menu: item } })}>
                          Edit
                        </button>
                      )}
                      {canDelete && <button className="btn-ghost" onClick={() => void remove(item.id)}>Delete</button>}
                      {!canUpdate && !canDelete && '-'}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4}>Belum ada menu.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, padding: '6px 0' }}>
      <div style={{ color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value || '-'}</div>
    </div>
  )
}
