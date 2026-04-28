type RoleDetailProps = {
  canUpdate: boolean
  loading: boolean
  navigate: (path: string, options?: any) => void
  permissionLabel: (id: string) => string
  permissionMeta: (id: string) => { action: string; label: string; resource: string }
  roleDetail: any
  selectedId: string
  selectedRole: any
}

export default function RoleDetail({
  canUpdate,
  loading,
  navigate,
  permissionLabel,
  permissionMeta,
  roleDetail,
  selectedId,
  selectedRole,
}: RoleDetailProps) {
  const resolvedRole = roleDetail || selectedRole || null
  const permissionIds = roleDetail?.permission_ids || []
  const isSystemRole = Boolean(roleDetail?.is_system || selectedRole?.is_system)
  const formatPermissionValue = (value: string) => String(value || '').replace(/_/g, ' ') || '-'
  const permissionGroups = permissionIds.reduce(
    (groups: Array<{ items: Array<{ action: string; id: string; label: string }>; resource: string }>, id: string) => {
      const meta = permissionMeta(id)
      const resource = meta.resource || 'other'
      const group = groups.find((item) => item.resource === resource)
      const permissionItem = {
        action: meta.action,
        id,
        label: permissionLabel(id),
      }

      if (group) {
        group.items.push(permissionItem)
      } else {
        groups.push({ resource, items: [permissionItem] })
      }

      return groups
    },
    [],
  )

  return (
    <div className="role-shell">
      <div className="header role-header">
        <div className="role-heading">
          <div className="role-eyebrow">Access Control</div>
          <div className="role-title">Role Details</div>
          <div className="role-subtitle">Review role identity and assigned permission coverage.</div>
        </div>
        <div className="role-actions">
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/roles/${selectedId}/edit`, { state: { role: selectedRole } })}>
              Edit Role
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/roles')}>Back to Roles</button>
        </div>
      </div>

      <div className="page role-page">
        {loading && !resolvedRole && <div className="card role-card role-loading-state">Loading role details...</div>}
        {!loading && !resolvedRole && <div className="alert">Role not found.</div>}

        {resolvedRole && (
          <>
            <div className="role-detail-grid">
              <div className="card role-card">
                <div className="role-section-head">
                  <div>
                    <h3>Role Information</h3>
                    <span>Identity and role type.</span>
                  </div>
                </div>
                <div className="role-info-grid">
                  <div className="role-info-item">
                    <div className="role-info-label">Name</div>
                    <div className="role-info-value">{resolvedRole.name || '-'}</div>
                  </div>
                  <div className="role-info-item">
                    <div className="role-info-label">Display Name</div>
                    <div className="role-info-value">{resolvedRole.display_name || '-'}</div>
                  </div>
                  <div className="role-info-item">
                    <div className="role-info-label">Type</div>
                    <div className="role-info-value">{isSystemRole ? 'System role' : 'Custom role'}</div>
                  </div>
                  <div className="role-info-item">
                    <div className="role-info-label">Description</div>
                    <div className="role-info-value">{resolvedRole.description || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card role-card">
              <div className="role-section-head">
                <div>
                  <h3>Permissions</h3>
                  <span>{permissionIds.length} assigned</span>
                </div>
              </div>
              {permissionGroups.length > 0 ? (
                <div className="role-permission-group-list">
                  {permissionGroups.map((group) => (
                    <section key={group.resource} className="role-permission-detail-group">
                      <div className="role-permission-detail-group-head">
                        <div>
                          <div className="role-permission-detail-kicker">Resource</div>
                          <div className="role-permission-detail-resource">{formatPermissionValue(group.resource)}</div>
                          <div className="role-permission-detail-count">{group.items.length} permissions</div>
                        </div>
                      </div>
                      <div className="role-permission-detail-items">
                        {group.items.map((item) => (
                          <div key={item.id} className="role-permission-detail-item">
                            <div className="role-permission-detail-name" title={item.label}>{item.label}</div>
                            <span className="role-permission-action-pill" title={formatPermissionValue(item.action)}>
                              {formatPermissionValue(item.action)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="table-empty-panel">
                  {loading ? 'Loading permissions...' : 'No permissions assigned.'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
