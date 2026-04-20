import api from './api'

export const fetchCredit = (params?: Record<string, unknown>) => api.get('/api/credits', { params })
export const fetchCreditSummary = () => api.get('/api/credit/summary')
export const fetchCreditWorksheet = (params?: Record<string, unknown>) =>
  api.get('/api/credit/worksheet', { params })
export const upsertCredit = (body: Record<string, unknown>) => api.post('/api/credit', body)

const creditService = {
  fetchCredit,
  fetchCreditSummary,
  fetchCreditWorksheet,
  upsertCredit,
}

export default creditService
