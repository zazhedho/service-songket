import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  adminCreateUser,
  deleteUserById,
  getRoleById,
  getUserPermissions,
  listMenus,
  listPermissions,
  listRoles,
  listUsers,
  setUserPermissions,
  updateUserById,
} from '../api'
import { useConfirm } from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'

const emptyForm = { name: '', email: '', phone: '', password: '', role: 'dealer' }

type Perm = {
  id: string
  name?: string
  display_name?: string
  resource?: string
  action?: string
}
type RoleItem = { id: string; name?: string; display_name?: string }
type MenuItem = { id: string; name?: string; path?: string }

const MENU_RESOURCE_ALIASES: Record<string, string[]> = {
  prices: ['commodities'],
  jobs: ['net_income'],
  installments: ['motor_types'],
  role_menu_access: ['roles', 'menus'],
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/users\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function detailValue(value: unknown) {
  if (value == null || value === '') return '-'
  return String(value)
}

function normalizeKey(value?: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
}

function sanitizeIdList(ids: string[]) {
  return Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)))
}

function roleLabel(value: string) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function roleNames(items: RoleItem[]) {
  return Array.from(
    new Set(
      items
        .map((item) => String(item?.name || '').trim())
        .filter(Boolean),
    ),
  )
}

export default function UsersPage() {
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()

  const perms = useAuth((s) => s.permissions)
  const role = useAuth((s) => s.role)

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const canList = perms.includes('list_users')
  const canCreate = perms.includes('create_users')
  const canUpdate = perms.includes('update_users')
  const canDelete = perms.includes('delete_users')
  const canSetUserPerm = role === 'superadmin'
  const confirm = useConfirm()

  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [allPerms, setAllPerms] = useState<Perm[]>([])
  const [permUserId, setPermUserId] = useState<string | null>(null)
  const [permTargetRole, setPermTargetRole] = useState<string | null>(null)
  const [permChecked, setPermChecked] = useState<string[]>([])
  const [permDraft, setPermDraft] = useState<string[]>([])
  const [permLoading, setPermLoading] = useState(false)
  const [roleResourceMap, setRoleResourceMap] = useState<Record<string, string[]>>({})
  const [roleResourceLoading, setRoleResourceLoading] = useState(false)
  const [roleOptions, setRoleOptions] = useState<RoleItem[]>([])
  const [detailPermissions, setDetailPermissions] = useState<string[]>([])
  const [detailPermLoading, setDetailPermLoading] = useState(false)

  const stateUser = (location.state as any)?.user || null

  const loadUsers = async () => {
    const res = await listUsers({ page, limit, search: search || undefined })
    setUsers(res.data.data || res.data || [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || page)
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      loadUsers().catch(() => setUsers([]))
    }
  }, [canList, isDetail, isEdit, isList, limit, page, search])

  useEffect(() => {
    listRoles({ page: 1, limit: 500 })
      .then((res: any) => setRoleOptions(res.data.data || res.data || []))
      .catch(() => setRoleOptions([]))
  }, [])

  const menuToResources = (menu?: MenuItem) => {
    const resources = new Set<string>()
    const menuName = normalizeKey(menu?.name)
    if (menuName) resources.add(menuName)

    const pathKey = normalizeKey(menu?.path?.replace(/^\//, '').split('/')[0] || '')
    if (pathKey) resources.add(pathKey)

    ;(MENU_RESOURCE_ALIASES[menuName] || []).forEach((resource) => resources.add(normalizeKey(resource)))
    ;(MENU_RESOURCE_ALIASES[pathKey] || []).forEach((resource) => resources.add(normalizeKey(resource)))
    return Array.from(resources)
  }

  const loadRoleResourceMap = async () => {
    if (!canSetUserPerm) {
      setRoleResourceMap({})
      return {}
    }

    setRoleResourceLoading(true)
    try {
      const [rolesRes, menusRes] = await Promise.all([listRoles({ page: 1, limit: 500 }), listMenus({ page: 1, limit: 500 })])
      const rolesData: RoleItem[] = rolesRes.data.data || rolesRes.data || []
      const menusData: MenuItem[] = menusRes.data.data || menusRes.data || []
      const menuById = menusData.reduce<Record<string, MenuItem>>((acc, menu) => {
        acc[menu.id] = menu
        return acc
      }, {})

      const details = await Promise.all(
        rolesData.map(async (roleItem) => {
          try {
            const detailRes = await getRoleById(roleItem.id)
            const detail = detailRes.data?.data || detailRes.data || {}
            return {
              roleName: normalizeKey(roleItem.name),
              menuIds: Array.isArray(detail?.menu_ids) ? detail.menu_ids : [],
            }
          } catch {
            return {
              roleName: normalizeKey(roleItem.name),
              menuIds: [] as string[],
            }
          }
        }),
      )

      const nextMap: Record<string, string[]> = {}
      details.forEach(({ roleName, menuIds }) => {
        const allowed = new Set<string>()
        menuIds.forEach((menuId) => {
          menuToResources(menuById[menuId]).forEach((resource) => allowed.add(resource))
        })
        nextMap[roleName] = Array.from(allowed)
      })
      setRoleResourceMap(nextMap)
      return nextMap
    } catch {
      setRoleResourceMap({})
      return {}
    } finally {
      setRoleResourceLoading(false)
    }
  }

  useEffect(() => {
    if (!canSetUserPerm) {
      setAllPerms([])
      setRoleResourceMap({})
      return
    }

    listPermissions({ limit: 500, page: 1, order_by: 'resource', order_direction: 'asc' })
      .then((p: any) => setAllPerms(p.data.data || p.data || []))
      .catch(() => setAllPerms([]))

    void loadRoleResourceMap()
  }, [canSetUserPerm])

  useEffect(() => {
    if (!canSetUserPerm) return
    if (!isCreate && !isEdit) return
    void loadRoleResourceMap()
  }, [canSetUserPerm, isCreate, isEdit])

  useEffect(() => {
    setPage(1)
  }, [search])

  const selectedUser = useMemo(() => {
    if (!selectedId) return null
    return users.find((u) => u.id === selectedId) || (stateUser?.id === selectedId ? stateUser : null)
  }, [selectedId, stateUser, users])

  const selectedRoleDisplay = useMemo(() => {
    if (!selectedUser) return '-'

    const byId = roleOptions.find((roleItem) => String(roleItem.id || '') === String(selectedUser.role_id || ''))
    if (byId) {
      return byId.display_name || roleLabel(byId.name || selectedUser.role || '')
    }

    const byName = roleOptions.find(
      (roleItem) => normalizeKey(roleItem.name) === normalizeKey(selectedUser.role),
    )
    if (byName) {
      return byName.display_name || roleLabel(byName.name || selectedUser.role || '')
    }

    return roleLabel(detailValue(selectedUser.role))
  }, [roleOptions, selectedUser])

  const permUserName = useMemo(() => {
    if (!permUserId) return '-'
    return users.find((user) => user.id === permUserId)?.name || '-'
  }, [permUserId, users])

  const availableRoleNames = useMemo(() => {
    const backendRoles = roleNames(roleOptions)
    if (form.role && !backendRoles.includes(form.role)) {
      return [form.role, ...backendRoles]
    }
    if (backendRoles.length > 0) return backendRoles
    return ['superadmin', 'admin', 'main_dealer', 'dealer']
  }, [form.role, roleOptions])

  useEffect(() => {
    if (!isDetail || !selectedUser?.id) {
      setDetailPermissions([])
      setDetailPermLoading(false)
      return
    }

    const fallback = Array.isArray(selectedUser?.permissions)
      ? selectedUser.permissions.map((item: any) => String(item)).filter(Boolean)
      : []

    if (!canSetUserPerm) {
      setDetailPermissions(fallback)
      setDetailPermLoading(false)
      return
    }

    setDetailPermLoading(true)
    getUserPermissions(selectedUser.id)
      .then((res: any) => {
        const raw = res.data?.data || res.data || []
        const labels = Array.isArray(raw)
          ? raw
              .map((perm: any) => String(perm?.display_name || perm?.name || perm?.id || '').trim())
              .filter(Boolean)
          : []
        setDetailPermissions(labels)
      })
      .catch(() => {
        setDetailPermissions(fallback)
      })
      .finally(() => setDetailPermLoading(false))
  }, [canSetUserPerm, isDetail, selectedUser?.id, selectedUser?.permissions])

  useEffect(() => {
    if (isCreate) {
      setEditingId(null)
      setForm(emptyForm)
      return
    }
    if (isEdit && selectedId) {
      const target = selectedUser
      if (target) {
        setEditingId(selectedId)
        setForm({
          name: target.name || '',
          email: target.email || '',
          phone: target.phone || '',
          password: '',
          role: target.role || 'dealer',
        })
      }
    }
  }, [isCreate, isEdit, selectedId, selectedUser])

  const groupPerms = (items: Perm[]) => {
    const grouped: Record<string, Perm[]> = {}
    items.forEach((p) => {
      const resource = p.resource || 'other'
      if (!grouped[resource]) grouped[resource] = []
      grouped[resource].push(p)
    })
    Object.keys(grouped).forEach((resource) => {
      grouped[resource].sort((a, b) => (a.display_name || a.name || '').localeCompare(b.display_name || b.name || ''))
    })
    return grouped
  }

  const groupedAll = groupPerms(allPerms)

  const filterResourcesByTargetRole = (
    targetRole: string,
    grouped: Record<string, Perm[]>,
    customRoleResourceMap?: Record<string, string[]>,
  ) => {
    const sourceMap = customRoleResourceMap || roleResourceMap
    const roleKey = normalizeKey(targetRole)
    const hasMappedRole = Object.prototype.hasOwnProperty.call(sourceMap, roleKey)
    if (!hasMappedRole) return grouped

    const allowedResources = sourceMap[roleKey] || []
    if (!allowedResources.length) return {}

    const allowSet = new Set(allowedResources.map((resource) => normalizeKey(resource)))
    return Object.fromEntries(
      Object.entries(grouped).filter(([resource]) => allowSet.has(normalizeKey(resource))),
    )
  }

  const allowedPermissionIdsForRole = (targetRole: string, customRoleResourceMap?: Record<string, string[]>) => {
    const grouped = filterResourcesByTargetRole(targetRole, groupedAll, customRoleResourceMap)
    const ids = Object.values(grouped).flat().map((permission) => permission.id)
    return new Set(ids)
  }

  useEffect(() => {
    if (!canSetUserPerm || !permDraft.length) return
    const allowed = allowedPermissionIdsForRole(form.role)
    setPermDraft((prev) => {
      const next = prev.filter((id) => allowed.has(id))
      return next.length === prev.length ? prev : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSetUserPerm, form.role, groupedAll, roleResourceMap])

  const renderPermTable = (
    selected: string[],
    toggle: (id: string) => void,
    customGrouped?: Record<string, Perm[]>,
  ) => {
    const sourceGrouped = customGrouped || groupedAll
    const resources = Object.keys(sourceGrouped).sort((a, b) => a.localeCompare(b))

    if (!resources.length) {
      return <div style={{ color: '#64748b', fontSize: 12 }}>Permission belum tersedia.</div>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {resources.map((resource) => (
          <div key={resource} style={{ border: '1px solid #dde4ee', borderRadius: 10, padding: 8, background: '#f8fafc' }}>
            <div className="perm-resource" style={{ marginBottom: 6 }}>{resource.replace(/_/g, ' ')}</div>
            <div className="perm-table">
              <div className="perm-row perm-head">
                <div>Permission</div>
                <div>Action</div>
                <div className="perm-cell">Allow</div>
              </div>
              {sourceGrouped[resource].map((permission) => {
                const checked = selected.includes(permission.id)
                return (
                  <div key={permission.id} className="perm-row">
                    <div className="perm-title">{permission.display_name || permission.name}</div>
                    <div className="perm-meta">{permission.action || '-'}</div>
                    <div className="perm-cell">
                      <input
                        type="checkbox"
                        className="perm-checkbox"
                        checked={checked}
                        onChange={() => toggle(permission.id)}
                        title={permission.display_name || permission.name}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setError('')

    try {
      if (editingId) {
        const body: any = { ...form }
        if (!body.password) delete body.password
        await updateUserById(editingId, body)
      } else {
        const body: any = { ...form }
        const permissionIds = sanitizeIdList(permDraft)
        if (canSetUserPerm && permissionIds.length > 0) body.permission_ids = permissionIds
        await adminCreateUser(body)
      }
      if (canList) {
        await loadUsers().catch(() => undefined)
      }
      setForm(emptyForm)
      setEditingId(null)
      setPermDraft([])
      navigate('/users')
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Gagal menyimpan user'
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete User',
      description: 'Are you sure you want to delete this user?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    await deleteUserById(id)
    await loadUsers()
  }

  const openPermModal = async (user: any) => {
    if (!canSetUserPerm) return
    setPermLoading(true)
    setPermUserId(user.id)
    setPermTargetRole(user.role)
    try {
      const latestRoleResourceMap = await loadRoleResourceMap()
      const res = await getUserPermissions(user.id)
      const ids = sanitizeIdList((res.data?.data || res.data || []).map((p: any) => p.id))
      if (allPerms.length === 0) {
        setPermChecked(ids)
        return
      }
      const allowed = allowedPermissionIdsForRole(user.role, latestRoleResourceMap)
      setPermChecked(ids.filter((id: string) => allowed.has(id)))
    } finally {
      setPermLoading(false)
    }
  }

  const togglePerm = (id: string) => {
    setPermChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const saveUserPerms = async () => {
    if (!permUserId) return
    const payload = sanitizeIdList(permChecked)
    setPermLoading(true)
    try {
      await setUserPermissions(permUserId, payload)
    } catch (err: any) {
      window.alert(err?.response?.data?.error || err?.message || 'Gagal menyimpan permissions')
    } finally {
      setPermLoading(false)
    }
  }

  const set = (key: keyof typeof emptyForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail User</div>
            <div style={{ color: '#64748b' }}>Lihat informasi detail user</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/users/${selectedId}/edit`, { state: { user: selectedUser } })}>
                Edit User
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/users')}>Kembali</button>
          </div>
        </div>
        <div className="page">
          {!selectedUser && <div className="alert">Data user tidak ditemukan.</div>}
          {selectedUser && (
            <div className="card" style={{ maxWidth: 940 }}>
              <h3>User Information</h3>
              <table className="table" style={{ marginTop: 10 }}>
                <tbody>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Name</th>
                    <td style={{ fontWeight: 600 }}>{detailValue(selectedUser.name)}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Email</th>
                    <td style={{ fontWeight: 600 }}>{detailValue(selectedUser.email)}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Phone</th>
                    <td style={{ fontWeight: 600 }}>{detailValue(selectedUser.phone)}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Role</th>
                    <td style={{ fontWeight: 600 }}>{selectedRoleDisplay}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Created At</th>
                    <td style={{ fontWeight: 600 }}>{formatDateTime(selectedUser.created_at)}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Updated At</th>
                    <td style={{ fontWeight: 600 }}>{formatDateTime(selectedUser.updated_at)}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Permission Count</th>
                    <td style={{ fontWeight: 600 }}>{detailPermissions.length}</td>
                  </tr>
                </tbody>
              </table>

              <h3 style={{ marginTop: 14 }}>Permissions</h3>
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>No</th>
                    <th>Permission</th>
                  </tr>
                </thead>
                <tbody>
                  {detailPermLoading && (
                    <tr>
                      <td colSpan={2}>Loading permissions...</td>
                    </tr>
                  )}
                  {!detailPermLoading && detailPermissions.length === 0 && (
                    <tr>
                      <td colSpan={2}>No permissions assigned.</td>
                    </tr>
                  )}
                  {!detailPermLoading && detailPermissions.map((permission, index) => (
                    <tr key={`${permission}-${index}`}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: 600 }}>{permission}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit User' : 'Input User Baru'}</div>
            <div style={{ color: '#64748b' }}>Form terpisah dari halaman tabel user</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/users')}>Kembali ke Tabel</button>
        </div>
        <div className="page">
          <div className="card" style={{ maxWidth: 920 }}>
            {!canCreate && isCreate && <div className="alert">Tidak ada izin membuat user.</div>}
            {!canUpdate && isEdit && <div className="alert">Tidak ada izin mengubah user.</div>}
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
                <label>Password {isEdit && '(opsional)'}</label>
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
              </div>
              <div>
                <label>Role</label>
                <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                  {availableRoleNames.map((roleName) => (
                    <option key={roleName} value={roleName}>
                      {roleLabel(roleName)}
                    </option>
                  ))}
                </select>
              </div>

              {canSetUserPerm && (
                <div>
                  <label>Permission (opsional, hanya superadmin)</label>
                  {roleResourceLoading && (
                    <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                      Sinkronisasi permission berdasarkan role menu...
                    </div>
                  )}
                  {renderPermTable(
                    permDraft,
                    (id) => setPermDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
                    filterResourcesByTargetRole(form.role, groupedAll),
                  )}
                </div>
              )}

              {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save User'}</button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setForm(emptyForm)
                    setEditingId(null)
                    navigate('/users')
                  }}
                >
                  Batal
                </button>
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>User Management</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCreate && <button className="btn" onClick={() => navigate('/users/create')}>Input User</button>}
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search User</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama/email/phone" />
          </div>

          <h3>Daftar User</h3>
          {!canList && <div className="alert">Tidak ada izin melihat data.</div>}
          {canList && (
            <>
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
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><span className="badge pending">{user.role}</span></td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-ghost" onClick={() => navigate(`/users/${user.id}`, { state: { user } })}>View</button>
                      {canUpdate && (
                        <button className="btn-ghost" onClick={() => navigate(`/users/${user.id}/edit`, { state: { user } })}>
                          Edit
                        </button>
                      )}
                      {canDelete && <button className="btn-ghost" onClick={() => void remove(user.id)}>Delete</button>}
                      {canSetUserPerm && <button className="btn-ghost" onClick={() => void openPermModal(user)}>Permissions</button>}
                      {!canUpdate && !canDelete && !canSetUserPerm && '-'}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4}>Belum ada user.</td>
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

        {canSetUserPerm && permUserId && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Set Permissions User</h3>
              <div style={{ fontSize: 12, color: '#64748b' }}>User: {permUserName}</div>
            </div>
            {permLoading && <div>Loading permissions...</div>}
            {!permLoading && (
              <>
                {roleResourceLoading && (
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                    Sinkronisasi permission berdasarkan role menu...
                  </div>
                )}
                {renderPermTable(
                  permChecked,
                  togglePerm,
                  permTargetRole ? filterResourcesByTargetRole(permTargetRole, groupedAll) : groupedAll,
                )}
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={saveUserPerms} disabled={permLoading}>
                    {permLoading ? 'Saving...' : 'Save Permissions'}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setPermUserId(null)
                      setPermTargetRole(null)
                      setPermChecked([])
                    }}
                  >
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDateTime(value: unknown) {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-US')
}
