import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, getMe } from '../api'
import { useAuth } from '../store'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        // fetch role from backend
        try {
          const me = await getMe()
          const r = me.data?.data?.role || me.data?.role
          if (r) setRoleStore(r)
        } catch (err) {
          setRoleStore(role) // fallback
        }
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card" style={{ width: 420, maxWidth: '100%' }}>
        <h2 style={{ marginTop: 0 }}>{isRegister ? 'Register' : 'Login'}</h2>
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
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>
        <button className="btn-ghost" style={{ marginTop: 10 }} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Register'}
        </button>
      </div>
    </div>
  )
}
