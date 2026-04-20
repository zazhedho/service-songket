import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  adminCreateUser,
  deleteUserById,
  listUsers,
  updateUserById,
} from '../../services/userService'
import { getRoleById, listRoles } from '../../services/roleService'
import { listMenus } from '../../services/menuService'
import { getUserPermissions, listPermissions, setUserPermissions } from '../../services/permissionService'
import ActionMenu from '../../components/common/ActionMenu'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuth } from '../../store'
import UserDetail from './components/UserDetail'
import UserForm from './components/UserForm'
import UserList from './components/UserList'
import {
  detailValue,
  normalizeKey,
  roleLabel,
  roleNames,
  sanitizeIdList,
  validatePasswordByBackendRule,
} from './components/userHelpers'

const emptyForm = { name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'dealer' }
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [allPerms, setAllPerms] = useState<Perm[]>([])
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

  const availableRoleNames = useMemo(() => {
    const backendRoles = roleNames(roleOptions)
    if (form.role && !backendRoles.includes(form.role)) {
      return [form.role, ...backendRoles]
    }
    if (backendRoles.length > 0) return backendRoles
    return ['superadmin', 'admin', 'main_dealer', 'dealer']
  }, [form.role, roleOptions])
  const isPasswordConfirmationMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword

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
      setShowPassword(false)
      setShowConfirmPassword(false)
      setPermDraft([])
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
          confirmPassword: '',
          role: target.role || 'dealer',
        })
        setShowPassword(false)
        setShowConfirmPassword(false)
      }
    }
  }, [isCreate, isEdit, selectedId, selectedUser])

  useEffect(() => {
    if (!canSetUserPerm) return
    if (!isEdit || !selectedUser?.id) return

    setPermLoading(true)
    getUserPermissions(selectedUser.id)
      .then((res: any) => {
        const ids = sanitizeIdList((res.data?.data || res.data || []).map((permission: any) => permission.id))
        setPermDraft(ids)
      })
      .catch(() => setPermDraft([]))
      .finally(() => setPermLoading(false))
  }, [canSetUserPerm, isEdit, selectedUser?.id])

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

  const groupedAll = useMemo(() => groupPerms(allPerms), [allPerms])

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

    const trimmedPassword = String(form.password || '').trim()
    const confirmPassword = String(form.confirmPassword || '')
    if (!trimmedPassword) {
      const message = 'Password is required.'
      setError(message)
      window.alert(message)
      return
    }

    const passwordRuleError = validatePasswordByBackendRule(trimmedPassword)
    if (passwordRuleError) {
      setError(passwordRuleError)
      window.alert(passwordRuleError)
      return
    }

    if (!confirmPassword) {
      const message = 'Password confirmation is required.'
      setError(message)
      window.alert(message)
      return
    }

    if (trimmedPassword !== confirmPassword) {
      const message = 'Password and password confirmation do not match.'
      setError(message)
      window.alert(message)
      return
    }

    setLoading(true)
    setError('')

    try {
      const body: any = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: trimmedPassword,
        role: form.role,
      }

      if (editingId) {
        await updateUserById(editingId, body)
        if (canSetUserPerm) {
          await setUserPermissions(editingId, sanitizeIdList(permDraft))
        }
      } else {
        const permissionIds = sanitizeIdList(permDraft)
        if (canSetUserPerm && permissionIds.length > 0) body.permission_ids = permissionIds
        await adminCreateUser(body)
      }
      if (canList) {
        await loadUsers().catch(() => undefined)
      }
      setForm(emptyForm)
      setShowPassword(false)
      setShowConfirmPassword(false)
      setEditingId(null)
      setPermDraft([])
      navigate('/users')
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to save user'
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

  const set = (key: keyof typeof emptyForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  if (isDetail) {
    return (
      <UserDetail
        canUpdate={canUpdate}
        detailPermLoading={detailPermLoading}
        detailPermissions={detailPermissions}
        navigate={navigate}
        selectedId={selectedId}
        selectedRoleDisplay={selectedRoleDisplay}
        selectedUser={selectedUser}
      />
    )
  }

  if (isCreate || isEdit) {
    return (
      <UserForm
        availableRoleNames={availableRoleNames}
        canCreate={canCreate}
        canSetUserPerm={canSetUserPerm}
        canUpdate={canUpdate}
        error={error}
        form={form}
        groupedPermissions={filterResourcesByTargetRole(form.role, groupedAll)}
        isCreate={isCreate}
        isEdit={isEdit}
        isPasswordConfirmationMismatch={isPasswordConfirmationMismatch}
        loading={loading}
        navigate={navigate}
        permDraft={permDraft}
        permLoading={permLoading}
        renderPermTable={renderPermTable}
        roleResourceLoading={roleResourceLoading}
        save={save}
        set={set}
        setEditingId={setEditingId}
        setForm={setForm}
        setPermDraft={setPermDraft}
        setShowConfirmPassword={setShowConfirmPassword}
        setShowPassword={setShowPassword}
        showConfirmPassword={showConfirmPassword}
        showPassword={showPassword}
      />
    )
  }

  return (
    <UserList
      canCreate={canCreate}
      canDelete={canDelete}
      canList={canList}
      canUpdate={canUpdate}
      limit={limit}
      navigate={navigate}
      onLimitChange={setLimit}
      onPageChange={setPage}
      onRemove={remove}
      page={page}
      search={search}
      setSearch={setSearch}
      totalData={totalData}
      totalPages={totalPages}
      users={users}
    />
  )
}
