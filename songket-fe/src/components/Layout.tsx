import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { listMyMenus } from '../api'
import { AppIcon, inferIconName, menuPathWithoutQuery } from './AppIcon'
import { useConfirm } from './ConfirmDialog'
import { useAuth } from '../store'
import { translateUiText } from '../utils/uiText'
import { MENUS_UPDATED_EVENT } from '../constants/events'

type MenuItem = {
  id: string
  name?: string
  display_name?: string
  path?: string
  icon?: string
  order_index?: number
}

function isMenuActive(pathname: string, menuPath?: string): boolean {
  const basePath = menuPathWithoutQuery(menuPath)
  if (!basePath) return false
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

function getMenuLabel(menu?: Partial<MenuItem> | null): string {
  if (!menu) return 'Dashboard'
  if (menu.display_name && String(menu.display_name).trim()) {
    return translateUiText(menu.display_name)
  }
  if (menu.name && String(menu.name).trim()) {
    return translateUiText(menu.name)
  }
  if (menu.path && String(menu.path).trim()) {
    return translateUiText(menu.path.replace(/^\//, '').replace(/[-_]/g, ' ') || 'Dashboard')
  }
  return 'Dashboard'
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuth((s) => s.logout)
  const role = useAuth((s) => s.role)
  const token = useAuth((s) => s.token)
  const confirm = useConfirm()

  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const fetchMenus = useCallback(async () => {
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
    void fetchMenus()
  }, [fetchMenus])

  useEffect(() => {
    const handleFocus = () => {
      void fetchMenus()
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchMenus])

  useEffect(() => {
    if (!token) return
    const timer = window.setInterval(() => {
      void fetchMenus()
    }, 15000)
    return () => {
      window.clearInterval(timer)
    }
  }, [fetchMenus, token])

  useEffect(() => {
    const handleMenusUpdated = () => {
      void fetchMenus()
    }

    window.addEventListener(MENUS_UPDATED_EVENT, handleMenusUpdated)
    return () => {
      window.removeEventListener(MENUS_UPDATED_EVENT, handleMenusUpdated)
    }
  }, [fetchMenus])

  useEffect(() => {
    setMobileOpen(false)
    setProfileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Logout',
      description: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    setProfileMenuOpen(false)
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

    return Array.from(dedup.values()).sort((a, b) => {
      const aOrder = Number(a.order_index ?? Number.MAX_SAFE_INTEGER)
      const bOrder = Number(b.order_index ?? Number.MAX_SAFE_INTEGER)
      if (aOrder !== bOrder) return aOrder - bOrder
      const aLabel = (a.display_name || a.name || a.path || '').toLowerCase()
      const bLabel = (b.display_name || b.name || b.path || '').toLowerCase()
      return aLabel.localeCompare(bLabel)
    })
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
          <div className="topbar-actions" ref={profileMenuRef}>
            <button className="btn-ghost topbar-profile-btn" onClick={() => setProfileMenuOpen((open) => !open)}>
              <AppIcon name="users" className="topbar-icon" />
              Account
            </button>

            {profileMenuOpen && (
              <div className="topbar-profile-menu">
                <button
                  className="topbar-profile-item"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    navigate('/profile')
                  }}
                >
                  Profile
                </button>
                <button className="topbar-profile-item danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
        <main>{children}</main>
      </div>
    </div>
  )
}
