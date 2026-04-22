import api from './api'
import {
  buildRequestCacheKey,
  createRequestCacheStore,
  withAuthScopedRequestCache,
} from './requestCache'

const permissionsListCache = createRequestCacheStore<any>()
const myPermissionsCache = createRequestCacheStore<any>()

export const listPermissions = (params?: Record<string, unknown>) =>
  withAuthScopedRequestCache(
    permissionsListCache,
    buildRequestCacheKey('permissions', params || {}),
    () => api.get('/api/permissions', { params }),
    5 * 60 * 1000,
  )
export const getMyPermissions = () =>
  withAuthScopedRequestCache(
    myPermissionsCache,
    buildRequestCacheKey('my_permissions'),
    () => api.get('/api/permissions/me'),
    60 * 1000,
  )
export const getUserPermissions = (userId: string) => api.get(`/api/user/${userId}/permissions`)
export const setUserPermissions = (userId: string, permission_ids: string[]) =>
  api.post(`/api/user/${userId}/permissions`, { permission_ids })

const permissionService = {
  listPermissions,
  getMyPermissions,
  getUserPermissions,
  setUserPermissions,
}

export default permissionService
