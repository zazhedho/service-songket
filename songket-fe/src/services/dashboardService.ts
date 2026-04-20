import api from './api'

export const listDashboardOrders = (params?: Record<string, unknown>) =>
  api.get('/api/dashboard/orders', { params })
export const fetchDashboardSummary = (params?: Record<string, unknown>) =>
  api.get('/api/dashboard/summary', { params })
export const listDashboardNewsItems = (params?: Record<string, unknown>) =>
  api.get('/api/dashboard/news-items', { params })
export const listDashboardPrices = (params?: Record<string, unknown>) =>
  api.get('/api/dashboard/prices', { params })

const dashboardService = {
  listDashboardOrders,
  fetchDashboardSummary,
  listDashboardNewsItems,
  listDashboardPrices,
}

export default dashboardService
