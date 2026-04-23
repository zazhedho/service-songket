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
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Role & Permissions' : 'Create Role & Permissions'}</div>
          <div style={{ color: '#64748b' }}>Role and permissions are managed from a single form.</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/roles')}>Back to List</button>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 980 }}>
          {!canCreate && isCreate && <div className="alert">You do not have permission to create roles.</div>}
          {!canUpdate && isEdit && <div className="alert">You do not have permission to update roles.</div>}

          <div className="grid" style={{ gap: 10 }}>
            <div>
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={isEdit}
                placeholder={isEdit ? 'Role name cannot be changed' : 'Enter role name'}
              />
              {isEdit && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Role name cannot be changed after creation.</div>}
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
              <div style={{ marginTop: 8 }}>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                  Permissions will be saved together when you click {isEdit ? 'Update Role' : 'Create Role'}.
                </div>
                <div className="card" style={{ background: '#f8fafc' }}>
                  <h4>Assign Permissions</h4>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    Select the permissions to assign to this role.
                  </div>
                  {renderPermissionTable()}
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                    {permDraft.length} permissions selected.
                  </div>
                </div>
              </div>
            )}

            {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
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
