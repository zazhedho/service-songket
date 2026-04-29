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
const GENERIC_ERROR_MESSAGES = new Set(['something went wrong'])
const INTERNAL_ERROR_PATTERNS = [
  'user=',
  'database=',
  'password=',
  'dial tcp',
  'read tcp',
  'write tcp',
  'failed to connect',
  'startup message',
  'connection reset',
  'no route to host',
  'pq:',
  'pgconn',
  'sql:',
  'gorm',
  'syntax error at or near',
  'violates unique constraint',
  'panic:',
  'runtime error',
  'stack trace',
]

function isAuthRequest(url?: string) {
  // Public register is disabled. Keep path reference if self-registration returns.
  // return Boolean(url && ['/api/user/login', '/api/user/register'].some((path) => url.includes(path)))
  return Boolean(url && url.includes('/api/user/login'))
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/login') return
  window.location.replace('/login')
}

function getErrorMessage(value: any) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && typeof value.message === 'string') return value.message.trim()
  return ''
}

function isGenericErrorMessage(value: string) {
  return GENERIC_ERROR_MESSAGES.has(value.trim().toLowerCase())
}

function isInternalErrorMessage(value: string) {
  const message = value.trim().toLowerCase()
  return INTERNAL_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

function normalizeInternalError(error: any) {
  const status = Number(error?.response?.status || 0)
  if (!status || status < 500) return

  const data = error.response.data || {}
  const responseMessage = getErrorMessage(data.message)
  const responseError = getErrorMessage(data.error)
  const publicMessage =
    (responseMessage && !isGenericErrorMessage(responseMessage) && !isInternalErrorMessage(responseMessage) && responseMessage) ||
    (responseError && !isInternalErrorMessage(responseError) && responseError) ||
    INTERNAL_ERROR_MESSAGE

  error.response.data = {
    ...data,
    message: publicMessage,
    error: publicMessage,
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
