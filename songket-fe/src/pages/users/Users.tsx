import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  adminCreateUser,
  deleteUserById,
  listUsers,
  updateUserById,
} from '../../services/userService'
import { listRoles } from '../../services/roleService'
import { useAlert, useConfirm } from '../../components/common/ConfirmDialog'
import { usePermissions } from '../../hooks/usePermissions'
import { resolveErrorMessage } from '../../utils/errorMessage'
import { focusFirstInvalidField } from '../../utils/formFocus'
import UserForm from './components/UserForm'
import UserList from './components/UserList'
import {
  roleNames,
  validatePasswordByBackendRule,
} from './components/userHelpers'

const emptyForm = { name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'dealer' }
const userRequiredMessage = 'Please complete the required user information before saving.'
type RoleItem = { id: string; name?: string; display_name?: string }

function resolveArrayResponse(value: any) {
  if (Array.isArray(value?.data?.data)) return value.data.data
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value)) return value
  return []
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
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
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'

  const canList = hasPermission('users', 'list')
  const canCreate = hasPermission('users', 'create')
  const canUpdate = hasPermission('users', 'assign_role')
  const canDelete = hasPermission('users', 'delete')
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
  const [roleOptions, setRoleOptions] = useState<RoleItem[]>([])

  const stateUser = (location.state as any)?.user || null

  const loadUsers = async () => {
    const res = await listUsers({ page, limit, search: search || undefined })
    setUsers(res.data.data || res.data || [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || page)
  }

  useEffect(() => {
    if (canList || isEdit) {
      loadUsers().catch(() => setUsers([]))
    }
  }, [canList, isEdit, limit, page, search])

  useEffect(() => {
    listRoles({ page: 1, limit: 500 })
      .then((res: any) => setRoleOptions(resolveArrayResponse(res)))
      .catch(() => setRoleOptions([]))
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search])

  const selectedUser = useMemo(() => {
    if (!selectedId) return null
    return users.find((u) => u.id === selectedId) || (stateUser?.id === selectedId ? stateUser : null)
  }, [selectedId, stateUser, users])

  const availableRoleNames = useMemo(() => {
    const backendRoles = roleNames(roleOptions)
    if (form.role && !backendRoles.includes(form.role)) {
      return [form.role, ...backendRoles]
    }
    return backendRoles
  }, [form.role, roleOptions])
  const isPasswordConfirmationMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword

  useEffect(() => {
    if (isCreate) {
      setEditingId(null)
      setForm(emptyForm)
      setShowPassword(false)
      setShowConfirmPassword(false)
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

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    const name = String(form.name || '').trim()
    const email = String(form.email || '').trim()
    const phone = String(form.phone || '').trim()
    const role = String(form.role || '').trim()
    const trimmedPassword = String(form.password || '').trim()
    const confirmPassword = String(form.confirmPassword || '')
    const shouldValidatePassword = isCreate || Boolean(trimmedPassword || confirmPassword)

    if (name.length < 3) {
      focusFirstInvalidField('name')
      setError('Name is required and must be at least 3 characters.')
      await showAlert('Name is required and must be at least 3 characters.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      focusFirstInvalidField('email')
      setError('A valid email address is required.')
      await showAlert('A valid email address is required.')
      return
    }

    if (phone && (phone.length < 9 || phone.length > 15)) {
      focusFirstInvalidField('phone')
      setError('Phone number must be between 9 and 15 digits.')
      await showAlert('Phone number must be between 9 and 15 digits.')
      return
    }

    if (!role) {
      focusFirstInvalidField('role')
      setError('Role is required.')
      await showAlert('Role is required.')
      return
    }

    if (isCreate && !trimmedPassword) {
      const message = 'Password is required.'
      focusFirstInvalidField('password')
      setError(message)
      await showAlert(message)
      return
    }

    if (shouldValidatePassword) {
      const passwordRuleError = validatePasswordByBackendRule(trimmedPassword)
      if (passwordRuleError) {
        focusFirstInvalidField('password')
        setError(passwordRuleError)
        await showAlert(passwordRuleError)
        return
      }
    }

    if (shouldValidatePassword && !confirmPassword) {
      const message = 'Password confirmation is required.'
      focusFirstInvalidField('confirmPassword')
      setError(message)
      await showAlert(message)
      return
    }

    if (shouldValidatePassword && trimmedPassword !== confirmPassword) {
      const message = 'Passwords do not match.'
      focusFirstInvalidField('confirmPassword')
      setError(message)
      await showAlert(message)
      return
    }

    setLoading(true)
    setError('')

    try {
      const body: any = {
        name,
        email,
        phone,
        role,
      }
      if (trimmedPassword) {
        body.password = trimmedPassword
      }

      if (editingId) {
        await updateUserById(editingId, body)
      } else {
        await adminCreateUser(body)
      }
      if (canList) {
        await loadUsers().catch(() => undefined)
      }
      setForm(emptyForm)
      setShowPassword(false)
      setShowConfirmPassword(false)
      setEditingId(null)
      navigate('/users')
    } catch (err: any) {
      const message = resolveErrorMessage(err, 'Failed to save user')
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

  const set = (key: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (error === userRequiredMessage || error.includes('required') || error.includes('valid email') || error.includes('Phone number')) {
      setError('')
    }
  }

  if (isCreate || isEdit) {
    return (
      <UserForm
        availableRoleNames={availableRoleNames}
        canCreate={canCreate}
        canUpdate={canUpdate}
        error={error}
        form={form}
        isCreate={isCreate}
        isEdit={isEdit}
        isPasswordConfirmationMismatch={isPasswordConfirmationMismatch}
        loading={loading}
        navigate={navigate}
        save={save}
        set={set}
        setEditingId={setEditingId}
        setForm={setForm}
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
