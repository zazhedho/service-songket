import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createMenu, deleteMenu, listMenus, updateMenu } from '../api'
import { AppIcon, ICON_LABELS, MENU_ICON_OPTIONS, normalizeIconName } from '../components/AppIcon'
import Pagination from '../components/Pagination'
import { MENUS_UPDATED_EVENT } from '../constants/events'
import { useAuth } from '../store'

type MenuItem = {
  id: string
  name?: string
  display_name?: string
  path?: string
  icon?: string
  parent_id?: string
  order_index?: number
  is_active?: boolean
}

type MenuForm = {
  name: string
  display_name: string
  path: string
  icon: string
  parent_id: string
  order_index: number
  is_active: boolean
}

const empty: MenuForm = { name: '', display_name: '', path: '', icon: 'menu', parent_id: '', order_index: 0, is_active: true }

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

  const [items, setItems] = useState<MenuItem[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stateItem = (location.state as any)?.menu || null

  const load = async () => {
    const res = await listMenus({ page, limit, search: search || undefined })
    const data = res.data.data || res.data || []
    setItems(Array.isArray(data) ? data : [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || page)
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setItems([]))
    }
  }, [canList, isDetail, isEdit, isList, limit, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

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
        icon: normalizeIconName(selectedItem.icon, selectedItem),
        parent_id: selectedItem.parent_id || '',
        order_index: Number(selectedItem.order_index || 0),
        is_active: Boolean(selectedItem.is_active),
      })
    }
  }, [isCreate, isEdit, selectedItem])

  const parentOptions = useMemo(() => {
    return items
      .filter((item) => item.id !== selectedId)
      .map((item) => ({
        id: item.id,
        label: item.display_name || item.name || item.path || item.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [items, selectedId])

  const selectedParentInOptions = useMemo(
    () => parentOptions.some((option) => option.id === form.parent_id),
    [form.parent_id, parentOptions],
  )

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setError('')

    try {
      const parentId = String(form.parent_id || '').trim()
      const icon = normalizeIconName(form.icon, { path: form.path, icon: form.icon })
      const body = {
        ...form,
        icon,
        order_index: Number(form.order_index),
        parent_id: parentId || null,
      }
      if (isEdit && selectedId) await updateMenu(selectedId, body)
      else await createMenu(body)
      window.dispatchEvent(new Event(MENUS_UPDATED_EVENT))
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(empty)
      navigate('/menus')
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to save menu'
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    if (!window.confirm('Delete this menu?')) return
    await deleteMenu(id)
    window.dispatchEvent(new Event(MENUS_UPDATED_EVENT))
    await load()
  }

  const set = (key: keyof typeof empty, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Menu Details</div>
            <div style={{ color: '#64748b' }}>Route and menu configuration details</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/menus/${selectedId}/edit`, { state: { menu: selectedItem } })}>
                Edit Menu
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/menus')}>Back</button>
          </div>
        </div>

        <div className="page">
          {!selectedItem && <div className="alert">Menu not found.</div>}
          {selectedItem && (
            <div className="card" style={{ maxWidth: 760 }}>
              <DetailRow label="Name" value={selectedItem.name} />
              <DetailRow label="Display Name" value={selectedItem.display_name} />
              <DetailRow label="Path" value={selectedItem.path} />
              <DetailRow label="Icon" value={selectedItem.icon} />
              <DetailRow label="Parent ID" value={selectedItem.parent_id || '-'} />
              <DetailRow label="Order Index" value={String(selectedItem.order_index ?? 0)} />
              <DetailRow label="Status" value={selectedItem.is_active ? 'Active' : 'Inactive'} />
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Menu' : 'Create New Menu'}</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/menus')}>Back to Table</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 860 }}>
            {!canCreate && isCreate && <div className="alert">No permission to create menu.</div>}
            {!canUpdate && isEdit && <div className="alert">No permission to update menu.</div>}

            <div className="grid" style={{ gap: 10 }}>
              <div><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div><label>Display Name</label><input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} /></div>
              <div><label>Path</label><input value={form.path} onChange={(e) => set('path', e.target.value)} /></div>
              <div>
                <label>Parent Menu</label>
                <select value={form.parent_id} onChange={(e) => set('parent_id', e.target.value)}>
                  <option value="">None (Root Menu)</option>
                  {!selectedParentInOptions && form.parent_id && (
                    <option value={form.parent_id}>{`Current Parent (${form.parent_id})`}</option>
                  )}
                  {parentOptions.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Order Index</label>
                <input type="number" value={form.order_index} onChange={(e) => set('order_index', Number(e.target.value))} />
              </div>
              <div>
                <label>Status</label>
                <select value={form.is_active ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Icon</label>
                <div className="icon-picker-grid">
                  {MENU_ICON_OPTIONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      className={`icon-picker-item ${form.icon === iconName ? 'selected' : ''}`}
                      onClick={() => set('icon', iconName)}
                      aria-label={`Select ${ICON_LABELS[iconName]} icon`}
                      title={ICON_LABELS[iconName]}
                    >
                      <AppIcon name={iconName} className="icon-picker-svg" />
                      <span>{ICON_LABELS[iconName]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => void save()} disabled={loading}>
                  {loading ? 'Saving...' : isEdit ? 'Update Menu' : 'Create Menu'}
                </button>
                <button className="btn-ghost" onClick={() => navigate('/menus')}>Cancel</button>
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
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/menus/create')}>Create Menu</button>}
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search Menu</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/path" />
          </div>

          <h3>Menu List</h3>
          {!canList && <div className="alert">No permission to view menu.</div>}
          {canList && (
            <>
              <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.display_name || item.name}</td>
                    <td>{item.path || '-'}</td>
                    <td>{item.is_active ? 'Active' : 'Inactive'}</td>
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
                    <td colSpan={4}>No menus yet.</td>
                  </tr>
                )}
              </tbody>
              </table>

              <Pagination
                page={page}
                totalPages={totalPages}
                totalData={totalData}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next)
                  setPage(1)
                }}
              />
            </>
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
