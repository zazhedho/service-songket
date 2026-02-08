import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { listMyMenus } from '../api'
import { useAuth } from '../store'

type MenuItem = {
  id: string
  name?: string
  display_name?: string
  path?: string
  icon?: string
}

type IconName =
  | 'dashboard'
  | 'orders'
  | 'finance'
  | 'news'
  | 'prices'
  | 'credit'
  | 'quadrants'
  | 'jobs'
  | 'netIncome'
  | 'users'
  | 'roles'
  | 'access'
  | 'menus'
  | 'sources'
  | 'logout'
  | 'menu'
  | 'panel'

const PATH_ICON_MAP: Record<string, IconName> = {
  '/dashboard': 'dashboard',
  '/orders': 'orders',
  '/finance': 'finance',
  '/news': 'news',
  '/prices': 'prices',
  '/credit': 'credit',
  '/quadrants': 'quadrants',
  '/jobs': 'jobs',
  '/net-income': 'netIncome',
  '/users': 'users',
  '/roles': 'roles',
  '/role-menu-access': 'access',
  '/menus': 'menus',
  '/scrape-sources': 'sources',
}

function iconFromMenu(menu: MenuItem): IconName {
  if (menu.path && PATH_ICON_MAP[menu.path]) return PATH_ICON_MAP[menu.path]
  if (menu.icon) {
    const guess = menu.icon.toLowerCase()
    if (guess.includes('home') || guess.includes('dashboard')) return 'dashboard'
    if (guess.includes('order')) return 'orders'
    if (guess.includes('finance')) return 'finance'
    if (guess.includes('news')) return 'news'
    if (guess.includes('price') || guess.includes('commodity')) return 'prices'
    if (guess.includes('credit')) return 'credit'
    if (guess.includes('quadrant')) return 'quadrants'
    if (guess.includes('briefcase') || guess.includes('job') || guess.includes('work')) return 'jobs'
    if (guess.includes('cash') || guess.includes('income') || guess.includes('coin')) return 'netIncome'
    if (guess.includes('user')) return 'users'
    if (guess.includes('role')) return 'roles'
    if (guess.includes('access')) return 'access'
    if (guess.includes('menu')) return 'menus'
    if (guess.includes('source') || guess.includes('scrape')) return 'sources'
  }
  return 'panel'
}

function isMenuActive(pathname: string, menuPath?: string): boolean {
  if (!menuPath) return false
  return pathname === menuPath || pathname.startsWith(`${menuPath}/`)
}

function AppIcon({ name, className }: { name: IconName; className?: string }) {
  const baseClass = className || 'menu-icon'

  switch (name) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M7 3h10v4h3v14H4V7h3V3Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9 3v4M15 3v4M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'finance':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M3 10 12 4l9 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M5 10v10h14V10M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'news':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M5 5h14v14H5z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'prices':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 16h4l2-6 3 8 2-4h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M4 5h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'credit':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'quadrants':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'jobs':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2M3 12h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'netIncome':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9.5 13.5c0 1 1 1.8 2.5 1.8s2.5-.8 2.5-1.8c0-1.1-.9-1.6-2.5-2-1.6-.4-2.5-.8-2.5-2 0-1 .9-1.8 2.5-1.8s2.5.8 2.5 1.8M12 7.5v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M17 19a5 5 0 0 0-10 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M20 18a3 3 0 0 0-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'roles':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M12 3 5 7v6c0 5 3.4 7.8 7 8 3.6-.2 7-3 7-8V7l-7-4Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'access':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <rect x="3" y="10" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'menus':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'sources':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M10 14 8 16a3 3 0 1 1-4-4l2-2m8-4 2-2a3 3 0 0 1 4 4l-2 2m-8 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'logout':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="m16 16 5-4-5-4M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'menu':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuth((s) => s.logout)
  const role = useAuth((s) => s.role)
  const token = useAuth((s) => s.token)

  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!token) {
      setMenus([])
      return
    }

    setLoading(true)
    listMyMenus()
      .then((res) => {
        const data = res.data.data || res.data || []
        setMenus(Array.isArray(data) ? data : [])
      })
      .catch(() => setMenus([]))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filtered = useMemo(() => menus.filter((m) => m.path), [menus])

  const activeMenu = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => (b.path || '').length - (a.path || '').length)
    return sorted.find((menu) => isMenuActive(location.pathname, menu.path))
  }, [filtered, location.pathname])

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand-row">
          <div className="brand-mark">SG</div>
          <div className="brand-copy">
            <div className="brand">Songket Panel</div>
            <div className="brand-role">Role: {role || '-'}</div>
          </div>
        </div>

        <div className="nav">
          {loading && <div className="menu-hint">Loading menu...</div>}
          {!loading &&
            filtered.map((menu) => (
              <NavLink
                key={menu.path}
                to={menu.path || '#'}
                title={menu.display_name || menu.name || menu.path}
                className={({ isActive }) =>
                  isActive || isMenuActive(location.pathname, menu.path) ? 'nav-link active' : 'nav-link'
                }
              >
                <AppIcon name={iconFromMenu(menu)} className="menu-icon" />
                <span className="menu-label">{menu.display_name || menu.name || menu.path}</span>
              </NavLink>
            ))}
        </div>

        <button className="btn-ghost sidebar-logout" onClick={handleLogout}>
          <AppIcon name="logout" className="menu-icon" />
          <span className="menu-label">Logout</span>
        </button>
      </aside>

      {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}

      <div className="app-main">
        <div className="app-topbar">
          <div className="topbar-left">
            <button className="topbar-btn mobile-only" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <AppIcon name="menu" className="topbar-icon" />
            </button>
            <button
              className="topbar-btn desktop-only"
              onClick={() => setCollapsed((value) => !value)}
              aria-label="Toggle sidebar"
            >
              <AppIcon name="menu" className="topbar-icon" />
            </button>
            <div>
              <div className="topbar-title">{activeMenu?.display_name || activeMenu?.name || 'Dashboard'}</div>
              <div className="topbar-subtitle">Admin workspace for Songket operational flow</div>
            </div>
          </div>
          <button className="btn-ghost topbar-logout" onClick={handleLogout}>
            <AppIcon name="logout" className="topbar-icon" />
            Logout
          </button>
        </div>
        <main>{children}</main>
      </div>
    </div>
  )
}
