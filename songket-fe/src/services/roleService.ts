import api from './api'
import {
  buildRequestCacheKey,
  clearRequestCache,
  createRequestCacheStore,
  withAuthScopedRequestCache,
} from './requestCache'

const rolesListCache = createRequestCacheStore<any>()

export const listRoles = (params?: Record<string, unknown>) =>
  withAuthScopedRequestCache(
    rolesListCache,
    buildRequestCacheKey('roles', params || {}),
    () => api.get('/api/roles', { params }),
    2 * 60 * 1000,
  )
export const getRoleById = (id: string) => api.get(`/api/role/${id}`)
export const createRole = (body: Record<string, unknown>) =>
  api.post('/api/role', body).finally(() => clearRequestCache(rolesListCache))
export const updateRole = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/role/${id}`, body).finally(() => clearRequestCache(rolesListCache))
export const deleteRole = (id: string) =>
  api.delete(`/api/role/${id}`).finally(() => clearRequestCache(rolesListCache))
export const assignRolePermissions = (id: string, permission_ids: string[]) =>
  api.post(`/api/role/${id}/permissions`, { permission_ids }).finally(() => clearRequestCache(rolesListCache))

const roleService = {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRolePermissions,
}

export default roleService
