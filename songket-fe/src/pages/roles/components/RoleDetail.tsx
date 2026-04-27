type RoleDetailProps = {
  canUpdate: boolean
  navigate: (path: string, options?: any) => void
  permissionLabel: (id: string) => string
  roleDetail: any
  selectedId: string
  selectedRole: any
}

export default function RoleDetail({
  canUpdate,
  navigate,
  permissionLabel,
  roleDetail,
  selectedId,
  selectedRole,
}: RoleDetailProps) {
  const resolvedRole = roleDetail || selectedRole || null
  const permissionIds = roleDetail?.permission_ids || []
  const isSystemRole = Boolean(roleDetail?.is_system || selectedRole?.is_system)
  const roleName = resolvedRole?.display_name || resolvedRole?.name || '-'
  const renderPermission = (id: string) => {
    const label = permissionLabel(id)

    return (
      <div className="table-stack-cell">
        <div className="table-stack-primary" title={label}>{label}</div>
        <div className="table-stack-secondary" title={id}>{id}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Role Details</div>
          <div style={{ color: '#64748b' }}>Role profile and assigned permission coverage.</div>
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
        {!resolvedRole && <div className="alert">Role not found.</div>}

        {resolvedRole && (
          <>
            <div className="card business-dealer-detail-hero">
              <div className="business-dealer-detail-hero-main">
                <div className="business-dealer-detail-kicker">Role</div>
                <div className="business-dealer-detail-name">{roleName}</div>
                <div className="business-dealer-detail-note">{resolvedRole.description || 'No description provided.'}</div>
              </div>
              <div className="business-dealer-detail-badges">
                <span className="business-dealer-detail-badge muted">{isSystemRole ? 'System role' : 'Custom role'}</span>
                <span className="business-dealer-detail-badge muted">{permissionIds.length} permissions</span>
              </div>
            </div>

            <div className="business-dealer-grid" style={{ padding: 0 }}>
              <div className="card business-section">
                <div className="business-section-head">
                  <h3 className="business-section-title">Role Information</h3>
                </div>
                <div className="business-dealer-detail-card">
                  <div className="business-dealer-detail-grid">
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Name</div>
                      <div className="business-dealer-detail-value">{resolvedRole.name || '-'}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Display Name</div>
                      <div className="business-dealer-detail-value">{resolvedRole.display_name || '-'}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Type</div>
                      <div className="business-dealer-detail-value">{isSystemRole ? 'System role' : 'Custom role'}</div>
                    </div>
                    <div className="business-dealer-detail-item">
                      <div className="business-dealer-detail-label">Description</div>
                      <div className="business-dealer-detail-value">{resolvedRole.description || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card business-section">
              <div className="business-section-head">
                <h3 className="business-section-title">Permissions</h3>
                <span className="business-section-side">{permissionIds.length} assigned</span>
              </div>
              <div className="business-dealer-detail-card">
                <div className="table-responsive">
                  <table className="table metric-table" style={{ minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>No</th>
                        <th>Permission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissionIds.map((id: string, index: number) => (
                        <tr key={id}>
                          <td className="table-metric-cell">
                            <span className="table-metric-pill total">{index + 1}</span>
                          </td>
                          <td>{renderPermission(id)}</td>
                        </tr>
                      ))}
                      {permissionIds.length === 0 && (
                        <tr>
                          <td colSpan={2}>
                            <div className="table-empty-panel">No permissions assigned.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
