import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  adminCreateUser,
  deleteUserById,
  listUsers,
  updateUserById,
} from '../../services/userService'
import { listRoles } from '../../services/roleService'
import { getUserPermissions, listPermissions, setUserPermissions } from '../../services/permissionService'
import ActionMenu from '../../components/common/ActionMenu'
import { useAlert, useConfirm } from '../../components/common/ConfirmDialog'
import { usePermissions } from '../../hooks/usePermissions'
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

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/users\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function UsersPage() {
  const showAlert = useAlert()
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()

  const { hasPermission } = usePermissions()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const canList = hasPermission('users', 'list')
  const canCreate = hasPermission('users', 'create')
  const canUpdate = hasPermission('users', 'assign_role')
  const canDelete = hasPermission('users', 'delete')
  const canViewUserPerm = hasPermission('users', 'view_permissions') || hasPermission('users', 'assign_permissions')
  const canSetUserPerm = hasPermission('users', 'assign_permissions')
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

  useEffect(() => {
    if (!canSetUserPerm) {
      setAllPerms([])
      return
    }

    listPermissions({ limit: 500, page: 1, order_by: 'resource', order_direction: 'asc' })
      .then((p: any) => setAllPerms(p.data.data || p.data || []))
      .catch(() => setAllPerms([]))
  }, [canSetUserPerm])

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
    return backendRoles
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

    if (!canViewUserPerm) {
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
  }, [canViewUserPerm, isDetail, selectedUser?.id, selectedUser?.permissions])

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
      await showAlert(message)
      return
    }

    const passwordRuleError = validatePasswordByBackendRule(trimmedPassword)
    if (passwordRuleError) {
      setError(passwordRuleError)
      await showAlert(passwordRuleError)
      return
    }

    if (!confirmPassword) {
      const message = 'Password confirmation is required.'
      setError(message)
      await showAlert(message)
      return
    }

    if (trimmedPassword !== confirmPassword) {
      const message = 'Password and password confirmation do not match.'
      setError(message)
      await showAlert(message)
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
      await showAlert(message)
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
        groupedPermissions={groupedAll}
        isCreate={isCreate}
        isEdit={isEdit}
        isPasswordConfirmationMismatch={isPasswordConfirmationMismatch}
        loading={loading}
        navigate={navigate}
        permDraft={permDraft}
        permLoading={permLoading}
        renderPermTable={renderPermTable}
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
