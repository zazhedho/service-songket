import api from './api'

export const listUsers = (params?: Record<string, unknown>) => api.get('/api/users', { params })
export const adminCreateUser = (body: Record<string, unknown>) => api.post('/api/user', body)
export const updateUserById = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/user/${id}`, body)
export const deleteUserById = (id: string) => api.delete(`/api/user/${id}`)

const userService = {
  listUsers,
  adminCreateUser,
  updateUserById,
  deleteUserById,
}

export default userService
