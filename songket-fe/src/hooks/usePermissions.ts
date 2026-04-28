import { useMemo } from 'react'
import { useAuth } from '../store'

const PERMISSION_NAME_OVERRIDES: Record<string, string> = {
  'users:assign_role': 'assign_role_users',
  'users:view_permissions': 'view_user_permissions',
  'users:assign_permissions': 'assign_user_permissions',
  'roles:manage_system': 'manage_system_roles',
  'roles:assign_permissions': 'assign_permissions',
  'menus:view': 'view_menu',
  'menus:create': 'create_menu',
  'menus:update': 'update_menu',
  'menus:delete': 'delete_menu',
  'business:view_metrics': 'view_business_metrics',
}

function toPermissionName(resource: string, action: string) {
  const key = `${resource}:${action}`
  if (PERMISSION_NAME_OVERRIDES[key]) return PERMISSION_NAME_OVERRIDES[key]
  return `${action}_${resource}`
}

export function usePermissions() {
  const role = useAuth((s) => s.role)
  const permissions = useAuth((s) => s.permissions)

  const permissionSet = useMemo(() => new Set((permissions || []).map((item) => String(item || '').trim()).filter(Boolean)), [permissions])

  const hasPermissionName = (name: string) => {
    if (role === 'superadmin') return true
    return permissionSet.has(String(name || '').trim())
  }

  const hasPermission = (resource: string, action: string) => {
    if (role === 'superadmin') return true
    return hasPermissionName(toPermissionName(resource, action))
  }

  const hasAnyPermission = (checks: Array<{ resource: string; action: string }>) => {
    if (role === 'superadmin') return true
    return checks.some((check) => hasPermission(check.resource, check.action))
  }

  const hasAllPermissions = (checks: Array<{ resource: string; action: string }>) => {
    if (role === 'superadmin') return true
    return checks.every((check) => hasPermission(check.resource, check.action))
  }

  return {
    permissions,
    role,
    hasPermission,
    hasPermissionName,
    hasAnyPermission,
    hasAllPermissions,
  }
}
