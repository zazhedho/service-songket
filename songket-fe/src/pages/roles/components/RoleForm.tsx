import { useEffect, useRef } from 'react'

type RoleFormProps = {
  canAssignPerms: boolean
  canCreate: boolean
  canUpdate: boolean
  error: string
  form: any
  formErrors: Record<string, string>
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
  formErrors,
  isCreate,
  isEdit,
  loading,
  navigate,
  permDraft,
  renderPermissionTable,
  saveRole,
  set,
}: RoleFormProps) {
  const nameRef = useRef<HTMLInputElement | null>(null)
  const displayNameRef = useRef<HTMLInputElement | null>(null)
  const descriptionRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const firstInvalidField = [
      ['name', nameRef.current],
      ['display_name', displayNameRef.current],
      ['description', descriptionRef.current],
    ].find(([key, element]) => Boolean(formErrors[String(key)]) && element)

    const target = firstInvalidField?.[1] as HTMLInputElement | undefined
    if (!target) return

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.focus({ preventScroll: true })
  }, [formErrors])

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
            <div className="role-form-field">
              <label>Name</label>
              <input
                ref={nameRef}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={isEdit}
                minLength={3}
                placeholder={isEdit ? 'Role name cannot be changed' : 'Enter role name'}
                required={isCreate}
                aria-invalid={Boolean(formErrors.name)}
              />
              {isEdit && <div className="role-form-help">Role name cannot be changed after creation.</div>}
              {formErrors.name && <div className="role-field-error">{formErrors.name}</div>}
            </div>
            <div className="role-form-field">
              <label>Display Name</label>
              <input
                ref={displayNameRef}
                value={form.display_name}
                onChange={(e) => set('display_name', e.target.value)}
                minLength={3}
                placeholder="Enter display name"
                required
                aria-invalid={Boolean(formErrors.display_name)}
              />
              {formErrors.display_name && <div className="role-field-error">{formErrors.display_name}</div>}
            </div>
            <div className="role-form-field">
              <label>Description</label>
              <input
                ref={descriptionRef}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                maxLength={500}
                placeholder="Enter role description"
                aria-invalid={Boolean(formErrors.description)}
              />
              {formErrors.description && <div className="role-field-error">{formErrors.description}</div>}
            </div>

            {canAssignPerms && (
              <div className="role-permission-section">
                <div className="role-permission-save-note">
                  Permissions will be saved together when you click {isEdit ? 'Update Role' : 'Create Role'}.
                </div>
                <div className="card role-permission-card">
                  <div className="role-permission-card-head">
                    <div>
                      <div className="role-permission-card-kicker">Access rules</div>
                      <h4>Assign Permissions</h4>
                      <div className="role-form-help">Choose permissions by resource group.</div>
                    </div>
                    <span className="role-permission-total">{permDraft.length} selected</span>
                  </div>
                  {renderPermissionTable()}
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
