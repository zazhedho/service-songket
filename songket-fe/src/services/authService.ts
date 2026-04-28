import api from './api'
import {
  buildRequestCacheKey,
  createRequestCacheStore,
  withAuthScopedRequestCache,
} from './requestCache'

const meCache = createRequestCacheStore<any>()

export const login = (email: string, password: string) =>
  api.post('/api/user/login', { email, password })

// Disabled public registration. Users must be created by admin.
// export const register = (body: Record<string, unknown>) => api.post('/api/user/register', body)

export const getMe = () =>
  withAuthScopedRequestCache(
    meCache,
    buildRequestCacheKey('auth_me'),
    () => api.get('/api/user'),
    60 * 1000,
  )
export const updateMe = (body: Record<string, unknown>) => api.put('/api/user', body)
export const changeMyPassword = (body: Record<string, unknown>) =>
  api.put('/api/user/change/password', body)
export const logout = () => api.post('/api/user/logout')

const authService = {
  login,
  // register,
  getMe,
  updateMe,
  changeMyPassword,
  logout,
}

export default authService
