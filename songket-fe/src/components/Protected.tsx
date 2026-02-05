import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../store'
import React, { useEffect, useState } from 'react'
import { getMe, getMyPermissions } from '../api'

export default function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  const role = useAuth((s) => s.role)
  const permissions = useAuth((s) => s.permissions)
  const setRole = useAuth((s) => s.setRole)
  const setPermissions = useAuth((s) => s.setPermissions)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token && !loading && (role == null || permissions.length === 0)) {
      setLoading(true)
      Promise.all([getMe(), getMyPermissions()])
        .then(([meRes, permRes]) => {
          const r = meRes.data?.data?.role || meRes.data?.role
          if (r) setRole(r)
          const perms = (permRes.data?.data || permRes.data || []).map((p: any) => p.name)
          setPermissions(perms)
        })
        .catch(() => {
          logout()
          navigate('/login', { replace: true })
        })
        .finally(() => setLoading(false))
    }
  }, [token, role, permissions.length, setRole, setPermissions, logout, navigate, loading])

  if (!token) return <Navigate to="/login" replace />
  if (loading) return null
  return <>{children}</>
}
