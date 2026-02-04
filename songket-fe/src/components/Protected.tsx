import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../store'
import React, { useEffect, useState } from 'react'
import { getMe } from '../api'

export default function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token)
  const role = useAuth((s) => s.role)
  const setRole = useAuth((s) => s.setRole)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token && !role && !loading) {
      setLoading(true)
      getMe()
        .then((res) => {
          const r = res.data?.data?.role || res.data?.role
          if (r) setRole(r)
        })
        .catch(() => {
          logout()
          navigate('/login', { replace: true })
        })
        .finally(() => setLoading(false))
    }
  }, [token, role, setRole, logout, navigate, loading])

  if (!token) return <Navigate to="/login" replace />
  if (loading) return null
  return <>{children}</>
}
