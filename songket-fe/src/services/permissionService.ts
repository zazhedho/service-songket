import api from './api'

export const listPermissions = (params?: Record<string, unknown>) => api.get('/api/permissions', { params })
export const getMyPermissions = () => api.get('/api/permissions/me')
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
