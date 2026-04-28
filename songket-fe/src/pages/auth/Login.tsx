import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, login, register } from '../../services/authService'
import { getMyPermissions } from '../../services/permissionService'
import { useAuth } from '../../store'
import { focusFirstInvalidField } from '../../utils/formFocus'
import { sanitizeDigits } from '../../utils/input'

function validatePasswordByBackendRule(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters long.'
  if (password.length > 64) return 'Password must be at most 64 characters long.'
  if (!/[a-z]/.test(password)) return 'Password must include at least 1 lowercase letter (a-z).'
  if (!/[A-Z]/.test(password)) return 'Password must include at least 1 uppercase letter (A-Z).'
  if (!/[0-9]/.test(password)) return 'Password must include at least 1 number (0-9).'
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must include at least 1 symbol (!@#$%^&*...).'
  return ''
}

function getPasswordRuleChecks(password: string) {
  return [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Maximum 64 characters', valid: password.length <= 64 },
    { label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'At least 1 number (0-9)', valid: /[0-9]/.test(password) },
    { label: 'At least 1 symbol (!@#$%^&*...)', valid: /[^a-zA-Z0-9]/.test(password) },
  ]
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const setToken = useAuth((s) => s.setToken)
  const setRoleStore = useAuth((s) => s.setRole)
  const setPermissions = useAuth((s) => s.setPermissions)
  const isRegisterPasswordMismatch = isRegister && confirmPassword.length > 0 && password !== confirmPassword

  const switchMode = (nextRegisterMode: boolean) => {
    setIsRegister(nextRegisterMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    if (isRegister && !trimmedName) {
      setError('Name is required.')
      focusFirstInvalidField('name')
      return
    }

    if (isRegister && !trimmedPhone) {
      setError('Phone number is required.')
      focusFirstInvalidField('phone')
      return
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('A valid email address is required.')
      focusFirstInvalidField('email')
      return
    }

    if (!password) {
      setError('Password is required.')
      focusFirstInvalidField('password')
      return
    }

    try {
      setLoading(true)
      if (isRegister) {
        const passwordRuleError = validatePasswordByBackendRule(password)
        if (passwordRuleError) {
          setError(passwordRuleError)
          focusFirstInvalidField('password')
          return
        }

        if (!confirmPassword) {
          setError('Password confirmation is required.')
          focusFirstInvalidField('confirm_password')
          return
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          focusFirstInvalidField('confirm_password')
          return
        }

        await register({ name: trimmedName, email: trimmedEmail, phone: trimmedPhone, password })
        setIsRegister(false)
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        setShowConfirmPassword(false)
      } else {
        const { data } = await login(trimmedEmail, password)
        const token = data?.data?.token || data?.token || data?.data
        setToken(token)

        try {
          const [me, permissionsRes] = await Promise.all([getMe(), getMyPermissions()])
          const backendRole = me.data?.data?.role || me.data?.role
          if (backendRole) setRoleStore(backendRole)

          const nextPermissions = (permissionsRes.data?.data || permissionsRes.data || [])
            .map((permission: any) => String(permission?.name || '').trim())
            .filter(Boolean)
          setPermissions(nextPermissions)
        } catch {
          setRoleStore('')
          setPermissions([])
        }

        navigate('/dashboard')
      }
    } catch (err: any) {
      const rawError = err?.response?.data?.error
      const message =
        (typeof rawError === 'string' && rawError.trim()) ||
        (rawError && typeof rawError === 'object' && typeof rawError.message === 'string' && rawError.message.trim()) ||
        (typeof err?.response?.data?.message === 'string' && err.response.data.message.trim()) ||
        'Failed to process authentication'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`auth-shell${isRegister ? ' auth-shell-register' : ''}`}>
      <section className="auth-hero" aria-label="Songket overview">
        <div className="auth-hero-inner">
          <div className="auth-eyebrow">Operational Intelligence</div>
          <h1 className="auth-hero-title">Songket Business Console</h1>
          <div className="auth-hero-copy">
            Monitor order-in movement, finance decisions, and dealer performance from one focused workspace.
          </div>

          <div className="auth-feature-grid">
            <div className="auth-feature-card">
              <div className="auth-feature-kicker">Dashboard</div>
              <div className="auth-feature-title">Daily Order In Trend</div>
              <div className="auth-feature-copy">Track daily order movement across dealer coverage and active periods.</div>
            </div>
            <div className="auth-feature-card">
              <div className="auth-feature-kicker">Finance</div>
              <div className="auth-feature-title">Approve vs Reject</div>
              <div className="auth-feature-copy">Review finance outcomes with company, dealer, and status context.</div>
            </div>
            <div className="auth-feature-card">
              <div className="auth-feature-kicker">Analysis</div>
              <div className="auth-feature-title">YTD Summary</div>
              <div className="auth-feature-copy">Compare current performance against previous matching periods.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel" aria-label={isRegister ? 'Register form' : 'Login form'}>
        <div className="auth-card">
          <div className="auth-brand">
            <img src="/songket-logo.jpeg" alt="SONGKET Logo" className="auth-logo" />
            <div>
              <div className="auth-brand-name">S.O.N.G.K.E.T</div>
              <div className="auth-brand-subtitle">Business access portal</div>
            </div>
          </div>

          <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={`auth-mode-button${!isRegister ? ' active' : ''}`}
              onClick={() => switchMode(false)}
              aria-pressed={!isRegister}
            >
              Log in
            </button>
            <button
              type="button"
              className={`auth-mode-button${isRegister ? ' active' : ''}`}
              onClick={() => switchMode(true)}
              aria-pressed={isRegister}
            >
              Register
            </button>
          </div>

          <div className="auth-heading">
            <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
            <p>
              {isRegister
                ? 'Set up your access using a secure password.'
                : 'Sign in to continue managing Songket operations.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {isRegister && (
              <div className="auth-register-grid">
                <div data-field="name">
                  <input className="auth-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div data-field="phone">
                  <input
                    className="auth-input"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={20}
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(sanitizeDigits(e.target.value))}
                    required
                  />
                </div>
              </div>
            )}

            <div data-field="email">
              <input
                className="auth-input"
                placeholder="Email"
                type="email"
                autoComplete={isRegister ? 'email' : 'username'}
                autoCapitalize="none"
                autoCorrect="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-password-wrap" data-field="password">
              <input
                className="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {isRegister && <PasswordRulesGuide password={password} />}

            {isRegister && (
              <div className="auth-password-wrap" data-field="confirm_password">
                <input
                  className="auth-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  placeholder="Password confirmation"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            )}

            {isRegisterPasswordMismatch && <div className="auth-inline-error">Passwords do not match.</div>}

            {error && <div className="auth-alert">{error}</div>}

            <button type="submit" disabled={loading} className="auth-submit-button">
              {loading ? 'Loading...' : isRegister ? 'Create Account' : 'Log In'}
            </button>
          </form>

          <div className="auth-helper">
            {isRegister
              ? 'Already have access? Switch to Log in above.'
              : 'Need a new account? Switch to Register above.'}
          </div>
        </div>
      </section>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10.6 6.2A11.6 11.6 0 0 1 12 6c6.5 0 10 6 10 6a18.8 18.8 0 0 1-3.1 3.7M6.1 9.1A18.4 18.4 0 0 0 2 12s3.5 6 10 6c1.2 0 2.3-.2 3.3-.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function PasswordRulesGuide({ password }: { password: string }) {
  if (!password) return null
  const checks = getPasswordRuleChecks(password)
  return (
    <div className="profile-password-rules">
      <div className="profile-password-rules-title">Password Requirements:</div>
      {checks.map((rule) => (
        <div key={rule.label} className={`profile-password-rule ${rule.valid ? 'valid' : 'invalid'}`}>
          <span className="profile-password-rule-icon" aria-hidden="true">
            {rule.valid ? '✓' : '×'}
          </span>
          <span>{rule.label}</span>
        </div>
      ))}
    </div>
  )
}
