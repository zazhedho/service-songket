import { FormEvent, useEffect, useMemo, useState } from 'react'
import { changeMyPassword, getMe, updateMe } from '../../services/authService'
import { normalizeEmailInput } from '../../utils/email'
import { resolveErrorMessage } from '../../utils/errorMessage'
import { focusFirstInvalidField } from '../../utils/formFocus'
import { sanitizeDigits } from '../../utils/input'

const initialProfile = {
  name: '',
  email: '',
  phone: '',
}

const initialMeta = {
  created_at: '',
  updated_at: '',
}

const initialPassword = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile)
  const [profileMeta, setProfileMeta] = useState(initialMeta)
  const [passwordForm, setPasswordForm] = useState(initialPassword)
  const [role, setRole] = useState('-')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [error, setError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const displayRole = useMemo(
    () => String(role || '-').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    [role],
  )

  const profileInitials = useMemo(() => {
    const chunks = String(profile.name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
    if (chunks.length === 0) return 'U'
    return chunks.map((chunk) => chunk.charAt(0).toUpperCase()).join('')
  }, [profile.name])

  const passwordValidationRules = useMemo(() => {
    const value = passwordForm.new_password || ''
    return [
      { label: 'At least 8 characters', valid: value.length >= 8 },
      { label: 'Maximum 64 characters', valid: value.length <= 64 },
      { label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(value) },
      { label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(value) },
      { label: 'At least 1 number (0-9)', valid: /[0-9]/.test(value) },
      { label: 'At least 1 symbol (!@#$%^&*...)', valid: /[^a-zA-Z0-9]/.test(value) },
    ]
  }, [passwordForm.new_password])

  const passwordMatch = useMemo(() => {
    if (!passwordForm.confirm_password) return null
    return passwordForm.new_password === passwordForm.confirm_password
  }, [passwordForm.confirm_password, passwordForm.new_password])

  const formatDate = (value?: string) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'
    return parsed.toLocaleString('en-GB')
  }

  const loadProfile = async () => {
    setLoadingProfile(true)
    setError('')
    try {
      const res = await getMe()
      const data = res.data?.data || res.data || {}
      setProfile({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
      })
      setProfileMeta({
        created_at: data.created_at || '',
        updated_at: data.updated_at || '',
      })
      setRole(data.role || '-')
    } catch (err: any) {
      setError(resolveErrorMessage(err, 'Failed to load profile'))
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setProfileMessage('')
    setError('')

    const trimmedName = profile.name.trim()
    const trimmedEmail = profile.email.trim()
    const trimmedPhone = profile.phone.trim()

    if (!trimmedName) {
      setError('Name is required.')
      focusFirstInvalidField('profile_name')
      return
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('A valid email address is required.')
      focusFirstInvalidField('profile_email')
      return
    }

    setSavingProfile(true)
    try {
      await updateMe({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
      })
      setProfileMessage('Profile updated successfully.')
      await loadProfile()
    } catch (err: any) {
      setError(resolveErrorMessage(err, 'Failed to update profile'))
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordMessage('')
    setError('')

    if (!passwordForm.current_password) {
      setError('Current password is required.')
      focusFirstInvalidField('current_password')
      return
    }

    if (!passwordForm.new_password) {
      setError('New password is required.')
      focusFirstInvalidField('new_password')
      return
    }

    if (!passwordForm.confirm_password) {
      setError('Password confirmation is required.')
      focusFirstInvalidField('confirm_password')
      return
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Password confirmation does not match.')
      focusFirstInvalidField('confirm_password')
      return
    }

    setSavingPassword(true)
    try {
      await changeMyPassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordMessage('Password changed successfully.')
      setPasswordForm(initialPassword)
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (err: any) {
      setError(resolveErrorMessage(err, 'Failed to change password'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="profile-shell">
      <div className="header profile-header">
        <div className="profile-heading">
          <div className="profile-eyebrow">Account Center</div>
          <div className="profile-title">My Profile</div>
          <div className="profile-subtitle">Manage your account information, contact details, and password.</div>
        </div>
        <div className="profile-header-side">
          <div className="profile-header-label">Signed in as</div>
          <div className="profile-header-role">{displayRole}</div>
        </div>
      </div>

      <div className="page profile-page">
        {error && <div className="alert">{error}</div>}

        <div className="profile-overview-grid">
          <div className="card profile-hero-card">
            <div className="profile-hero-kicker">Account Snapshot</div>
            <div className="profile-hero-banner">
              <div className="profile-avatar profile-avatar-lg">{profileInitials}</div>
              <div className="profile-hero-body">
                <div className="profile-summary-title">{profile.name || 'User'}</div>
                <div className="profile-summary-subtitle">{profile.email || '-'}</div>
                <div className="profile-hero-meta">
                  <div className="profile-hero-meta-item">
                    <i className="bi bi-shield-check"></i>
                    <span>{displayRole}</span>
                  </div>
                  <div className="profile-hero-meta-item">
                    <i className="bi bi-telephone"></i>
                    <span>{profile.phone || 'Phone not set'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="profile-hero-footer">
              <div>
                <span className="profile-hero-footer-label">Access</span>
                <span className="profile-hero-footer-value">Active</span>
              </div>
              <div>
                <span className="profile-hero-footer-label">Updated</span>
                <span className="profile-hero-footer-value">{formatDate(profileMeta.updated_at)}</span>
              </div>
            </div>
          </div>

          <div className="card profile-account-card profile-account-card-compact">
            <div className="profile-section-head">
              <div>
                <h3>Account Details</h3>
                <div className="profile-help">Current identity and account activity.</div>
              </div>
            </div>
            <div className="profile-account-grid">
              <div className="profile-info-item">
                <span className="profile-info-icon"><i className="bi bi-person"></i></span>
                <div className="profile-info-content">
                  <div className="profile-info-label">Name</div>
                  <div className="profile-info-value">{profile.name || '-'}</div>
                </div>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-icon"><i className="bi bi-envelope"></i></span>
                <div className="profile-info-content">
                  <div className="profile-info-label">Email</div>
                  <div className="profile-info-value">{profile.email || '-'}</div>
                </div>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-icon"><i className="bi bi-telephone"></i></span>
                <div className="profile-info-content">
                  <div className="profile-info-label">Phone</div>
                  <div className="profile-info-value">{profile.phone || '-'}</div>
                </div>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-icon"><i className="bi bi-clock-history"></i></span>
                <div className="profile-info-content">
                  <div className="profile-info-label">Created At</div>
                  <div className="profile-info-value">{formatDate(profileMeta.created_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-layout">
          <div className="card profile-edit-card">
            <div className="profile-section-head">
              <div>
                <h3>Update Profile</h3>
                <div className="profile-help">Update your basic account identity used across the application.</div>
              </div>
            </div>

            {loadingProfile && <div style={{ marginTop: 8, color: '#64748b' }}>Loading profile...</div>}
            {!loadingProfile && (
              <form onSubmit={saveProfile} className="profile-form-grid" noValidate>
                <div data-field="profile_name">
                  <label>Name</label>
                  <input
                    value={profile.name}
                    onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div data-field="profile_email">
                  <label>Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={profile.email}
                    onChange={(event) => setProfile((prev) => ({ ...prev, email: normalizeEmailInput(event.target.value) }))}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div data-field="profile_phone">
                  <label>Phone</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={20}
                    value={profile.phone}
                    onChange={(event) => setProfile((prev) => ({ ...prev, phone: sanitizeDigits(event.target.value) }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="profile-form-actions">
                  <button className="btn" type="submit" disabled={savingProfile}>
                    <i className="bi bi-check-circle"></i>
                    <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
                {profileMessage && <div className="profile-success">{profileMessage}</div>}
              </form>
            )}
          </div>

          <div className="card profile-password-card">
            <div className="profile-section-head">
              <div>
                <h3>Change Password</h3>
                <div className="profile-help">Use a strong password with uppercase, lowercase, number, and symbol.</div>
              </div>
            </div>

            {passwordForm.new_password && (
              <div className="profile-password-rules">
                <div className="profile-password-rules-title">Password Requirements:</div>
                {passwordValidationRules.map((rule) => (
                  <div key={rule.label} className={`profile-password-rule ${rule.valid ? 'valid' : 'invalid'}`}>
                    <span className="profile-password-rule-icon" aria-hidden="true">
                      {rule.valid ? '✓' : '×'}
                    </span>
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={savePassword} className="profile-form-grid" style={{ marginTop: 12 }} noValidate>
              <div data-field="current_password">
                <label>Current Password</label>
                <div className="password-input-wrap">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={passwordForm.current_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    <i className={`bi bi-eye${showCurrentPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>
              <div data-field="new_password">
                <label>New Password</label>
                <div className="password-input-wrap">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    <i className={`bi bi-eye${showNewPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>
              <div data-field="confirm_password">
                <label>Confirm New Password</label>
                <div className="password-input-wrap">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordForm.confirm_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <i className={`bi bi-eye${showConfirmPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
                {passwordMatch === false && <div className="profile-inline-error">Passwords do not match.</div>}
                {passwordMatch === true && <div className="profile-inline-success">Passwords match.</div>}
              </div>
              <div className="profile-form-actions">
                <button className="btn" type="submit" disabled={savingPassword}>
                  <i className="bi bi-shield-check"></i>
                  <span>{savingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
              {passwordMessage && <div className="profile-success">{passwordMessage}</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
