import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../store'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { getMe, getMyPermissions } from '../api'

export default function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  const setRole = useAuth((s) => s.setRole)
  const setPermissions = useAuth((s) => s.setPermissions)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const refreshingRef = useRef(false)
  const hydratedRef = useRef(false)

  const refreshSession = useCallback(async () => {
    if (!token || refreshingRef.current) return
    refreshingRef.current = true
    const shouldShowLoading = !hydratedRef.current
    if (shouldShowLoading) setLoading(true)
    try {
      const [meRes, permRes] = await Promise.all([getMe(), getMyPermissions()])
      const resolvedRole = meRes.data?.data?.role || meRes.data?.role || null
      if (resolvedRole) setRole(resolvedRole)
      const nextPerms = (permRes.data?.data || permRes.data || [])
        .map((permission: any) => String(permission?.name || '').trim())
        .filter(Boolean)
      setPermissions(nextPerms)
    } catch {
      logout()
      navigate('/login', { replace: true })
    } finally {
      hydratedRef.current = true
      refreshingRef.current = false
      if (shouldShowLoading) setLoading(false)
    }
  }, [logout, navigate, setPermissions, setRole, token])

  useEffect(() => {
    if (!token) return
    void refreshSession()
  }, [location.pathname, refreshSession, token])

  useEffect(() => {
    if (!token) return
    const handleFocus = () => {
      void refreshSession()
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshSession, token])

  if (!token) return <Navigate to="/login" replace />
  if (loading) return null
  return <>{children}</>
}
