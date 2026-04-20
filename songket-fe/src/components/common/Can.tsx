import type { ReactNode } from 'react'
import { usePermissions } from '../../hooks/usePermissions'

type PermissionCheck = {
  resource: string
  action: string
}

type CanProps = {
  action?: string
  allOf?: PermissionCheck[]
  anyOf?: PermissionCheck[]
  children: ReactNode
  fallback?: ReactNode
  resource?: string
}

export default function Can({
  action,
  allOf,
  anyOf,
  children,
  fallback = null,
  resource,
}: CanProps) {
  const { hasAllPermissions, hasAnyPermission, hasPermission } = usePermissions()

  let allowed = false

  if (resource && action) {
    allowed = hasPermission(resource, action)
  } else if (Array.isArray(anyOf) && anyOf.length > 0) {
    allowed = hasAnyPermission(anyOf)
  } else if (Array.isArray(allOf) && allOf.length > 0) {
    allowed = hasAllPermissions(allOf)
  }

  return <>{allowed ? children : fallback}</>
}
