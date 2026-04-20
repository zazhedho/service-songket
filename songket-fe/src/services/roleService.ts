import api from './api'

export const listRoles = (params?: Record<string, unknown>) => api.get('/api/roles', { params })
export const getRoleById = (id: string) => api.get(`/api/role/${id}`)
export const createRole = (body: Record<string, unknown>) => api.post('/api/role', body)
export const updateRole = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/role/${id}`, body)
export const deleteRole = (id: string) => api.delete(`/api/role/${id}`)
export const assignRolePermissions = (id: string, permission_ids: string[]) =>
  api.post(`/api/role/${id}/permissions`, { permission_ids })

const roleService = {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRolePermissions,
}

export default roleService
