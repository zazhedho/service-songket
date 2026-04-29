import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getMe } from '../../services/authService'
import { listMyMenus } from '../../services/menuService'
import { AppIcon, inferIconName, menuPathWithoutQuery } from './AppIcon'
import { useConfirm } from './ConfirmDialog'
import { useAuth } from '../../store'
import { translateUiText } from '../../utils/uiText'

type MenuItem = {
  id: string
  name?: string
  display_name?: string
  path?: string
  icon?: string
  parent_id?: string | null
  order_index?: number
}

type AccountProfile = {
  name: string
  email: string
  role: string
}

const FORCE_TOP_LEVEL_PATHS = new Set(['/business'])
const ALWAYS_HIDDEN_MENU_PATHS = new Set(['/finance-report'])
const LEGACY_BUSINESS_TAB_PATHS = new Set(['/dealer', '/finance'])

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

function formatRole(value?: string | null): string {
  return String(value || '-').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getInitials(value?: string | null): string {
  const chunks = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (chunks.length === 0) return 'U'
  return chunks.map((chunk) => chunk.charAt(0).toUpperCase()).join('')
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
  const [openGroupKeys, setOpenGroupKeys] = useState<Record<string, boolean>>({})
  const [accountProfile, setAccountProfile] = useState<AccountProfile>({ name: '', email: '', role: '' })
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
    let mounted = true

    if (!token) {
      setAccountProfile({ name: '', email: '', role: '' })
      return () => {
        mounted = false
      }
    }

    getMe()
      .then((res) => {
        if (!mounted) return
        const data = res.data?.data || res.data || {}
        setAccountProfile({
          name: String(data.name || ''),
          email: String(data.email || ''),
          role: String(data.role || ''),
        })
      })
      .catch(() => {
        if (!mounted) return
        setAccountProfile({ name: '', email: '', role: '' })
      })

    return () => {
      mounted = false
    }
  }, [token])

  useEffect(() => {
    setMobileOpen(false)
    setProfileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const root = document.querySelector('.app-main')
    if (!root) return

    const applyResponsiveTableLabels = (tables: Iterable<HTMLTableElement>) => {
      const autoStackDesktopColumnLimit = 4
      const autoStackMobileColumnLimit = 5
      const isSmallViewport = window.matchMedia('(max-width: 767px)').matches

      Array.from(tables).forEach((table) => {
        const headerCells = Array.from(table.querySelectorAll(':scope > thead > tr > th')) as HTMLTableCellElement[]
        const headerLabels = headerCells.map((cell) => cell.textContent?.trim() || '')
        const hasBodyTh = table.querySelector(':scope > tbody > tr > th') !== null
        if (!table.dataset.responsiveMode) {
          if (table.classList.contains('responsive-detail')) {
            table.dataset.responsiveMode = 'detail'
          } else if (table.classList.contains('responsive-scroll')) {
            table.dataset.responsiveMode = 'scroll'
          } else if (table.classList.contains('responsive-stack') && table.dataset.responsiveAutoStack !== 'true') {
            table.dataset.responsiveMode = 'stack'
          }
        }

        const preferredMode = table.dataset.responsiveMode
        const hasInlineMinWidth = Boolean(table.style.minWidth && table.style.minWidth.trim())
        const isDetailTable = hasBodyTh || preferredMode === 'detail'
        const isListTable = headerLabels.length > 0 && !isDetailTable
        const shouldStackList = preferredMode === 'stack' || (
          isListTable
          && preferredMode !== 'scroll'
          && !hasInlineMinWidth
          && (
            headerLabels.length <= autoStackDesktopColumnLimit
            || (isSmallViewport && headerLabels.length <= autoStackMobileColumnLimit)
          )
        )

        if (isListTable) {
          table.classList.add('table-list')
        } else {
          table.classList.remove('table-list')
        }

        if (shouldStackList) {
          if (preferredMode !== 'stack' && table.dataset.responsiveAutoStack !== 'true') {
            table.dataset.responsiveAutoStack = 'true'
          }
          table.classList.add('responsive-stack')
        } else {
          if (table.dataset.responsiveAutoStack === 'true') {
            delete table.dataset.responsiveAutoStack
          }
          table.classList.remove('responsive-stack')
        }

        if (isDetailTable) {
          table.classList.add('responsive-detail')
        } else {
          table.classList.remove('responsive-detail')
        }

        if (headerLabels.length === 0) return

        const rows = Array.from(table.querySelectorAll(':scope > tbody > tr')) as HTMLTableRowElement[]
        rows.forEach((row) => {
          let colIndex = 0
          const cells = Array.from(row.children) as HTMLElement[]
          cells.forEach((cell) => {
            if (!(cell instanceof HTMLTableCellElement)) return
            if (cell.tagName !== 'TD') return
            if (cell.hasAttribute('colspan') && Number(cell.getAttribute('colspan')) > 1) {
              cell.removeAttribute('data-label')
              colIndex += Number(cell.getAttribute('colspan')) || 1
              return
            }

            const label = headerLabels[Math.min(colIndex, headerLabels.length - 1)] || ''
            if (label) {
              cell.setAttribute('data-label', label)
            } else {
              cell.removeAttribute('data-label')
            }
            colIndex += Math.max(1, cell.colSpan || 1)
          })
        })
      })
    }

    const getAllTables = () => Array.from(root.querySelectorAll('table.table')) as HTMLTableElement[]
    const pendingTables = new Set<HTMLTableElement>()
    let frameId = 0

    const flushPendingTables = (fullScan = false) => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        if (fullScan || pendingTables.size === 0) {
          applyResponsiveTableLabels(getAllTables())
          pendingTables.clear()
          return
        }

        const tables = Array.from(pendingTables)
        pendingTables.clear()
        applyResponsiveTableLabels(tables)
      })
    }

    const collectAffectedTables = (node: Node, tables: Set<HTMLTableElement>) => {
      if (!(node instanceof Element)) return
      if (node instanceof HTMLTableElement && node.matches('table.table')) {
        tables.add(node)
      }
      const closestTable = node.closest('table.table')
      if (closestTable instanceof HTMLTableElement) {
        tables.add(closestTable)
      }
      node.querySelectorAll('table.table').forEach((table) => {
        if (table instanceof HTMLTableElement) {
          tables.add(table)
        }
      })
    }

    applyResponsiveTableLabels(getAllTables())
    const timer = window.setTimeout(() => flushPendingTables(true), 50)
    const observer = new MutationObserver((mutations) => {
      const affectedTables = new Set<HTMLTableElement>()
      mutations.forEach((mutation) => {
        collectAffectedTables(mutation.target, affectedTables)
        mutation.addedNodes.forEach((node) => collectAffectedTables(node, affectedTables))
        mutation.removedNodes.forEach((node) => collectAffectedTables(node, affectedTables))
      })

      if (affectedTables.size === 0) return
      affectedTables.forEach((table) => pendingTables.add(table))
      flushPendingTables()
    })
    observer.observe(root, { childList: true, subtree: true })
    const resizeHandler = () => flushPendingTables(true)
    window.addEventListener('resize', resizeHandler)

    return () => {
      window.clearTimeout(timer)
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      observer.disconnect()
      window.removeEventListener('resize', resizeHandler)
    }
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

  const preparedMenus = useMemo(() => {
    const withPath = menus.filter((m) => m.path)
    const normalized = withPath.map((menu) => menu)

    const hasBusinessMenu = normalized.some((menu) => menuPathWithoutQuery(menu.path) === '/business')
    const visibleMenus = normalized.filter((menu) => {
      const menuPath = menuPathWithoutQuery(menu.path)
      if (ALWAYS_HIDDEN_MENU_PATHS.has(menuPath)) return false
      if (hasBusinessMenu && LEGACY_BUSINESS_TAB_PATHS.has(menuPath)) return false
      return true
    })

    const dedup = new Map<string, MenuItem>()
    visibleMenus.forEach((menu) => {
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

    const dedupedMenus = Array.from(dedup.values())

    return dedupedMenus.sort((a, b) => {
      const aOrder = Number(a.order_index ?? Number.MAX_SAFE_INTEGER)
      const bOrder = Number(b.order_index ?? Number.MAX_SAFE_INTEGER)
      if (aOrder !== bOrder) return aOrder - bOrder
      const aLabel = (a.display_name || a.name || a.path || '').toLowerCase()
      const bLabel = (b.display_name || b.name || b.path || '').toLowerCase()
      return aLabel.localeCompare(bLabel)
    })
  }, [menus])

  const groupedMenus = useMemo(() => {
    const byID = new Map<string, MenuItem>()
    preparedMenus.forEach((menu) => {
      if (menu.id) byID.set(menu.id, menu)
    })

    const topLevel: MenuItem[] = []
    const childrenByParent = new Map<string, MenuItem[]>()
    preparedMenus.forEach((menu) => {
      const parentID = menu.parent_id ? String(menu.parent_id) : ''
      const menuPath = menuPathWithoutQuery(menu.path)
      const forceTopLevel = FORCE_TOP_LEVEL_PATHS.has(menuPath)

      if (parentID && byID.has(parentID) && !forceTopLevel) {
        const children = childrenByParent.get(parentID) || []
        children.push(menu)
        childrenByParent.set(parentID, children)
        return
      }
      topLevel.push(menu)
    })

    return topLevel.map((menu) => ({
      menu,
      children: childrenByParent.get(menu.id) || [],
    }))
  }, [preparedMenus])

  const activeMenu = useMemo(() => {
    const sorted = [...preparedMenus].sort((a, b) => menuPathWithoutQuery(b.path).length - menuPathWithoutQuery(a.path).length)
    return sorted.find((menu) => isMenuActive(location.pathname, menu.path))
  }, [preparedMenus, location.pathname])

  useEffect(() => {
    setOpenGroupKeys((prev) => {
      const next = { ...prev }
      groupedMenus.forEach((group) => {
        if (group.children.length === 0) return
        const key = String(group.menu.id || group.menu.path || '')
        if (!key) return

        const hasActiveChild = group.children.some((child) => isMenuActive(location.pathname, child.path))
        if (!(key in next)) {
          next[key] = hasActiveChild
          return
        }
        if (hasActiveChild) {
          next[key] = true
        }
      })
      return next
    })
  }, [groupedMenus, location.pathname])

  const accountName = accountProfile.name || 'User'
  const accountEmail = accountProfile.email || '-'
  const accountRole = formatRole(accountProfile.role || role)
  const accountInitials = getInitials(accountProfile.name || accountProfile.email)
  const accountFullName = String(accountProfile.name || accountProfile.email || 'Account').trim()

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand-row">
          <div className="brand-mark">
            <img src="/songket-logo.jpeg" alt="SONGKET Logo" className="brand-mark-img" />
          </div>
          <div className="brand-copy">
            <div className="brand">S.O.N.G.K.E.T</div>
            <div className="brand-fullname">System for Order-In Gathering and Kontrol for Enhanced Tracking</div>
          </div>
        </div>

        <div className="nav">
          {loading && <div className="menu-hint">Loading menu...</div>}
          {!loading &&
            groupedMenus.map((group) => {
              if (group.children.length === 0) {
                const menu = group.menu
                return (
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
                )
              }

              const groupKey = String(group.menu.id || group.menu.path || '')
              const hasActiveChild = group.children.some((child) => isMenuActive(location.pathname, child.path))
              const isOpen = Boolean(openGroupKeys[groupKey])

              return (
                <div className="menu-group" key={group.menu.id || group.menu.path}>
                  <button
                    type="button"
                    className={hasActiveChild ? 'nav-link menu-group-toggle active' : 'nav-link menu-group-toggle'}
                    onClick={() => {
                      setOpenGroupKeys((prev) => ({
                        ...prev,
                        [groupKey]: !Boolean(prev[groupKey]),
                      }))
                    }}
                    aria-expanded={isOpen}
                  >
                    <AppIcon name={inferIconName(group.menu)} className="menu-icon" />
                    <span className="menu-label">{getMenuLabel(group.menu)}</span>
                    <span className="menu-group-arrow">{isOpen ? '▾' : '▸'}</span>
                  </button>

                  {isOpen &&
                    group.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path || '#'}
                        title={getMenuLabel(child)}
                        className={({ isActive }) =>
                          isActive || isMenuActive(location.pathname, child.path) ? 'nav-link submenu active' : 'nav-link submenu'
                        }
                      >
                        <AppIcon name={inferIconName(child)} className="menu-icon" />
                        <span className="menu-label">{getMenuLabel(child)}</span>
                      </NavLink>
                    ))}
                </div>
              )
            })}
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
              <div className="topbar-subtitle">Workspace for SONGKET operational flow</div>
            </div>
          </div>
          <div className="topbar-actions" ref={profileMenuRef}>
            <button className="btn-ghost topbar-profile-btn" onClick={() => setProfileMenuOpen((open) => !open)}>
              <span className="topbar-profile-avatar" aria-hidden="true">{accountInitials}</span>
              <span className="topbar-profile-identity">
                <span className="topbar-profile-label">{accountFullName}</span>
                <span className="topbar-profile-role-inline">{accountRole}</span>
              </span>
            </button>

            {profileMenuOpen && (
              <div className="topbar-profile-menu">
                <div className="topbar-profile-summary">
                  <span className="topbar-profile-avatar large" aria-hidden="true">{accountInitials}</span>
                  <div className="topbar-profile-meta">
                    <div className="topbar-profile-kicker">Signed in as</div>
                    <div className="topbar-profile-name" title={accountName}>{accountName}</div>
                    <div className="topbar-profile-email">{accountEmail}</div>
                  </div>
                </div>
                <div className="topbar-profile-detail-row">
                  <span className="topbar-profile-detail-label">Role</span>
                  <span className="topbar-profile-role">{accountRole}</span>
                </div>
                <div className="topbar-profile-divider" />
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
