import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, login, register } from '../../services/authService'
import { getMyPermissions } from '../../services/permissionService'
import { useAuth } from '../../store'

function validatePasswordByBackendRule(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters long.'
  if (!/[a-z]/.test(password)) return 'Password must include at least 1 lowercase letter (a-z).'
  if (!/[A-Z]/.test(password)) return 'Password must include at least 1 uppercase letter (A-Z).'
  if (!/[0-9]/.test(password)) return 'Password must include at least 1 number (0-9).'
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must include at least 1 symbol (!@#$%^&*...).'
  return ''
}

function getPasswordRuleChecks(password: string) {
  return [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'At least 1 number (0-9)', valid: /[0-9]/.test(password) },
    { label: 'At least 1 symbol (!@#$%^&*...)', valid: /[^a-zA-Z0-9]/.test(password) },
  ]
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
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false))

  const navigate = useNavigate()
  const setToken = useAuth((s) => s.setToken)
  const setRoleStore = useAuth((s) => s.setRole)
  const setPermissions = useAuth((s) => s.setPermissions)
  const isRegisterPasswordMismatch = isRegister && confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isRegister) {
        const passwordRuleError = validatePasswordByBackendRule(password)
        if (passwordRuleError) {
          setError(passwordRuleError)
          return
        }

        if (!confirmPassword) {
          setError('Password confirmation is required.')
          return
        }

        if (password !== confirmPassword) {
          setError('Password and password confirmation do not match.')
          return
        }

        await register({ name, email, phone, password })
        setIsRegister(false)
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        setShowConfirmPassword(false)
      } else {
        const { data } = await login(email, password)
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

  const inputStyle = {
    width: '100%',
    borderRadius: 12,
    border: '1px solid #d0d8e7',
    background: '#f9fbff',
    color: '#0f172a',
    padding: '11px 12px',
    fontSize: 14,
    outline: 'none',
  }

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f4f6fb',
        display: 'grid',
        gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0, 2.2fr) minmax(320px, 1fr)',
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: 'clamp(24px, 4vw, 44px)',
          background:
            'radial-gradient(circle at 12% 88%, rgba(103, 232, 249, 0.85), transparent 40%), radial-gradient(circle at 84% 12%, rgba(217, 70, 239, 0.48), transparent 34%), linear-gradient(140deg, #312eeb 0%, #4f46e5 40%, #6d28d9 70%, #db2777 100%)',
          color: '#f8fafc',
          overflow: 'hidden',
          minHeight: isNarrow ? '52vh' : '100vh',
          display: 'grid',
          alignContent: 'center',
          justifyItems: 'center',
          gap: 20,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 'clamp(34px, 4.5vw, 52px)', lineHeight: 1.14, textAlign: 'center', fontWeight: 700 }}>
          Songket Business Console
        </h1>
        <div style={{ maxWidth: 720, textAlign: 'center', color: 'rgba(248, 250, 252, 0.92)', fontSize: 16, lineHeight: 1.6 }}>
          Monitoring order in, approval finance, dan performa dealer dalam satu dashboard operasional yang terintegrasi.
        </div>

        <div
          style={{
            width: 'min(760px, 100%)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              borderRadius: 14,
              border: '1px solid rgba(226, 232, 240, 0.38)',
              background: 'rgba(15, 23, 42, 0.26)',
              backdropFilter: 'blur(4px)',
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.86 }}>Dashboard</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>Daily Order In Trend</div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(226, 232, 240, 0.9)', lineHeight: 1.5 }}>
              Monitor daily order-in movement across dealers in real time.
            </div>
          </div>
          <div
            style={{
              borderRadius: 14,
              border: '1px solid rgba(226, 232, 240, 0.38)',
              background: 'rgba(15, 23, 42, 0.26)',
              backdropFilter: 'blur(4px)',
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.86 }}>Finance</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>Approve vs Reject</div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(226, 232, 240, 0.9)', lineHeight: 1.5 }}>
              Review finance decisions and company breakdown in one view.
            </div>
          </div>
          <div
            style={{
              borderRadius: 14,
              border: '1px solid rgba(226, 232, 240, 0.38)',
              background: 'rgba(15, 23, 42, 0.26)',
              backdropFilter: 'blur(4px)',
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.86 }}>Analysis</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>YTD Summary</div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(226, 232, 240, 0.9)', lineHeight: 1.5 }}>
              Compare current-period performance with the previous period.
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          minHeight: isNarrow ? '48vh' : '100vh',
          display: 'grid',
          alignContent: 'center',
          justifyItems: 'center',
          padding: 'clamp(18px, 3vw, 30px)',
          background: '#f3f4f6',
        }}
      >
        <div style={{ width: 'min(360px, 100%)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <img src="/songket-logo.jpeg" alt="SONGKET Logo" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover' }} />
            <div style={{ fontSize: 'clamp(34px, 5vw, 42px)', fontWeight: 700, lineHeight: 1, color: '#4b5563' }}>S.O.N.G.K.E.T</div>
          </div>

          <h2 style={{ margin: '0 0 20px', color: '#1f2937', fontSize: 22, lineHeight: 1.1, fontWeight: 500 }}>
            {isRegister ? 'Register' : 'Log in'}
          </h2>

          <form onSubmit={handleSubmit} className="grid" style={{ gap: 12, textAlign: 'left' }}>
            {isRegister && (
              <>
                <input style={inputStyle} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <input style={inputStyle} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                {/*<select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>*/}
                {/*  <option value="dealer">Dealer</option>*/}
                {/*  <option value="main_dealer">Main Dealer</option>*/}
                {/*  <option value="superadmin">Super Admin</option>*/}
                {/*</select>*/}
              </>
            )}

            <input
              style={inputStyle}
              placeholder="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...inputStyle, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 26,
                  height: 26,
                  border: '0',
                  borderRadius: 8,
                  background: 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#374151',
                }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {isRegister && (
              <PasswordRulesGuide password={password} />
            )}

            {isRegister && (
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  placeholder="Password confirmation"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 26,
                    height: 26,
                    border: '0',
                    borderRadius: 8,
                    background: 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            )}

            {isRegisterPasswordMismatch && (
              <div style={{ color: '#b91c1c', fontSize: 12, fontWeight: 600 }}>
                Password and password confirmation do not match.
              </div>
            )}

            {error && (
              <div
                style={{
                  color: '#991b1b',
                  fontSize: 13,
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                border: 0,
                borderRadius: 8,
                padding: '11px 12px',
                fontSize: 18,
                fontWeight: 600,
                color: '#eff6ff',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: '#3b82f6',
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? 'Loading...' : isRegister ? 'Register' : 'Log in'}
            </button>
          </form>

          <button
            type="button"
            onClick={() =>
              setIsRegister((value) => {
                const next = !value
                setError('')
                setPassword('')
                setConfirmPassword('')
                setShowPassword(false)
                setShowConfirmPassword(false)
                return next
              })
            }
            style={{
              marginTop: 16,
              width: '100%',
              border: '1px solid #3b82f6',
              borderRadius: 8,
              background: 'transparent',
              color: '#3b82f6',
              padding: '10px 12px',
              fontSize: 17,
              cursor: 'pointer',
            }}
          >
            {isRegister ? 'Back to login' : 'Create an account'}
          </button>
        </div>
      </div>
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
    <div
      style={{
        border: '1px solid #d7e0ef',
        borderRadius: 10,
        background: '#f8fafc',
        fontSize: 12,
        lineHeight: 1.5,
        padding: '10px 12px',
      }}
    >
      {checks.map((rule) => (
        <div key={rule.label} style={{ color: rule.valid ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
          {rule.valid ? 'PASS' : 'FAIL'} {rule.label}
        </div>
      ))}
    </div>
  )
}
