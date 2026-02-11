import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  assignRoleMenus,
  assignRolePermissions,
  createRole,
  deleteRole,
  getRoleById,
  listMenus,
  listPermissions,
  listRoles,
  updateRole,
} from '../api'
import ActionMenu from '../components/ActionMenu'
import { useConfirm } from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'

const empty = { name: '', display_name: '', description: '' }

type NamedItem = {
  id: string
  name?: string
  display_name?: string
  description?: string
  path?: string
  resource?: string
  action?: string
  is_active?: boolean
}

const sanitizeIdList = (ids: string[]) => Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)))
const MENU_RESOURCE_ALIASES: Record<string, string[]> = {
  prices: ['commodities'],
  jobs: ['net_income'],
  installments: ['motor_types'],
  role_menu_access: ['roles', 'menus'],
}

function normalizeKey(value?: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/roles\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function RolesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const userPerms = useAuth((s) => s.permissions)
  const canList = userPerms.includes('list_roles')
  const canCreate = userPerms.includes('create_roles')
  const canUpdate = userPerms.includes('update_roles')
  const canDelete = userPerms.includes('delete_roles')
  const canAssignPerms = userPerms.includes('assign_permissions')
  const canAssignMenus = userPerms.includes('assign_menus')
  const confirm = useConfirm()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const [roles, setRoles] = useState<NamedItem[]>([])
  const [menus, setMenus] = useState<NamedItem[]>([])
  const [perms, setPerms] = useState<NamedItem[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const [form, setForm] = useState(empty)
  const [permDraft, setPermDraft] = useState<string[]>([])
  const [menuDraft, setMenuDraft] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [roleDetail, setRoleDetail] = useState<any>(null)

  const stateRole = (location.state as any)?.role || null

  const load = async () => {
    const [rolesRes, menusRes] = await Promise.all([
      listRoles({ page, limit, search: search || undefined }),
      listMenus({ page: 1, limit: 500 }),
    ])

    setRoles(rolesRes.data.data || rolesRes.data || [])
    setMenus(menusRes.data.data || menusRes.data || [])
    setTotalPages(rolesRes.data.total_pages || 1)
    setTotalData(rolesRes.data.total_data || 0)
    setPage(rolesRes.data.current_page || page)
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => {
        setRoles([])
        setMenus([])
      })
    }

    if (isCreate && canAssignMenus && !canList) {
      listMenus({ page: 1, limit: 500 })
        .then((res: any) => setMenus(res.data.data || res.data || []))
        .catch(() => setMenus([]))
    }

    listPermissions({ page: 1, limit: 500 })
      .then((res: any) => setPerms(res.data.data || res.data || []))
      .catch(() => setPerms([]))
  }, [canList, canAssignMenus, isCreate, isDetail, isEdit, isList, limit, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const selectedRole = useMemo(() => {
    if (!selectedId) return null
    return roles.find((r) => r.id === selectedId) || (stateRole?.id === selectedId ? stateRole : null)
  }, [roles, selectedId, stateRole])

  const isSystemRole = useMemo(() => {
    const explicit = Boolean(roleDetail?.is_system || selectedRole?.is_system)
    if (explicit) return true

    const roleName = String(roleDetail?.name || selectedRole?.name || form.name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
    return ['superadmin', 'admin', 'staff', 'viewer', 'dealer', 'main_dealer'].includes(roleName)
  }, [roleDetail?.is_system, roleDetail?.name, selectedRole?.is_system, selectedRole?.name, form.name])

  const sortedMenus = useMemo(
    () => [...menus].sort((a, b) => (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')),
    [menus],
  )

  const sortedPerms = useMemo(
    () => [...perms].sort((a, b) => (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')),
    [perms],
  )

  const assignableMenus = useMemo(
    () => sortedMenus.filter((menu) => menu.is_active !== false),
    [sortedMenus],
  )

  const menuById = useMemo(() => {
    const mapped: Record<string, NamedItem> = {}
    menus.forEach((menu) => {
      mapped[menu.id] = menu
    })
    return mapped
  }, [menus])

  const permById = useMemo(() => {
    const mapped: Record<string, NamedItem> = {}
    perms.forEach((perm) => {
      mapped[perm.id] = perm
    })
    return mapped
  }, [perms])

  const menuLabel = (id: string) => {
    const menu = menuById[id]
    return menu?.display_name || menu?.name || 'Menu tidak ditemukan'
  }

  const permissionLabel = (id: string) => {
    const perm = permById[id]
    if (!perm) return 'Permission tidak ditemukan'
    const base = perm.display_name || perm.name || 'Permission'
    return perm.action ? `${base} (${perm.action})` : base
  }

  const menuToResources = (menu?: NamedItem) => {
    const resources = new Set<string>()
    const menuName = normalizeKey(menu?.name)
    if (menuName) resources.add(menuName)

    const pathKey = normalizeKey(menu?.path?.replace(/^\//, '').split('/')[0] || '')
    if (pathKey) resources.add(pathKey)

    ;(MENU_RESOURCE_ALIASES[menuName] || []).forEach((resource) => resources.add(normalizeKey(resource)))
    ;(MENU_RESOURCE_ALIASES[pathKey] || []).forEach((resource) => resources.add(normalizeKey(resource)))
    return Array.from(resources)
  }

  const groupedPerms = useMemo(() => {
    const grouped: Record<string, NamedItem[]> = {}
    sortedPerms.forEach((perm) => {
      const resource = perm.resource || 'other'
      if (!grouped[resource]) grouped[resource] = []
      grouped[resource].push(perm)
    })
    return grouped
  }, [sortedPerms])

  const filteredGroupedPerms = useMemo(() => {
    if (!canAssignMenus) return groupedPerms
    if (!menuDraft.length) return {}

    const selectedResources = new Set<string>()
    menuDraft.forEach((menuId) => {
      menuToResources(menuById[menuId]).forEach((resource) => selectedResources.add(normalizeKey(resource)))
    })

    return Object.fromEntries(
      Object.entries(groupedPerms).filter(([resource]) => selectedResources.has(normalizeKey(resource))),
    )
  }, [canAssignMenus, groupedPerms, menuById, menuDraft])

  const allowedPermissionIdSet = useMemo(() => {
    return new Set(Object.values(filteredGroupedPerms).flat().map((perm) => perm.id))
  }, [filteredGroupedPerms])

  useEffect(() => {
    if (isCreate) {
      setForm(empty)
      setRoleDetail(null)
      setPermDraft([])
      setMenuDraft([])
      return
    }

    if (selectedId && (isEdit || isDetail)) {
      const preview = selectedRole
      if (preview) {
        setForm({
          name: preview.name || '',
          display_name: preview.display_name || '',
          description: preview.description || '',
        })
      }

      setLoading(true)
      getRoleById(selectedId)
        .then((res) => {
          const detail = res.data?.data || res.data || null
          setRoleDetail(detail)
          setPermDraft(sanitizeIdList(detail?.permission_ids || []))
          setMenuDraft(sanitizeIdList(detail?.menu_ids || []))
          setForm({
            name: detail?.name || preview?.name || '',
            display_name: detail?.display_name || preview?.display_name || '',
            description: detail?.description || preview?.description || '',
          })
        })
        .catch(() => {
          setRoleDetail(null)
          setPermDraft([])
          setMenuDraft([])
        })
        .finally(() => setLoading(false))
    }
  }, [isCreate, isDetail, isEdit, selectedId, selectedRole])

  useEffect(() => {
    if (!canAssignPerms || !canAssignMenus) return
    setPermDraft((prev) => {
      const next = prev.filter((id) => allowedPermissionIdSet.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [allowedPermissionIdSet, canAssignMenus, canAssignPerms])

  const toggleMenuDraft = (id: string) => {
    setMenuDraft((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const togglePermDraft = (id: string) => {
    setPermDraft((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const saveRole = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setError('')

    const permissionPayload = sanitizeIdList(permDraft)
    const menuPayload = sanitizeIdList(menuDraft)

    let roleId = selectedId
    let newlyCreated = false

    try {
      if (isEdit && selectedId) {
        if (!isSystemRole) {
          await updateRole(selectedId, {
            display_name: form.display_name,
            description: form.description,
          })
        }
        roleId = selectedId
      } else {
        const created = await createRole({
          name: form.name,
          display_name: form.display_name,
          description: form.description,
        })
        roleId = String(created?.data?.data?.id || created?.data?.id || '')
        newlyCreated = true
      }

      if (!roleId && ((canAssignMenus && menuPayload.length > 0) || (canAssignPerms && permissionPayload.length > 0))) {
        throw new Error('Role berhasil disimpan, tetapi ID role tidak ditemukan untuk menyimpan akses.')
      }

      if (roleId && canAssignPerms && permissionPayload.length > 0) {
        await assignRolePermissions(roleId, permissionPayload)
      }

      if (roleId && canAssignMenus && menuPayload.length > 0) {
        await assignRoleMenus(roleId, menuPayload)
      }

      if (canList) {
        await load().catch(() => undefined)
      }

      setForm(empty)
      setPermDraft([])
      setMenuDraft([])
      navigate('/roles')
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Gagal menyimpan role'

      if (newlyCreated && roleId) {
        const partialMessage = `Role berhasil dibuat, tetapi pengaturan akses gagal: ${message}`
        setError(partialMessage)
        await confirm({
          title: 'Partial Save',
          description: partialMessage,
          confirmText: 'OK',
          cancelText: 'Close',
        })
        navigate(`/roles/${roleId}/edit`)
      } else {
        setError(message)
        await confirm({
          title: 'Save Failed',
          description: message,
          confirmText: 'OK',
          cancelText: 'Close',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const renderPermissionTable = () => {
    const resources = Object.keys(filteredGroupedPerms).sort((a, b) => a.localeCompare(b))

    if (!resources.length) {
      return (
        <div style={{ color: '#64748b', fontSize: 12 }}>
          {canAssignMenus
            ? 'Belum ada permission yang bisa dipilih. Pilih menu dulu agar permission terkait muncul.'
            : 'Permission belum tersedia.'}
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {resources.map((resource) => (
          <div key={resource} style={{ border: '1px solid #dde4ee', borderRadius: 10, padding: 8, background: '#f8fafc' }}>
            <div className="perm-resource" style={{ marginBottom: 6 }}>{resource.replace(/_/g, ' ')}</div>
            <div className="perm-table">
              <div className="perm-row perm-head">
                <div>Permission</div>
                <div>Action</div>
                <div className="perm-cell">Allow</div>
              </div>
              {filteredGroupedPerms[resource].map((permission) => {
                const checked = permDraft.includes(permission.id)
                return (
                  <div key={permission.id} className="perm-row">
                    <div className="perm-title">{permission.display_name || permission.name}</div>
                    <div className="perm-meta">{permission.action || '-'}</div>
                    <div className="perm-cell">
                      <input
                        type="checkbox"
                        className="perm-checkbox"
                        checked={checked}
                        onChange={() => togglePermDraft(permission.id)}
                        disabled={loading}
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

  const remove = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Role',
      description: 'Are you sure you want to delete this role?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    await deleteRole(id)
    await load()
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Role Details</div>
            <div style={{ color: '#64748b' }}>Role profile with related menus and permissions</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/roles/${selectedId}/edit`, { state: { role: selectedRole } })}>
                Edit Role
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/roles')}>Back</button>
          </div>
        </div>

        <div className="page">
          {!selectedRole && !roleDetail && <div className="alert">Role not found.</div>}

          {(selectedRole || roleDetail) && (
            <div className="card" style={{ maxWidth: 960 }}>
              <h3 style={{ marginTop: 0 }}>Role Information</h3>
              <DetailTable
                rows={[
                  { label: 'Name', value: roleDetail?.name || selectedRole?.name || '-' },
                  { label: 'Display Name', value: roleDetail?.display_name || selectedRole?.display_name || '-' },
                  { label: 'Description', value: roleDetail?.description || selectedRole?.description || '-' },
                ]}
              />
            </div>
          )}

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card">
              <h3>Menu Access</h3>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>No</th>
                    <th>Menu</th>
                    <th>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {(roleDetail?.menu_ids || []).map((id: string, index: number) => {
                    const menu = menuById[id]
                    return (
                      <tr key={id}>
                        <td>{index + 1}</td>
                        <td>{menuLabel(id)}</td>
                        <td>{menu?.path || '-'}</td>
                      </tr>
                    )
                  })}
                  {(roleDetail?.menu_ids || []).length === 0 && (
                    <tr>
                      <td colSpan={3}>No menu access assigned.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Permissions</h3>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>No</th>
                    <th>Permission</th>
                  </tr>
                </thead>
                <tbody>
                  {(roleDetail?.permission_ids || []).map((id: string, index: number) => (
                    <tr key={id}>
                      <td>{index + 1}</td>
                      <td>{permissionLabel(id)}</td>
                    </tr>
                  ))}
                  {(roleDetail?.permission_ids || []).length === 0 && (
                    <tr>
                      <td colSpan={2}>No permissions assigned.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isCreate || isEdit) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Role & Access' : 'Input Role Baru & Access'}</div>
            <div style={{ color: '#64748b' }}>Role, menu, dan permission disimpan dari satu form.</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/roles')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 980 }}>
            {!canCreate && isCreate && <div className="alert">Tidak ada izin membuat role.</div>}
            {!canUpdate && isEdit && <div className="alert">Tidak ada izin mengubah role.</div>}

            <div className="grid" style={{ gap: 10 }}>
              <div>
                <label>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  disabled={isEdit}
                  placeholder={isEdit ? 'Name role tidak dapat diubah' : 'Masukkan name role'}
                />
                {isEdit && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Name role tidak bisa diubah setelah dibuat.</div>}
              </div>
              <div>
                <label>Display Name</label>
                <input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
              </div>
              <div>
                <label>Description</label>
                <input value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>

              {(canAssignMenus || canAssignPerms) && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                    Akses akan disimpan bersamaan saat klik tombol {isEdit ? 'Update Role' : 'Create Role'}.
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: canAssignMenus && canAssignPerms ? '1fr 1fr' : '1fr', gap: 10 }}>
                    {canAssignMenus && (
                      <div className="card" style={{ background: '#f8fafc' }}>
                        <h4>Assign Menus</h4>
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                          Gunakan checkbox untuk memilih menu akses role.
                        </div>
                        <div className="perm-table" style={{ marginTop: 8 }}>
                          <div className="perm-row perm-head">
                            <div>Menu</div>
                            <div>Path</div>
                            <div className="perm-cell">Allow</div>
                          </div>
                          {assignableMenus.map((menu) => {
                            const checked = menuDraft.includes(menu.id)
                            return (
                              <div key={menu.id} className="perm-row">
                                <div className="perm-title">{menu.display_name || menu.name}</div>
                                <div className="perm-meta">{menu.path || '-'}</div>
                                <div className="perm-cell">
                                  <input
                                    type="checkbox"
                                    className="perm-checkbox"
                                    checked={checked}
                                    onChange={() => toggleMenuDraft(menu.id)}
                                    disabled={loading}
                                    title={menu.display_name || menu.name}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {assignableMenus.length === 0 && <div className="muted" style={{ marginTop: 8 }}>Menu belum tersedia.</div>}
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                          {menuDraft.length} menu dipilih.
                        </div>
                      </div>
                    )}

                    {canAssignPerms && (
                      <div className="card" style={{ background: '#f8fafc' }}>
                        <h4>Assign Permissions</h4>
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                          Permission otomatis difilter berdasarkan menu yang dipilih.
                        </div>
                        {renderPermissionTable()}
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                          {permDraft.length} permission dipilih.
                        </div>
                      </div>
                    )}
                  </div>
                  {!canAssignPerms && !canAssignMenus && (
                    <div className="alert" style={{ marginTop: 8 }}>
                      Tidak ada izin assign permission/menu.
                    </div>
                  )}
                </div>
              )}

              {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => void saveRole()} disabled={loading}>
                  {loading ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
                </button>
                <button className="btn-ghost" onClick={() => navigate('/roles')}>Batal</button>
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Roles & Access</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/roles/create')}>Input Role</button>}
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search Role</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari name/display name" />
          </div>

          <h3>Daftar Role</h3>
          {!canList && <div className="alert">Tidak ada izin melihat role.</div>}
          {canList && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Display Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((roleItem) => (
                    <tr key={roleItem.id}>
                      <td>{roleItem.name}</td>
                      <td>{roleItem.display_name}</td>
                      <td className="action-cell">
                        <ActionMenu
                          items={[
                            {
                              key: 'view',
                              label: 'View',
                              onClick: () => navigate(`/roles/${roleItem.id}`, { state: { role: roleItem } }),
                            },
                            {
                              key: 'edit',
                              label: 'Edit',
                              onClick: () => navigate(`/roles/${roleItem.id}/edit`, { state: { role: roleItem } }),
                              hidden: !canUpdate,
                            },
                            {
                              key: 'delete',
                              label: 'Delete',
                              onClick: () => void remove(roleItem.id),
                              hidden: !canDelete,
                              danger: true,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                  {roles.length === 0 && (
                    <tr>
                      <td colSpan={3}>Belum ada role.</td>
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

function DetailTable({ rows }: { rows: Array<{ label: string; value: any }> }) {
  return (
    <table className="table" style={{ marginTop: 8 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: '35%', textTransform: 'none', letterSpacing: 'normal' }}>{row.label}</th>
            <td style={{ fontWeight: 600 }}>{row.value || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
