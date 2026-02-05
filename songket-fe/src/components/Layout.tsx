import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store'
import React from 'react'

type MenuItem = { to: string; label: string; roles?: string[]; perms?: string[] }

const menuItems: MenuItem[] = [
  { to: '/dashboard', label: 'Dashboard', roles: ['superadmin', 'admin', 'main_dealer'] },
  { to: '/orders', label: 'Form Order In', perms: ['list_orders', 'create_orders'] },
  { to: '/finance', label: 'Peta & Finance', perms: ['list_finance_dealers'] },
  { to: '/credit', label: 'Credit Capability', perms: ['list_credit'] },
  { to: '/quadrants', label: 'Kuadran', perms: ['list_quadrants'] },
  { to: '/prices', label: 'Harga Pangan', perms: ['list_prices'] },
  { to: '/news', label: 'Portal Berita', perms: ['view_news'] },
  { to: '/users', label: 'Users', perms: ['list_users'] },
  { to: '/roles', label: 'Roles & Access', perms: ['list_roles'] },
  { to: '/menus', label: 'Menus', perms: ['list_menus'] },
  { to: '/scrape-sources', label: 'Scrape URL', perms: ['list_scrape_sources'] },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const logout = useAuth((s) => s.logout)
  const role = useAuth((s) => s.role)
  const permissions = useAuth((s) => s.permissions)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const hasPerm = (p?: string[]) => {
    if (!p || p.length === 0) return true
    return p.some((perm) => permissions.includes(perm))
  }
  const filtered = menuItems.filter((m) => {
    const roleOk = !m.roles || (role ? m.roles.includes(role) : false)
    return roleOk && hasPerm(m.perms)
  })

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
