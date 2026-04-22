import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store'
import React, { useCallback, useEffect, useState } from 'react'
import { getMe } from '../../services/authService'
import { getMyPermissions } from '../../services/permissionService'

let hydratedSessionToken = ''
let hydratingSessionToken = ''
let hydrationPromise: Promise<void> | null = null

export default function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  const role = useAuth((s) => s.role)
  const permissions = useAuth((s) => s.permissions)
  const setRole = useAuth((s) => s.setRole)
  const setPermissions = useAuth((s) => s.setPermissions)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const hasHydratedSessionData = Boolean(role) && (role === 'superadmin' || permissions.length > 0)
  const [loading, setLoading] = useState(() => Boolean(token && hydratedSessionToken !== token && !hasHydratedSessionData))

  const hydrateSession = useCallback(async () => {
    if (!token || hydratedSessionToken === token) return

    if (hydrationPromise && hydratingSessionToken === token) {
      return hydrationPromise
    }

    hydratingSessionToken = token
    hydrationPromise = (async () => {
      const [meRes, permRes] = await Promise.all([getMe(), getMyPermissions()])
      const resolvedRole = meRes.data?.data?.role || meRes.data?.role || null
      if (resolvedRole) setRole(resolvedRole)

      const nextPerms = (permRes.data?.data || permRes.data || [])
        .map((permission: any) => String(permission?.name || '').trim())
        .filter(Boolean)
      setPermissions(nextPerms)

      hydratedSessionToken = token
    })().finally(() => {
      if (hydratingSessionToken === token) {
        hydratingSessionToken = ''
        hydrationPromise = null
      }
    })

    return hydrationPromise
  }, [setPermissions, setRole, token])

  useEffect(() => {
    let mounted = true

    if (!token) {
      if (mounted) setLoading(false)
      return () => {
        mounted = false
      }
    }

    if (hasHydratedSessionData) {
      hydratedSessionToken = token
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    if (hydratedSessionToken === token) {
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    setLoading(true)
    hydrateSession()
      .catch(() => {
        if (!mounted) return
        hydratedSessionToken = ''
        hydratingSessionToken = ''
        hydrationPromise = null
        logout()
        navigate('/login', { replace: true })
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [hasHydratedSessionData, hydrateSession, logout, navigate, token])

  if (!token) return <Navigate to="/login" replace />
  if (loading) return null
  return <>{children}</>
}
