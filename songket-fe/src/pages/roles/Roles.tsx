import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  getRoleById,
  listRoles,
  updateRole,
} from '../../services/roleService'
import { listPermissions } from '../../services/permissionService'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { usePermissions } from '../../hooks/usePermissions'
import RoleDetail from './components/RoleDetail'
import RoleForm from './components/RoleForm'
import RoleList from './components/RoleList'

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

  const { hasPermission } = usePermissions()
  const canList = hasPermission('roles', 'list')
  const canCreate = hasPermission('roles', 'create')
  const canUpdate = hasPermission('roles', 'update')
  const canDelete = hasPermission('roles', 'delete')
  const canAssignPerms = hasPermission('roles', 'assign_permissions')
  const confirm = useConfirm()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const [roles, setRoles] = useState<NamedItem[]>([])
  const [perms, setPerms] = useState<NamedItem[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const [form, setForm] = useState(empty)
  const [permDraft, setPermDraft] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [roleDetail, setRoleDetail] = useState<any>(null)

  const stateRole = (location.state as any)?.role || null

  const load = async () => {
    const rolesRes = await listRoles({ page, limit, search: search || undefined })
    setRoles(rolesRes.data.data || rolesRes.data || [])
    setTotalPages(rolesRes.data.total_pages || 1)
    setTotalData(rolesRes.data.total_data || 0)
    setPage(rolesRes.data.current_page || page)
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => {
        setRoles([])
      })
    }

    listPermissions({ page: 1, limit: 500 })
      .then((res: any) => setPerms(res.data.data || res.data || []))
      .catch(() => setPerms([]))
  }, [canList, isCreate, isDetail, isEdit, isList, limit, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const selectedRole = useMemo(() => {
    if (!selectedId) return null
    return roles.find((r) => r.id === selectedId) || (stateRole?.id === selectedId ? stateRole : null)
  }, [roles, selectedId, stateRole])

  const isSystemRole = useMemo(() => {
    return Boolean(roleDetail?.is_system || selectedRole?.is_system)
  }, [roleDetail?.is_system, selectedRole?.is_system])

  const sortedPerms = useMemo(
    () => [...perms].sort((a, b) => (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')),
    [perms],
  )

  const permById = useMemo(() => {
    const mapped: Record<string, NamedItem> = {}
    perms.forEach((perm) => {
      mapped[perm.id] = perm
    })
    return mapped
  }, [perms])

  const permissionLabel = (id: string) => {
    const perm = permById[id]
    if (!perm) return 'Permission not found'
    const base = perm.display_name || perm.name || 'Permission'
    return perm.action ? `${base} (${perm.action})` : base
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

  useEffect(() => {
    if (isCreate) {
      setForm(empty)
      setRoleDetail(null)
      setPermDraft([])
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
          setForm({
            name: detail?.name || preview?.name || '',
            display_name: detail?.display_name || preview?.display_name || '',
            description: detail?.description || preview?.description || '',
          })
        })
        .catch(() => {
          setRoleDetail(null)
          setPermDraft([])
        })
        .finally(() => setLoading(false))
    }
  }, [isCreate, isDetail, isEdit, selectedId, selectedRole])

  const togglePermDraft = (id: string) => {
    setPermDraft((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const saveRole = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setError('')

    const permissionPayload = sanitizeIdList(permDraft)

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

      if (!roleId && canAssignPerms && permissionPayload.length > 0) {
        throw new Error('Role saved successfully, but the role ID was not found for access assignment.')
      }

      if (roleId && canAssignPerms && permissionPayload.length > 0) {
        await assignRolePermissions(roleId, permissionPayload)
      }

      if (canList) {
        await load().catch(() => undefined)
      }

      setForm(empty)
      setPermDraft([])
      navigate('/roles')
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to save role.'

      if (newlyCreated && roleId) {
        const partialMessage = `Role was created, but permission assignment failed: ${message}`
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
    const resources = Object.keys(groupedPerms).sort((a, b) => a.localeCompare(b))

    if (!resources.length) {
      return (
        <div style={{ color: '#64748b', fontSize: 12 }}>
          No permissions available yet.
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
              {groupedPerms[resource].map((permission) => {
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
      <RoleDetail
        canUpdate={canUpdate}
        navigate={navigate}
        permissionLabel={permissionLabel}
        roleDetail={roleDetail}
        selectedId={selectedId}
        selectedRole={selectedRole}
      />
    )
  }

  if (isCreate || isEdit) {
    return (
      <RoleForm
        canAssignPerms={canAssignPerms}
        canCreate={canCreate}
        canUpdate={canUpdate}
        error={error}
        form={form}
        groupedPerms={groupedPerms}
        isCreate={isCreate}
        isEdit={isEdit}
        loading={loading}
        navigate={navigate}
        permDraft={permDraft}
        renderPermissionTable={renderPermissionTable}
        saveRole={saveRole}
        set={set}
      />
    )
  }

  return (
    <RoleList
      canCreate={canCreate}
      canDelete={canDelete}
      canList={canList}
      canUpdate={canUpdate}
      navigate={navigate}
      page={page}
      remove={remove}
      roles={roles}
      search={search}
      setLimit={setLimit}
      setPage={setPage}
      setSearch={setSearch}
      totalData={totalData}
      totalPages={totalPages}
      limit={limit}
    />
  )
}
