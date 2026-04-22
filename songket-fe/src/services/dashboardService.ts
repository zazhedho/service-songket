import api from './api'
import {
  buildRequestCacheKey,
  createRequestCacheStore,
  withAuthScopedRequestCache,
} from './requestCache'

const dashboardNewsCache = createRequestCacheStore<any>()
const dashboardPricesCache = createRequestCacheStore<any>()

export const listDashboardOrders = (params?: Record<string, unknown>) =>
  api.get('/api/dashboard/orders', { params })
export const fetchDashboardSummary = (params?: Record<string, unknown>) =>
  api.get('/api/dashboard/summary', { params })
export const listDashboardNewsItems = (params?: Record<string, unknown>) =>
  withAuthScopedRequestCache(
    dashboardNewsCache,
    buildRequestCacheKey('dashboard_news_items', params || {}),
    () => api.get('/api/dashboard/news-items', { params }),
    60 * 1000,
  )
export const listDashboardPrices = (params?: Record<string, unknown>) =>
  withAuthScopedRequestCache(
    dashboardPricesCache,
    buildRequestCacheKey('dashboard_prices', params || {}),
    () => api.get('/api/dashboard/prices', { params }),
    60 * 1000,
  )

const dashboardService = {
  listDashboardOrders,
  fetchDashboardSummary,
  listDashboardNewsItems,
  listDashboardPrices,
}

export default dashboardService
