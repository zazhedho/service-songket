import { EyeIcon, EyeOffIcon, PasswordRulesGuide, passwordInputWrapStyle, passwordToggleButtonStyle, roleLabel } from './userHelpers'

type UserFormProps = {
  availableRoleNames: string[]
  canCreate: boolean
  canSetUserPerm: boolean
  canUpdate: boolean
  error: string
  form: any
  groupedPermissions: any
  isCreate: boolean
  isEdit: boolean
  isPasswordConfirmationMismatch: boolean
  loading: boolean
  navigate: (path: string, options?: any) => void
  permDraft: string[]
  permLoading: boolean
  renderPermTable: (selected: string[], toggle: (id: string) => void, customGrouped?: Record<string, any[]>) => JSX.Element
  save: () => Promise<void>
  set: (key: string, value: string) => void
  setEditingId: (value: string | null) => void
  setForm: React.Dispatch<React.SetStateAction<any>>
  setPermDraft: React.Dispatch<React.SetStateAction<string[]>>
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>
  showConfirmPassword: boolean
  showPassword: boolean
}

export default function UserForm({
  availableRoleNames,
  canCreate,
  canSetUserPerm,
  canUpdate,
  error,
  form,
  groupedPermissions,
  isCreate,
  isEdit,
  isPasswordConfirmationMismatch,
  loading,
  navigate,
  permDraft,
  permLoading,
  renderPermTable,
  save,
  set,
  setEditingId,
  setForm,
  setPermDraft,
  setShowConfirmPassword,
  setShowPassword,
  showConfirmPassword,
  showPassword,
}: UserFormProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit User' : 'Create User'}</div>
          <div style={{ color: '#64748b' }}>User form separated from the user list page</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/users')}>Back to List</button>
      </div>
      <div className="page">
        <div className="card" style={{ maxWidth: 920 }}>
          {!canCreate && isCreate && <div className="alert">You do not have permission to create users.</div>}
          {!canUpdate && isEdit && <div className="alert">You do not have permission to update users.</div>}
          <div className="grid" style={{ gap: 10 }}>
            <div>
              <label>Name</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label>Password</label>
              <div style={passwordInputWrapStyle}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={passwordToggleButtonStyle}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <div style={{ marginTop: 8 }}>
                <PasswordRulesGuide password={form.password} />
              </div>
            </div>
            <div>
              <label>Password Confirmation</label>
              <div style={passwordInputWrapStyle}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  style={passwordToggleButtonStyle}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {isPasswordConfirmationMismatch && (
                <div style={{ color: '#b91c1c', fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                  Password and password confirmation do not match.
                </div>
              )}
            </div>
            <div>
              <label>Role</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                {availableRoleNames.map((roleName) => (
                  <option key={roleName} value={roleName}>
                    {roleLabel(roleName)}
                  </option>
                ))}
              </select>
            </div>

            {canSetUserPerm && (
              <div>
                <label>Permission (optional)</label>
                {permLoading && (
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                    Loading existing user permissions...
                  </div>
                )}
                {renderPermTable(
                  permDraft,
                  (id) => setPermDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
                  groupedPermissions,
                )}
              </div>
            )}

            {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={() => void save()} disabled={loading}>{loading ? 'Saving...' : 'Save User'}</button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setForm({
                    name: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: '',
                    role: 'dealer',
                  })
                  setShowPassword(false)
                  setShowConfirmPassword(false)
                  setEditingId(null)
                  navigate('/users')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
