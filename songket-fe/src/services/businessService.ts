import api from './api'
import {
  buildRequestCacheKey,
  clearRequestCache,
  createRequestCacheStore,
  withAuthScopedRequestCache,
} from './requestCache'

const dealersListCache = createRequestCacheStore<any>()
const financeCompaniesListCache = createRequestCacheStore<any>()
const allDealerMetricsCache = createRequestCacheStore<any>()
const dealerMetricsCache = createRequestCacheStore<any>()
const financeCompanyMetricsCache = createRequestCacheStore<any>()

export const fetchDealers = (params?: Record<string, unknown>) =>
  withAuthScopedRequestCache(
    dealersListCache,
    buildRequestCacheKey('finance_dealers', params || {}),
    () => api.get('/api/finance/dealers', { params }),
    2 * 60 * 1000,
  )
export const fetchFinanceCompanies = (params?: Record<string, unknown>) =>
  withAuthScopedRequestCache(
    financeCompaniesListCache,
    buildRequestCacheKey('finance_companies', params || {}),
    () => api.get('/api/finance/companies', { params }),
    2 * 60 * 1000,
  )
export const listFinanceMigrationReport = (params?: Record<string, unknown>) =>
  api.get('/api/finance/report/migrations', { params })
export const getFinanceMigrationReportSummary = (params?: Record<string, unknown>) =>
  api.get('/api/finance/report/migrations/summary', { params })
export const listFinanceMigrationOrderInDetail = (id: string, params?: Record<string, unknown>) =>
  api.get(`/api/finance/report/migrations/${id}/order-ins`, { params })
export const getFinanceMigrationOrderInSummary = (id: string, params?: Record<string, unknown>) =>
  api.get(`/api/finance/report/migrations/${id}/order-ins/summary`, { params })
export const fetchAllDealerMetrics = (params?: Record<string, unknown>) =>
  withAuthScopedRequestCache(
    allDealerMetricsCache,
    buildRequestCacheKey('all_dealer_metrics', params || {}),
    () => api.get('/api/finance/dealers/metrics', { params }),
    60 * 1000,
  )
export const fetchDealerMetrics = (id: string, params?: Record<string, unknown>) =>
  withAuthScopedRequestCache(
    dealerMetricsCache,
    buildRequestCacheKey('dealer_metrics', id, params || {}),
    () => api.get(`/api/finance/dealers/${id}/metrics`, { params }),
    60 * 1000,
  )
export const fetchFinanceCompanyMetrics = (id: string, params?: Record<string, unknown>) =>
  withAuthScopedRequestCache(
    financeCompanyMetricsCache,
    buildRequestCacheKey('finance_company_metrics', id, params || {}),
    () => api.get(`/api/finance/companies/${id}/metrics`, { params }),
    60 * 1000,
  )
export const createDealer = (body: Record<string, unknown>) =>
  api.post('/api/finance/dealers', body).finally(() => clearRequestCache(dealersListCache))
export const updateDealer = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/finance/dealers/${id}`, body).finally(() => clearRequestCache(dealersListCache))
export const deleteDealer = (id: string) =>
  api.delete(`/api/finance/dealers/${id}`).finally(() => clearRequestCache(dealersListCache))
export const createFinanceCompany = (body: Record<string, unknown>) =>
  api.post('/api/finance/companies', body).finally(() => clearRequestCache(financeCompaniesListCache))
export const updateFinanceCompany = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/finance/companies/${id}`, body).finally(() => clearRequestCache(financeCompaniesListCache))
export const deleteFinanceCompany = (id: string) =>
  api.delete(`/api/finance/companies/${id}`).finally(() => clearRequestCache(financeCompaniesListCache))

const businessService = {
  fetchDealers,
  fetchFinanceCompanies,
  listFinanceMigrationReport,
  getFinanceMigrationReportSummary,
  listFinanceMigrationOrderInDetail,
  getFinanceMigrationOrderInSummary,
  fetchAllDealerMetrics,
  fetchDealerMetrics,
  fetchFinanceCompanyMetrics,
  createDealer,
  updateDealer,
  deleteDealer,
  createFinanceCompany,
  updateFinanceCompany,
  deleteFinanceCompany,
}

export default businessService
