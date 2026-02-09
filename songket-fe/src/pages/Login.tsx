import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, login, register } from '../api'
import { useAuth } from '../store'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('dealer')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const setToken = useAuth((s) => s.setToken)
  const setRoleStore = useAuth((s) => s.setRole)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isRegister) {
        await register({ name, email, phone, password, role })
        setIsRegister(false)
      } else {
        const { data } = await login(email, password)
        const token = data?.data?.token || data?.token || data?.data
        setToken(token)

        try {
          const me = await getMe()
          const backendRole = me.data?.data?.role || me.data?.role
          if (backendRole) setRoleStore(backendRole)
        } catch {
          setRoleStore(role)
        }

        navigate('/dashboard')
      }
    } catch (err: any) {
      const rawError = err?.response?.data?.error
      const message =
        (typeof rawError === 'string' && rawError.trim()) ||
        (rawError && typeof rawError === 'object' && typeof rawError.message === 'string' && rawError.message.trim()) ||
        (typeof err?.response?.data?.message === 'string' && err.response.data.message.trim()) ||
        'Gagal memproses autentikasi'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        background: 'linear-gradient(130deg, #dbeafe, #f0f9ff 45%, #e2e8f0)',
      }}
    >
      <div
        style={{
          width: 'min(980px, 100%)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          background: '#ffffff',
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid #dbe3ef',
          boxShadow: '0 24px 50px rgba(15, 23, 42, 0.18)',
        }}
      >
        <div
          style={{
            padding: 28,
            background: 'linear-gradient(155deg, #1d4ed8, #2563eb 58%, #0ea5e9)',
            color: '#eaf2ff',
            display: 'grid',
            alignContent: 'space-between',
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9 }}>Songket Suite</div>
            <h1 style={{ margin: '8px 0 0', fontSize: 34, lineHeight: 1.2 }}>Songket Console</h1>
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <h2 style={{ marginTop: 0 }}>{isRegister ? 'Register Account' : 'Sign In'}</h2>
          <div style={{ color: '#64748b', marginBottom: 14 }}>
            {isRegister ? 'Buat akun baru untuk akses sistem.' : 'Masuk untuk melanjutkan ke dashboard.'}
          </div>

          <form onSubmit={handleSubmit} className="grid" style={{ gap: 12 }}>
            {isRegister && (
              <>
                <div>
                  <label>Nama</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div>
                  <label>Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>

                <div>
                  <label>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="dealer">Dealer</option>
                    <option value="main_dealer">Main Dealer</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 42 }}
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
                    width: 28,
                    height: 28,
                    border: '1px solid #d4dce8',
                    borderRadius: 8,
                    background: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
            </button>
          </form>

          <button className="btn-ghost" style={{ marginTop: 10 }} onClick={() => setIsRegister((value) => !value)}>
            {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Register'}
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

function InfoBullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: '#bfdbfe',
          boxShadow: '0 0 0 6px rgba(191, 219, 254, 0.18)',
          flex: '0 0 auto',
        }}
      />
      <span style={{ fontSize: 14 }}>{text}</span>
    </div>
  )
}
