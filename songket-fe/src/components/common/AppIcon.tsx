import React from 'react'

export const ALL_ICON_NAMES = [
  'dashboard',
  'home',
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
  'analytics',
  'report',
  'store',
  'package',
  'calendar',
  'clock',
  'map',
  'phone',
  'mail',
  'bell',
  'shield',
  'key',
  'database',
  'folder',
  'tag',
  'truck',
  'globe',
  'chat',
  'help',
  'logout',
  'menu',
  'panel',
] as const

export type IconName = (typeof ALL_ICON_NAMES)[number]

type MenuIconInput = {
  path?: string
  icon?: string
}

export const MENU_ICON_OPTIONS: IconName[] = [
  'dashboard',
  'home',
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
  'analytics',
  'report',
  'store',
  'package',
  'calendar',
  'clock',
  'map',
  'phone',
  'mail',
  'bell',
  'shield',
  'key',
  'database',
  'folder',
  'tag',
  'truck',
  'globe',
  'chat',
  'help',
  'menu',
  'panel',
]

export const ICON_LABELS: Record<IconName, string> = {
  dashboard: 'Dashboard',
  home: 'Home',
  orders: 'Orders',
  finance: 'Finance',
  news: 'News',
  prices: 'Prices',
  credit: 'Credit',
  quadrants: 'Quadrants',
  jobs: 'Jobs & Net Income',
  motorTypes: 'Motor Types',
  installments: 'Motor Types & Installments',
  settings: 'Settings',
  netIncome: 'Jobs & Net Income',
  users: 'Users',
  roles: 'Roles',
  access: 'Access',
  menus: 'Menus',
  sources: 'Scrape Sources',
  analytics: 'Analytics',
  report: 'Report',
  store: 'Store',
  package: 'Package',
  calendar: 'Calendar',
  clock: 'Clock',
  map: 'Map',
  phone: 'Phone',
  mail: 'Mail',
  bell: 'Bell',
  shield: 'Shield',
  key: 'Key',
  database: 'Database',
  folder: 'Folder',
  tag: 'Tag',
  truck: 'Truck',
  globe: 'Globe',
  chat: 'Chat',
  help: 'Help',
  logout: 'Logout',
  menu: 'Menu',
  panel: 'Panel',
}

const PATH_ICON_MAP: Record<string, IconName> = {
  '/dashboard': 'dashboard',
  '/orders': 'orders',
  '/business': 'jobs',
  '/finance': 'finance',
  '/dealer': 'store',
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
  '/menus': 'menus',
  '/scrape-sources': 'sources',
}

export function menuPathWithoutQuery(menuPath?: string): string {
  if (!menuPath) return ''
  return menuPath.split('?')[0]
}

function isIconName(value: string): value is IconName {
  return (ALL_ICON_NAMES as readonly string[]).includes(value)
}

