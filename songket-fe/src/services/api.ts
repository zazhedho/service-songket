import axios from 'axios'
import { useAuth } from '../store'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isHandlingUnauthorized = false

function isAuthRequest(url?: string) {
  return Boolean(url && ['/api/user/login', '/api/user/register'].some((path) => url.includes(path)))
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/login') return
  window.location.replace('/login')
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const requestUrl = String(error?.config?.url || '')
    const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('token'))

    if (status === 401 && hasToken && !isAuthRequest(requestUrl)) {
      useAuth.getState().logout()

      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true
        redirectToLogin()
      }
    }

    return Promise.reject(error)
  },
)

export default api
