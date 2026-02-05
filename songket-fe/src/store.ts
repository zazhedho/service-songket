import { create } from 'zustand'

interface AuthState {
  token: string | null
  role: string | null
  permissions: string[]
  setToken: (t: string | null) => void
  setRole: (r: string | null) => void
  setPermissions: (p: string[]) => void
  logout: () => void
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  permissions: [],
  setToken: (t) => {
    if (t) localStorage.setItem('token', t)
    else localStorage.removeItem('token')
    set({ token: t })
  },
  setRole: (r) => {
    if (r) localStorage.setItem('role', r)
    else localStorage.removeItem('role')
    set({ role: r })
  },
  setPermissions: (p) => set({ permissions: p || [] }),
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    set({ token: null, role: null, permissions: [] })
  },
}))