export function inferIconName(menu: MenuIconInput): IconName {
  if (menu.icon) {
    const normalizedIcon = menu.icon.trim()
    if (isIconName(normalizedIcon)) return normalizedIcon

    const guess = normalizedIcon.toLowerCase()
    if (isIconName(guess)) return guess
    if (guess.includes('home')) return 'home'
    if (guess.includes('dashboard')) return 'dashboard'
    if (guess.includes('order')) return 'orders'
    if (guess.includes('finance')) return 'finance'
    if (guess.includes('news')) return 'news'
    if (guess.includes('price') || guess.includes('commodity')) return 'prices'
    if (guess.includes('credit')) return 'credit'
    if (guess.includes('quadrant')) return 'quadrants'
    if (guess.includes('analytic') || guess.includes('chart') || guess.includes('stat')) return 'analytics'
    if (guess.includes('report') || guess.includes('document') || guess.includes('doc')) return 'report'
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
    if (guess.includes('store') || guess.includes('shop') || guess.includes('dealer')) return 'store'
    if (guess.includes('package') || guess.includes('product') || guess.includes('inventory')) return 'package'
    if (guess.includes('calendar') || guess.includes('schedule') || guess.includes('date')) return 'calendar'
    if (guess.includes('clock') || guess.includes('time')) return 'clock'
    if (guess.includes('map') || guess.includes('location') || guess.includes('area')) return 'map'
    if (guess.includes('phone') || guess.includes('call')) return 'phone'
    if (guess.includes('mail') || guess.includes('email') || guess.includes('envelope')) return 'mail'
    if (guess.includes('bell') || guess.includes('notif') || guess.includes('alert')) return 'bell'
    if (guess.includes('shield') || guess.includes('security') || guess.includes('safe')) return 'shield'
    if (guess.includes('key') || guess.includes('password')) return 'key'
    if (guess.includes('database') || guess.includes('db') || guess.includes('server') || guess.includes('data')) return 'database'
    if (guess.includes('folder') || guess.includes('archive') || guess.includes('file')) return 'folder'
    if (guess.includes('tag') || guess.includes('label')) return 'tag'
    if (guess.includes('truck') || guess.includes('delivery') || guess.includes('shipping')) return 'truck'
    if (guess.includes('globe') || guess.includes('world') || guess.includes('global')) return 'globe'
    if (guess.includes('chat') || guess.includes('message')) return 'chat'
    if (guess.includes('help') || guess.includes('question') || guess.includes('support')) return 'help'
  }

  const basePath = menuPathWithoutQuery(menu.path)
  if (basePath && PATH_ICON_MAP[basePath]) return PATH_ICON_MAP[basePath]

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
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M3.5 10.5 12 4l8.5 6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M6 10.5V20h12v-9.5M10 20v-5.2h4V20" stroke="currentColor" strokeWidth="1.7" />
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
    case 'analytics':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 19h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M7 16v-5M12 16V8M17 16v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'report':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M6 3h9l3 3v15H6z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M15 3v4h3M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
    case 'store':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 8h16l-1.2 4H5.2z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5 12v8h14v-8M9 20v-4h6v4" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'package':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M3.5 8 12 4l8.5 4-8.5 4-8.5-4Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3.5 8v8L12 20l8.5-4V8M12 12v8" stroke="currentColor" strokeWidth="1.7" />
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
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 3.5v4M16 3.5v4M4 9h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 8.5v4l3 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'map':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="m4 7 5-2 6 2 5-2v12l-5 2-6-2-5 2V7Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9 5v12M15 7v12" stroke="currentColor" strokeWidth="1.7" />
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
    case 'phone':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M7.5 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M10 17h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'mail':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <rect x="3.5" y="6" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="m4 8 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M6.5 16h11l-1.2-2v-3.2a4.3 4.3 0 0 0-8.6 0V14L6.5 16Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M12 3 5 7v6c0 5 3.4 7.8 7 8 3.6-.2 7-3 7-8V7l-7-4Z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'key':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <circle cx="8.5" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M11.5 12H20M16 12v-2M18 12v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'database':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <ellipse cx="12" cy="6.5" rx="7" ry="2.8" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5 6.5v10c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-10M5 11.5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'folder':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M3.5 7h6l2 2h9v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'tag':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 10V4h6l9 9-6 6-9-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="8" cy="8" r="1.1" fill="currentColor" />
        </svg>
      )
    case 'truck':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M3.5 7.5h10v7h-10zM13.5 9.5h4l2 2v3h-6" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="8" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="17" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
    case 'globe':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4.8 9h14.4M4.8 15h14.4M12 4c2 2.2 3.1 5 3.1 8s-1.1 5.8-3.1 8M12 4c-2 2.2-3.1 5-3.1 8s1.1 5.8 3.1 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <path d="M4 6.5h16v9H9l-4.5 3V6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )
    case 'help':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={baseClass}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9.8 9.5a2.2 2.2 0 1 1 3.7 1.6c-.8.7-1.5 1-1.5 2M12 16.8h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
