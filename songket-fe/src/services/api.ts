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

const INTERNAL_ERROR_MESSAGE = 'Something went wrong. Please contact support with the log ID.'

function isAuthRequest(url?: string) {
  return Boolean(url && ['/api/user/login', '/api/user/register'].some((path) => url.includes(path)))
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/login') return
  window.location.replace('/login')
}

function normalizeInternalError(error: any) {
  const status = Number(error?.response?.status || 0)
  if (!status || status < 500) return

  const data = error.response.data || {}
  error.response.data = {
    ...data,
    message: data.message || INTERNAL_ERROR_MESSAGE,
    error: data.error?.message || INTERNAL_ERROR_MESSAGE,
  }
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

    normalizeInternalError(error)

    return Promise.reject(error)
  },
)

export default api
