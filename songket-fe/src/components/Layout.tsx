import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store'
import React, { useEffect, useState } from 'react'
import { listMyMenus } from '../api'

type MenuItem = { id: string; name?: string; display_name?: string; path?: string }

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const logout = useAuth((s) => s.logout)
  const role = useAuth((s) => s.role)
  const token = useAuth((s) => s.token)

  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setMenus([])
      return
    }
    setLoading(true)
    listMyMenus()
      .then((res) => {
        const data = res.data.data || res.data || []
        setMenus(data)
      })
      .catch(() => setMenus([]))
      .finally(() => setLoading(false))
  }, [token])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  const filtered = menus.filter((m) => m.path)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">SONGKET</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Role: {role || '-'}</div>
        <div className="nav">
          {loading && <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading menu...</div>}
          {!loading &&
            filtered.map((l) => (
              <NavLink key={l.path} to={l.path || '#'} className={({ isActive }) => (isActive ? 'active' : '')}>
                {l.display_name || l.name || l.path}
              </NavLink>
            ))}
        </div>
        <button className="btn-ghost" style={{ marginTop: 24, width: '100%' }} onClick={handleLogout}>
          Logout
        </button>
      </aside>
      <main>{children}</main>
    </div>
  )
}
