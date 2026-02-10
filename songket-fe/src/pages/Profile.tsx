import { FormEvent, useEffect, useMemo, useState } from 'react'
import { changeMyPassword, getMe, updateMe } from '../api'

const initialProfile = {
  name: '',
  email: '',
  phone: '',
}

const initialPassword = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile)
  const [passwordForm, setPasswordForm] = useState(initialPassword)
  const [role, setRole] = useState('-')
  const [permissions, setPermissions] = useState<string[]>([])
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [error, setError] = useState('')

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
  const permissionPreview = permissions.slice(0, 6)

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
      setRole(data.role || '-')
      setPermissions(Array.isArray(data.permissions) ? data.permissions.map((item: any) => String(item)).filter(Boolean) : [])
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load profile')
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setSavingProfile(true)
    setProfileMessage('')
    setError('')

    try {
      await updateMe({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      })
      setProfileMessage('Profile updated successfully.')
      await loadProfile()
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordMessage('')
    setError('')

    if (!passwordForm.current_password || !passwordForm.new_password) {
      setError('Current and new password are required.')
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Password confirmation does not match.')
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
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Profile</div>
          <div style={{ color: '#64748b' }}>Manage your account information and password.</div>
        </div>
      </div>

      <div className="page profile-page">
        {error && <div className="alert">{error}</div>}

        <div className="profile-layout">
          <div className="card profile-summary-card">
            <div className="profile-summary-banner">
              <div className="profile-avatar">{profileInitials}</div>
              <div>
                <div className="profile-summary-title">{profile.name || 'User'}</div>
                <div className="profile-summary-subtitle">{profile.email || '-'}</div>
              </div>
            </div>

            <div className="profile-badges">
              <div className="profile-badge">Role: {displayRole}</div>
              <div className="profile-badge">Permissions: {permissions.length}</div>
            </div>

            <table className="table profile-summary-table">
              <tbody>
                <tr>
                  <th>Name</th>
                  <td>{profile.name || '-'}</td>
                </tr>
                <tr>
                  <th>Email</th>
                  <td>{profile.email || '-'}</td>
                </tr>
                <tr>
                  <th>Phone</th>
                  <td>{profile.phone || '-'}</td>
                </tr>
                <tr>
                  <th>Role</th>
                  <td>{displayRole}</td>
                </tr>
                <tr>
                  <th>Permission Preview</th>
                  <td>{permissionPreview.length > 0 ? permissionPreview.join(', ') : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card profile-edit-card">
            <h3>Edit Profile Information</h3>
            <div className="profile-help">Update your basic account identity used across the application.</div>

            {loadingProfile && <div style={{ marginTop: 8, color: '#64748b' }}>Loading profile...</div>}
            {!loadingProfile && (
              <form onSubmit={saveProfile} className="profile-form-grid">
                <div>
                  <label>Name</label>
                  <input
                    value={profile.name}
                    onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>Phone</label>
                  <input
                    value={profile.phone}
                    onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <button className="btn" type="submit" disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
                {profileMessage && <div className="profile-success">{profileMessage}</div>}
              </form>
            )}
          </div>
        </div>

        <div className="card profile-password-card">
          <h3>Change Password</h3>
          <div className="profile-help">Use a strong password with uppercase, lowercase, number, and symbol.</div>
          <form onSubmit={savePassword} className="profile-form-grid" style={{ marginTop: 12 }}>
            <div>
              <label>Current Password</label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))}
                required
              />
            </div>
            <div>
              <label>New Password</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                required
              />
            </div>
            <div>
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                required
              />
            </div>
            <div>
              <button className="btn" type="submit" disabled={savingPassword}>
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
            {passwordMessage && <div className="profile-success">{passwordMessage}</div>}
          </form>
        </div>
      </div>
    </div>
  )
}
