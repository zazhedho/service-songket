import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store'
import React from 'react'

type MenuItem = { to: string; label: string; roles: string[] }

const menuItems: MenuItem[] = [
  { to: '/dashboard', label: 'Dashboard', roles: ['superadmin', 'admin', 'main_dealer'] },
  { to: '/orders', label: 'Form Order In', roles: ['superadmin', 'admin', 'main_dealer', 'dealer'] },
  { to: '/finance', label: 'Peta & Finance', roles: ['superadmin', 'admin', 'main_dealer'] },
  { to: '/credit', label: 'Credit Capability', roles: ['superadmin', 'admin', 'main_dealer'] },
  { to: '/quadrants', label: 'Kuadran', roles: ['superadmin', 'admin', 'main_dealer'] },
  { to: '/prices', label: 'Harga Pangan', roles: ['superadmin', 'admin', 'main_dealer'] },
  { to: '/news', label: 'Portal Berita', roles: ['superadmin', 'admin', 'main_dealer'] },
  { to: '/users', label: 'Users', roles: ['superadmin', 'admin'] },
  { to: '/roles', label: 'Roles & Access', roles: ['superadmin', 'admin'] },
  { to: '/menus', label: 'Menus', roles: ['superadmin', 'admin'] },
  { to: '/scrape-sources', label: 'Scrape URL', roles: ['superadmin', 'admin'] },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const logout = useAuth((s) => s.logout)
  const role = useAuth((s) => s.role)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filtered = menuItems.filter((m) => (role ? m.roles.includes(role) : false))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">SONGKET</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Role: {role || '-'}</div>
        <div className="nav">
          {filtered.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
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
