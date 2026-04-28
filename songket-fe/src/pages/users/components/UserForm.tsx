import { EyeIcon, EyeOffIcon, PasswordRulesGuide, roleLabel } from './userHelpers'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { sanitizeDigits } from '../../../utils/input'

type UserFormProps = {
  availableRoleNames: string[]
  canCreate: boolean
  canUpdate: boolean
  error: string
  form: any
  isCreate: boolean
  isEdit: boolean
  isPasswordConfirmationMismatch: boolean
  loading: boolean
  navigate: (path: string, options?: any) => void
  save: () => Promise<void>
  set: (key: string, value: string) => void
  setEditingId: (value: string | null) => void
  setForm: React.Dispatch<React.SetStateAction<any>>
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>
  showConfirmPassword: boolean
  showPassword: boolean
}

export default function UserForm({
  availableRoleNames,
  canCreate,
  canUpdate,
  error,
  form,
  isCreate,
  isEdit,
  isPasswordConfirmationMismatch,
  loading,
  navigate,
  save,
  set,
  setEditingId,
  setForm,
  setShowConfirmPassword,
  setShowPassword,
  showConfirmPassword,
  showPassword,
}: UserFormProps) {
  const roleOptions = availableRoleNames.map((roleName) => ({
    value: roleName,
    label: roleLabel(roleName),
  }))

  return (
    <div className="user-shell">
      <div className="header user-header">
        <div className="user-heading">
          <div className="user-eyebrow">Account Setup</div>
          <div className="user-title">{isEdit ? 'Edit User' : 'Create User'}</div>
          <div className="user-subtitle">Set identity, contact details, role, and password access.</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/users')}>Back to List</button>
      </div>
      <div className="page user-page">
        {!canCreate && isCreate && <div className="alert">You do not have permission to create users.</div>}
        {!canUpdate && isEdit && <div className="alert">You do not have permission to update users.</div>}

        <div className="form-layout user-form-layout">
          <div className="card form-section user-form-card">
            <div className="form-section-head">
              <div>
                <h3>Basic Info</h3>
                <div className="form-section-note">Core user identity, contact details, and assigned role.</div>
              </div>
            </div>

            <div className="form-section-grid">
              <div data-field="name">
                <label>Name</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} minLength={3} placeholder="Enter full name" required />
              </div>
              <div data-field="email">
                <label>Email</label>
                <input type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="user@example.com" required />
              </div>
              <div data-field="phone">
                <label>Phone</label>
                <input type="tel" inputMode="numeric" autoComplete="tel" minLength={9} maxLength={15} value={form.phone} onChange={(e) => set('phone', sanitizeDigits(e.target.value))} placeholder="Enter phone number" />
              </div>
              <div data-field="role">
                <label>Role</label>
                <SearchableSelect
                  value={form.role}
                  onChange={(value) => set('role', value)}
                  options={roleOptions}
                  placeholder="Select user role"
                  searchPlaceholder="Search role..."
                />
              </div>
            </div>
          </div>

          <div className="card form-section user-form-card">
            <div className="form-section-head">
              <div>
                <h3>Security</h3>
                <div className="form-section-note">Password and confirmation for the user account.</div>
              </div>
            </div>

            <div className="form-section-grid">
              <div data-field="password">
                <label>Password</label>
                <div className="user-password-wrap">
                  <input
                    className="user-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Enter password"
                    required
                  />
                  <button
                    className="user-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className="user-password-guide-wrap">
                  <PasswordRulesGuide password={form.password} />
                </div>
              </div>
              <div data-field="confirmPassword">
                <label>Password Confirmation</label>
                <div className="user-password-wrap">
                  <input
                    className="user-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Confirm password"
                    required
                  />
                  <button
                    className="user-password-toggle"
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {isPasswordConfirmationMismatch && (
                  <div className="user-password-mismatch">
                    Password and password confirmation do not match.
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <div className="alert">{error}</div>}

          <div className="card form-section user-form-card">
            <div className="form-actions-row">
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
