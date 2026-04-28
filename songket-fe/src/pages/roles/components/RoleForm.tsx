type RoleFormProps = {
  canAssignPerms: boolean
  canCreate: boolean
  canUpdate: boolean
  error: string
  form: any
  groupedPerms: Record<string, any[]>
  isCreate: boolean
  isEdit: boolean
  loading: boolean
  navigate: (path: string) => void
  permDraft: string[]
  renderPermissionTable: () => React.ReactNode
  saveRole: () => Promise<void>
  set: (k: string, v: string) => void
}

export default function RoleForm({
  canAssignPerms,
  canCreate,
  canUpdate,
  error,
  form,
  isCreate,
  isEdit,
  loading,
  navigate,
  permDraft,
  renderPermissionTable,
  saveRole,
  set,
}: RoleFormProps) {
  return (
    <div className="role-shell">
      <div className="header role-header">
        <div className="role-heading">
          <div className="role-eyebrow">Role Setup</div>
          <div className="role-title">{isEdit ? 'Edit Role & Permissions' : 'Create Role & Permissions'}</div>
          <div className="role-subtitle">Role identity and permission access are managed in one place.</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/roles')}>Back to List</button>
      </div>

      <div className="page role-page">
        <div className="card role-form-card">
          {!canCreate && isCreate && <div className="alert">You do not have permission to create roles.</div>}
          {!canUpdate && isEdit && <div className="alert">You do not have permission to update roles.</div>}

          <div className="grid role-form-grid">
            <div>
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={isEdit}
                placeholder={isEdit ? 'Role name cannot be changed' : 'Enter role name'}
              />
              {isEdit && <div className="role-form-help">Role name cannot be changed after creation.</div>}
            </div>
            <div>
              <label>Display Name</label>
              <input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="Enter display name" />
            </div>
            <div>
              <label>Description</label>
              <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Enter role description" />
            </div>

            {canAssignPerms && (
              <div className="role-permission-section">
                <div className="role-form-help">
                  Permissions will be saved together when you click {isEdit ? 'Update Role' : 'Create Role'}.
                </div>
                <div className="card role-permission-card">
                  <h4>Assign Permissions</h4>
                  <div className="role-form-help">Select the permissions to assign to this role.</div>
                  {renderPermissionTable()}
                  <div className="role-permission-count">{permDraft.length} permissions selected.</div>
                </div>
              </div>
            )}

            {error && <div className="role-form-error">{error}</div>}

            <div className="role-form-actions">
              <button className="btn" onClick={() => void saveRole()} disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/roles')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
