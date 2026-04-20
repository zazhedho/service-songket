import api from './api'

export const listInstallments = (params?: Record<string, unknown>) => api.get('/api/installments', { params })
export const getInstallment = (id: string) => api.get(`/api/installment/${id}`)
export const createInstallment = (body: Record<string, unknown>) => api.post('/api/installment', body)
export const updateInstallment = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/installment/${id}`, body)
export const deleteInstallment = (id: string) => api.delete(`/api/installment/${id}`)

const installmentService = {
  listInstallments,
  getInstallment,
  createInstallment,
  updateInstallment,
  deleteInstallment,
}

export default installmentService
