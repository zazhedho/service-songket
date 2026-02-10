import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { listMyMenus } from '../api'
import { AppIcon, inferIconName, menuPathWithoutQuery } from './AppIcon'
import { useAuth } from '../store'
import { translateUiText } from '../utils/uiText'

type MenuItem = {
  id: string
  name?: string
  display_name?: string
  path?: string
  icon?: string
}

function isMenuActive(pathname: string, menuPath?: string): boolean {
  const basePath = menuPathWithoutQuery(menuPath)
  if (!basePath) return false
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

const PATH_LABEL_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Order In',
  '/finance': 'Finance',
  '/news': 'News',
  '/prices': 'Prices',
  '/credit': 'Credit',
  '/quadrants': 'Quadrants',
  '/jobs': 'Jobs',
  '/motor-types': 'Motor Types',
  '/installments': 'Installments',
  '/master-settings': 'Master Settings',
  '/net-income': 'Net Income',
  '/users': 'Users',
  '/roles': 'Roles & Access',
  '/role-menu-access': 'Roles & Access',
  '/menus': 'Menus',
  '/scrape-sources': 'Scrape Sources',
}

function getMenuLabel(menu?: Partial<MenuItem> | null): string {
  if (!menu) return 'Dashboard'
  const basePath = menuPathWithoutQuery(menu.path)
  if (basePath && PATH_LABEL_MAP[basePath]) return PATH_LABEL_MAP[basePath]
  return translateUiText(menu.display_name || menu.name || menu.path || 'Dashboard')
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

  const filtered = useMemo(() => {
    const withPath = menus.filter((m) => m.path)
    const normalized = withPath.map((menu) => {
      if (menu.path === '/role-menu-access') {
        return {
          ...menu,
          path: '/roles',
          display_name: menu.display_name || 'Roles & Access',
        }
      }
      return menu
    })

    const dedup = new Map<string, MenuItem>()
    normalized.forEach((menu) => {
      const key = menuPathWithoutQuery(menu.path)
      if (!key) return

      const existing = dedup.get(key)
      if (!existing) {
        dedup.set(key, menu)
        return
      }

      // Prefer canonical route without query string.
      if ((existing.path || '').includes('?') && !(menu.path || '').includes('?')) {
        dedup.set(key, menu)
      }
    })

    return Array.from(dedup.values())
  }, [menus])

  const activeMenu = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => menuPathWithoutQuery(b.path).length - menuPathWithoutQuery(a.path).length)
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
                title={getMenuLabel(menu)}
                className={({ isActive }) =>
                  isActive || isMenuActive(location.pathname, menu.path) ? 'nav-link active' : 'nav-link'
                }
              >
                <AppIcon name={inferIconName(menu)} className="menu-icon" />
                <span className="menu-label">{getMenuLabel(menu)}</span>
              </NavLink>
            ))}
        </div>

        {/*<button className="btn-ghost sidebar-logout" onClick={handleLogout}>*/}
        {/*  <AppIcon name="logout" className="menu-icon" />*/}
        {/*  <span className="menu-label">Logout</span>*/}
        {/*</button>*/}
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
              <div className="topbar-title">{getMenuLabel(activeMenu)}</div>
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
