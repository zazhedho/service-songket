import React from 'react'

export type IconName =
  | 'dashboard'
  | 'orders'
  | 'finance'
  | 'news'
  | 'prices'
  | 'credit'
  | 'quadrants'
  | 'jobs'
  | 'motorTypes'
  | 'installments'
  | 'settings'
  | 'netIncome'
  | 'users'
  | 'roles'
  | 'access'
  | 'menus'
  | 'sources'
  | 'logout'
  | 'menu'
  | 'panel'

type MenuIconInput = {
  path?: string
  icon?: string
}

export const MENU_ICON_OPTIONS: IconName[] = [
  'dashboard',
  'orders',
  'finance',
  'news',
  'prices',
  'credit',
  'quadrants',
  'jobs',
  'motorTypes',
  'installments',
  'settings',
  'netIncome',
  'users',
  'roles',
  'access',
  'menus',
  'sources',
  'menu',
  'panel',
]

export const ICON_LABELS: Record<IconName, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  finance: 'Finance',
  news: 'News',
  prices: 'Prices',
  credit: 'Credit',
  quadrants: 'Quadrants',
  jobs: 'Jobs',
  motorTypes: 'Motor Types',
  installments: 'Installments',
  settings: 'Settings',
  netIncome: 'Net Income',
  users: 'Users',
  roles: 'Roles',
  access: 'Access',
  menus: 'Menus',
  sources: 'Scrape Sources',
  logout: 'Logout',
  menu: 'Menu',
  panel: 'Panel',
}

const PATH_ICON_MAP: Record<string, IconName> = {
  '/dashboard': 'dashboard',
  '/orders': 'orders',
  '/finance': 'finance',
  '/news': 'news',
  '/prices': 'prices',
  '/credit': 'credit',
  '/quadrants': 'quadrants',
  '/jobs': 'jobs',
  '/motor-types': 'motorTypes',
  '/installments': 'installments',
  '/master-settings': 'settings',
  '/net-income': 'netIncome',
  '/users': 'users',
  '/roles': 'roles',
  '/role-menu-access': 'access',
  '/menus': 'menus',
  '/scrape-sources': 'sources',
}

export function menuPathWithoutQuery(menuPath?: string): string {
  if (!menuPath) return ''
  return menuPath.split('?')[0]
}

function isIconName(value: string): value is IconName {
  return (
    value === 'dashboard' ||
    value === 'orders' ||
    value === 'finance' ||
    value === 'news' ||
    value === 'prices' ||
    value === 'credit' ||
    value === 'quadrants' ||
    value === 'jobs' ||
    value === 'motorTypes' ||
    value === 'installments' ||
    value === 'settings' ||
    value === 'netIncome' ||
    value === 'users' ||
    value === 'roles' ||
    value === 'access' ||
    value === 'menus' ||
    value === 'sources' ||
    value === 'logout' ||
    value === 'menu' ||
    value === 'panel'
  )
}

export function inferIconName(menu: MenuIconInput): IconName {
  const basePath = menuPathWithoutQuery(menu.path)
  if (basePath && PATH_ICON_MAP[basePath]) return PATH_ICON_MAP[basePath]

  if (menu.icon) {
    const guess = menu.icon.toLowerCase()
    if (isIconName(guess)) return guess
    if (guess.includes('home') || guess.includes('dashboard')) return 'dashboard'
    if (guess.includes('order')) return 'orders'
    if (guess.includes('finance')) return 'finance'
    if (guess.includes('news')) return 'news'
    if (guess.includes('price') || guess.includes('commodity')) return 'prices'
    if (guess.includes('credit')) return 'credit'
    if (guess.includes('quadrant')) return 'quadrants'
    if (guess.includes('briefcase') || guess.includes('job') || guess.includes('work')) return 'jobs'
    if (guess.includes('motor') || guess.includes('bike') || guess.includes('bicycle')) return 'motorTypes'
    if (guess.includes('install') || guess.includes('wallet')) return 'installments'
    if (guess.includes('setting') || guess.includes('slider')) return 'settings'
    if (guess.includes('cash') || guess.includes('income') || guess.includes('coin')) return 'netIncome'
    if (guess.includes('user')) return 'users'
    if (guess.includes('role')) return 'roles'
    if (guess.includes('access')) return 'access'
    if (guess.includes('menu')) return 'menus'
    if (guess.includes('source') || guess.includes('scrape')) return 'sources'
  }

  return 'menu'
}

export function normalizeIconName(value?: string, menu?: MenuIconInput): IconName {
  const normalized = String(value || '').trim()
  if (isIconName(normalized)) return normalized
  return inferIconName({ path: menu?.path, icon: normalized || menu?.icon })
}

export function AppIcon({ name, className }: { name: IconName; className?: string }) {
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
    case 'motorTypes':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <circle cx="7" cy="16" r="2.3" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="17" cy="16" r="2.3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M6.8 16h4l2.2-4h3.6l1.4 4M9 11h2.6l1.7-2.8h2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'installments':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 10h18M7 14h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 7h6M14 7h6M10 7h2M4 12h2M10 12h10M8 12h2M4 17h10M18 17h2M14 17h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
