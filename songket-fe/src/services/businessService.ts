import api from './api'

export const fetchDealers = (params?: Record<string, unknown>) => api.get('/api/finance/dealers', { params })
export const fetchFinanceCompanies = (params?: Record<string, unknown>) =>
  api.get('/api/finance/companies', { params })
export const listFinanceMigrationReport = (params?: Record<string, unknown>) =>
  api.get('/api/finance/report/migrations', { params })
export const listFinanceMigrationOrderInDetail = (id: string, params?: Record<string, unknown>) =>
  api.get(`/api/finance/report/migrations/${id}/order-ins`, { params })
export const fetchDealerMetrics = (id: string, params?: Record<string, unknown>) =>
  api.get(`/api/finance/dealers/${id}/metrics`, { params })
export const createDealer = (body: Record<string, unknown>) => api.post('/api/finance/dealers', body)
export const updateDealer = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/finance/dealers/${id}`, body)
export const deleteDealer = (id: string) => api.delete(`/api/finance/dealers/${id}`)
export const createFinanceCompany = (body: Record<string, unknown>) =>
  api.post('/api/finance/companies', body)
export const updateFinanceCompany = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/finance/companies/${id}`, body)
export const deleteFinanceCompany = (id: string) => api.delete(`/api/finance/companies/${id}`)

const businessService = {
  fetchDealers,
  fetchFinanceCompanies,
  listFinanceMigrationReport,
  listFinanceMigrationOrderInDetail,
  fetchDealerMetrics,
  createDealer,
  updateDealer,
  deleteDealer,
  createFinanceCompany,
  updateFinanceCompany,
  deleteFinanceCompany,
}

export default businessService
