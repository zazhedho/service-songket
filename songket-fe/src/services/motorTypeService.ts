import api from './api'

export const listMotorTypes = (params?: Record<string, unknown>) => api.get('/api/motor-types', { params })
export const getMotorType = (id: string) => api.get(`/api/motor-type/${id}`)
export const createMotorType = (body: Record<string, unknown>) => api.post('/api/motor-type', body)
export const updateMotorType = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/motor-type/${id}`, body)
export const deleteMotorType = (id: string) => api.delete(`/api/motor-type/${id}`)

const motorTypeService = {
  listMotorTypes,
  getMotorType,
  createMotorType,
  updateMotorType,
  deleteMotorType,
}

export default motorTypeService
