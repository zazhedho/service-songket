import { useMemo, useState } from 'react'
import { EyeIcon, EyeOffIcon, PasswordRulesGuide, roleLabel } from './userHelpers'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { normalizeEmailInput } from '../../../utils/email'
import { sanitizeDigits } from '../../../utils/input'

type DealerOption = {
  id: string
  name?: string
  regency?: string
  province?: string
}

type UserFormProps = {
  availableRoleNames: string[]
  canAssignRole: boolean
  canCreate: boolean
  canUpdate: boolean
  dealerOptions: DealerOption[]
  error: string
  form: any
  isCreate: boolean
  isEdit: boolean
  isPasswordConfirmationMismatch: boolean
  loading: boolean
  navigate: (path: string, options?: any) => void
  save: () => Promise<void>
  set: (key: string, value: string | string[]) => void
  setEditingId: (value: string | null) => void
  setForm: React.Dispatch<React.SetStateAction<any>>
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>
  showConfirmPassword: boolean
  showPassword: boolean
}

export default function UserForm({
  availableRoleNames,
  canAssignRole,
  canCreate,
  canUpdate,
  dealerOptions,
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
  const [dealerSearch, setDealerSearch] = useState('')
  const roleOptions = availableRoleNames.map((roleName) => ({
    value: roleName,
    label: roleLabel(roleName),
  }))
  const selectedDealerIDs: string[] = Array.isArray(form.dealer_ids) ? form.dealer_ids : []
  const selectedDealerSet = useMemo(() => new Set(selectedDealerIDs), [selectedDealerIDs])
  const filteredDealerOptions = useMemo(() => {
    const needle = dealerSearch.trim().toLowerCase()
    if (!needle) return dealerOptions
    return dealerOptions.filter((dealer) => {
      const label = [dealer.name, dealer.regency, dealer.province].filter(Boolean).join(' ').toLowerCase()
      return label.includes(needle)
    })
  }, [dealerOptions, dealerSearch])

  const toggleDealer = (dealerId: string) => {
    if (!dealerId) return
    if (selectedDealerSet.has(dealerId)) {
      set('dealer_ids', selectedDealerIDs.filter((id) => id !== dealerId))
      return
    }
    set('dealer_ids', [...selectedDealerIDs, dealerId])
  }

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
                <input type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" value={form.email} onChange={(e) => set('email', normalizeEmailInput(e.target.value))} placeholder="user@example.com" required />
              </div>
              <div data-field="phone">
                <label>Phone</label>
                <input type="tel" inputMode="numeric" autoComplete="tel" minLength={9} maxLength={15} value={form.phone} onChange={(e) => set('phone', sanitizeDigits(e.target.value))} placeholder="Enter phone number" required />
              </div>
              <div data-field="role">
                <label>Role</label>
                <SearchableSelect
                  value={form.role}
                  onChange={(value) => set('role', value)}
                  options={roleOptions}
                  placeholder="Select user role"
                  searchPlaceholder="Search role..."
                  disabled={!canAssignRole}
                />
                {!canAssignRole && (
                  <div className="form-section-note user-inline-note">Role changes require assign role permission.</div>
                )}
              </div>
            </div>
          </div>

          <div className="card form-section user-form-card">
            <div className="form-section-head">
              <div>
                <h3>Security</h3>
                <div className="form-section-note">
                  {isEdit ? 'Leave password blank to keep the current password.' : 'Password and confirmation for the user account.'}
                </div>
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
                    maxLength={64}
                    placeholder={isEdit ? 'Leave blank to keep current password' : 'Enter password'}
                    required={isCreate}
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
                    maxLength={64}
                    placeholder={isEdit ? 'Confirm only if changing password' : 'Confirm password'}
                    required={isCreate}
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
                    Passwords do not match.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card form-section user-form-card">
            <div className="form-section-head">
              <div>
                <h3>Dealer Access</h3>
                <div className="form-section-note">Limit this user to selected dealer data when they do not have all-data permission.</div>
              </div>
              {selectedDealerIDs.length > 0 && (
                <button className="btn-ghost user-clear-dealers" type="button" onClick={() => set('dealer_ids', [])}>
                  Clear All
                </button>
              )}
            </div>

            <div className="user-dealer-access">
              <input
                value={dealerSearch}
                onChange={(event) => setDealerSearch(event.target.value)}
                placeholder="Search dealer by name or location"
              />
              <div className="user-dealer-meta">
                {selectedDealerIDs.length} dealer{selectedDealerIDs.length === 1 ? '' : 's'} selected
              </div>
              <div className="user-dealer-list">
                {filteredDealerOptions.length === 0 && (
                  <div className="user-dealer-empty">No dealer found.</div>
                )}
                {filteredDealerOptions.map((dealer) => {
                  const checked = selectedDealerSet.has(dealer.id)
                  const location = [dealer.regency, dealer.province].filter(Boolean).join(', ')
                  return (
                    <button
                      key={dealer.id}
                      className={`user-dealer-option${checked ? ' is-selected' : ''}`}
                      type="button"
                      onClick={() => toggleDealer(dealer.id)}
                    >
                      <span className="user-dealer-check" aria-hidden="true" />
                      <span className="user-dealer-copy">
                        <span>{dealer.name || dealer.id}</span>
                        {location && <small>{location}</small>}
                      </span>
                    </button>
                  )
                })}
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
                    dealer_ids: [],
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
