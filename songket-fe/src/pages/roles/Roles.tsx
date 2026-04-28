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
import { resolveErrorMessage } from '../../utils/errorMessage'
import RoleDetail from './components/RoleDetail'
import RoleForm from './components/RoleForm'
import RoleList from './components/RoleList'

const empty = { name: '', display_name: '', description: '' }
const emptyFormErrors = { name: '', display_name: '', description: '' }

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
  const [formErrors, setFormErrors] = useState(emptyFormErrors)
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
    if (!canList || !isList) return

    load().catch(() => {
      setRoles([])
    })
  }, [canList, isList, limit, page, search])

  useEffect(() => {
    if (!(canAssignPerms || isDetail || isEdit || isCreate)) return

    listPermissions({ page: 1, limit: 500 })
      .then((res: any) => setPerms(res.data.data || res.data || []))
      .catch(() => setPerms([]))
  }, [canAssignPerms, isCreate, isDetail, isEdit])

  useEffect(() => {
    setPage(1)
  }, [search])

  const activeRoleDetail = useMemo(() => {
    if (!selectedId || String(roleDetail?.id || '') !== selectedId) return null
    return roleDetail
  }, [roleDetail, selectedId])

  const selectedRole = useMemo(() => {
    if (!selectedId) return null
    return roles.find((r) => r.id === selectedId) || (stateRole?.id === selectedId ? stateRole : null) || activeRoleDetail
  }, [activeRoleDetail, roles, selectedId, stateRole])

  const isSystemRole = useMemo(() => {
    return Boolean(activeRoleDetail?.is_system || selectedRole?.is_system)
  }, [activeRoleDetail?.is_system, selectedRole?.is_system])

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
    if (!perm) return 'Permission data unavailable'
    return perm.display_name || perm.name || 'Permission'
  }

  const permissionMeta = (id: string) => {
    const perm = permById[id]

    return {
      action: perm?.action || '',
      label: perm?.display_name || perm?.name || 'Permission data unavailable',
      resource: perm?.resource || '',
    }
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

  const allPermissionIds = useMemo(() => sanitizeIdList(sortedPerms.map((perm) => perm.id)), [sortedPerms])

  useEffect(() => {
    if (isCreate) {
      setForm(empty)
      setFormErrors(emptyFormErrors)
      setError('')
      setRoleDetail(null)
      setPermDraft([])
      return
    }

    if (selectedId && (isEdit || isDetail)) {
      let isActive = true
      const preview = roles.find((r) => r.id === selectedId) || (stateRole?.id === selectedId ? stateRole : null)

      setRoleDetail(null)
      setPermDraft([])

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
          if (!isActive) return
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
          if (!isActive) return
          setRoleDetail(null)
          setPermDraft([])
        })
        .finally(() => {
          if (isActive) setLoading(false)
        })

      return () => {
        isActive = false
      }
    }
  }, [isCreate, isDetail, isEdit, roles, selectedId, stateRole])

  const togglePermDraft = (id: string) => {
    setPermDraft((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const selectAllPermissions = () => {
    setPermDraft(allPermissionIds)
  }

  const clearAllPermissions = () => {
    setPermDraft([])
  }

  const setResourcePermissions = (resource: string, shouldSelect: boolean) => {
    const resourceIds = sanitizeIdList((groupedPerms[resource] || []).map((permission) => permission.id))
    setPermDraft((prev) => {
      const current = new Set(prev)
      resourceIds.forEach((id) => {
        if (shouldSelect) {
          current.add(id)
        } else {
          current.delete(id)
        }
      })
      return Array.from(current)
    })
  }

  const saveRole = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    const trimmedForm = {
      name: String(form.name || '').trim(),
      display_name: String(form.display_name || '').trim(),
      description: String(form.description || '').trim(),
    }
    const nextErrors = { ...emptyFormErrors }

    if (isCreate && trimmedForm.name.length < 3) {
      nextErrors.name = 'Name is required and must be at least 3 characters.'
    }
    if (trimmedForm.display_name.length < 3) {
      nextErrors.display_name = 'Display Name is required and must be at least 3 characters.'
    }
    if (trimmedForm.description.length > 500) {
      nextErrors.description = 'Description must be 500 characters or less.'
    }

    if (nextErrors.name || nextErrors.display_name || nextErrors.description) {
      setFormErrors(nextErrors)
      setError('Please complete the required role information before saving.')
      return
    }

    setLoading(true)
    setError('')
    setFormErrors(emptyFormErrors)

    const permissionPayload = sanitizeIdList(permDraft)

    let roleId = selectedId
    let newlyCreated = false

    try {
      if (isEdit && selectedId) {
        if (!isSystemRole) {
          await updateRole(selectedId, {
            display_name: trimmedForm.display_name,
            description: trimmedForm.description,
          })
        }
        roleId = selectedId
      } else {
        const created = await createRole({
          name: trimmedForm.name,
          display_name: trimmedForm.display_name,
          description: trimmedForm.description,
        })
        roleId = String(created?.data?.data?.id || created?.data?.id || '')
        newlyCreated = true
      }

      if (!roleId && canAssignPerms) {
        throw new Error('Role saved successfully, but the role ID was not found for access assignment.')
      }

      if (roleId && canAssignPerms) {
        await assignRolePermissions(roleId, permissionPayload)
      }

      if (canList) {
        await load().catch(() => undefined)
      }

      setForm(empty)
      setPermDraft([])
      navigate('/roles')
    } catch (err: any) {
      const message = resolveErrorMessage(err, 'Failed to save role.')

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
        <div className="role-permission-empty">
          No permissions available yet.
        </div>
      )
    }

    const allSelected = allPermissionIds.length > 0 && allPermissionIds.every((id) => permDraft.includes(id))

    return (
      <>
        <div className="role-permission-toolbar">
          <div className="role-permission-toolbar-copy">
            <div className="role-permission-toolbar-title">Bulk selection</div>
            <div className="role-permission-toolbar-note">Select everything or clear all before adjusting each resource.</div>
          </div>
          <div className="role-permission-toolbar-actions">
            <button
              type="button"
              className="btn-ghost role-permission-bulk-btn"
              onClick={allSelected ? clearAllPermissions : selectAllPermissions}
              disabled={loading || allPermissionIds.length === 0}
            >
              {allSelected ? 'Uncheck All' : 'Check All'}
            </button>
          </div>
        </div>
        <div className="role-permission-groups">
          {resources.map((resource) => (
            <section key={resource} className="role-permission-group">
              {(() => {
                const resourcePermissions = groupedPerms[resource]
                const resourceIds = resourcePermissions.map((permission) => permission.id)
                const selectedCount = resourceIds.filter((id) => permDraft.includes(id)).length
                const isResourceSelected = resourceIds.length > 0 && selectedCount === resourceIds.length

                return (
                  <>
                    <div className="role-permission-group-head">
                      <div>
                        <div className="role-permission-group-kicker">Resource</div>
                        <div className="perm-resource">{resource.replace(/_/g, ' ')}</div>
                      </div>
                      <div className="role-permission-group-actions">
                        <span className="role-permission-group-count">{selectedCount}/{resourcePermissions.length}</span>
                        <button
                          type="button"
                          className="role-permission-resource-btn"
                          onClick={() => setResourcePermissions(resource, !isResourceSelected)}
                          disabled={loading}
                        >
                          {isResourceSelected ? 'Uncheck Resource' : 'Check Resource'}
                        </button>
                      </div>
                    </div>
                    <div className="role-permission-option-list">
                      {resourcePermissions.map((permission) => {
                        const checked = permDraft.includes(permission.id)
                        return (
                          <label key={permission.id} className={`role-permission-option ${checked ? 'selected' : ''}`}>
                            <div className="role-permission-option-copy">
                              <div className="perm-title">{permission.display_name || permission.name}</div>
                              <div className="perm-meta">{permission.action || '-'}</div>
                            </div>
                            <div className="role-permission-option-control">
                              <input
                                type="checkbox"
                                className="perm-checkbox"
                                checked={checked}
                                onChange={() => togglePermDraft(permission.id)}
                                disabled={loading}
                                title={permission.display_name || permission.name}
                              />
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </section>
          ))}
        </div>
      </>
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

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setFormErrors((prev) => ({ ...prev, [k]: '' }))
    if (error === 'Please complete the required role information before saving.') {
      setError('')
    }
  }

  if (isDetail) {
    return (
      <RoleDetail
        canUpdate={canUpdate}
        loading={loading}
        navigate={navigate}
        permissionLabel={permissionLabel}
        permissionMeta={permissionMeta}
        roleDetail={activeRoleDetail}
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
        formErrors={formErrors}
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
