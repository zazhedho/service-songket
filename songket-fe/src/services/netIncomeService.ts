import api from './api'

export const listNetIncome = (params?: Record<string, unknown>) => api.get('/api/net-incomes', { params })
export const getNetIncome = (id: string) => api.get(`/api/net-income/${id}`)
export const createNetIncome = (body: Record<string, unknown>) => api.post('/api/net-income', body)
export const updateNetIncome = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/net-income/${id}`, body)
export const deleteNetIncome = (id: string) => api.delete(`/api/net-income/${id}`)

const netIncomeService = {
  listNetIncome,
  getNetIncome,
  createNetIncome,
  updateNetIncome,
  deleteNetIncome,
}

export default netIncomeService
