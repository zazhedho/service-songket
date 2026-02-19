import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface Pagination<T> {
  data: T
  total_data: number
  total_pages: number
  current_page: number
}

export const login = (email: string, password: string) =>
  api.post('/api/user/login', { email, password })

export const register = (body: Record<string, unknown>) => api.post('/api/user/register', body)

export const fetchOrders = (params: Record<string, unknown>) => api.get('/api/songket/orders', { params })
export const listDashboardOrders = (params?: Record<string, unknown>) => api.get('/api/songket/dashboard/orders', { params })
export const createOrder = (body: Record<string, unknown>) => api.post('/api/songket/orders', body)
export const updateOrder = (id: string, body: Record<string, unknown>) => api.put(`/api/songket/orders/${id}`, body)
export const deleteOrder = (id: string) => api.delete(`/api/songket/orders/${id}`)

export const listMotorTypes = (params?: Record<string, unknown>) => api.get('/api/songket/motor-types', { params })
export const getMotorType = (id: string) => api.get(`/api/songket/motor-types/${id}`)
export const createMotorType = (body: Record<string, unknown>) => api.post('/api/songket/motor-types', body)
export const updateMotorType = (id: string, body: Record<string, unknown>) => api.put(`/api/songket/motor-types/${id}`, body)
export const deleteMotorType = (id: string) => api.delete(`/api/songket/motor-types/${id}`)

export const listInstallments = (params?: Record<string, unknown>) => api.get('/api/songket/installments', { params })
export const getInstallment = (id: string) => api.get(`/api/songket/installments/${id}`)
export const createInstallment = (body: Record<string, unknown>) => api.post('/api/songket/installments', body)
export const updateInstallment = (id: string, body: Record<string, unknown>) => api.put(`/api/songket/installments/${id}`, body)
export const deleteInstallment = (id: string) => api.delete(`/api/songket/installments/${id}`)

export const getNewsScrapeCronSetting = () => api.get('/api/songket/master-settings/news-scrape-cron')
export const listNewsScrapeCronSettingHistory = (params?: Record<string, unknown>) =>
  api.get('/api/songket/master-settings/news-scrape-cron/history', { params })
export const createNewsScrapeCronSetting = (body: Record<string, unknown>) =>
  api.post('/api/songket/master-settings/news-scrape-cron', body)
export const updateNewsScrapeCronSetting = (body: Record<string, unknown>) =>
  api.put('/api/songket/master-settings/news-scrape-cron', body)
export const deleteNewsScrapeCronSetting = () =>
  api.delete('/api/songket/master-settings/news-scrape-cron')
export const getPriceScrapeCronSetting = () => api.get('/api/songket/master-settings/prices-scrape-cron')
export const listPriceScrapeCronSettingHistory = (params?: Record<string, unknown>) =>
  api.get('/api/songket/master-settings/prices-scrape-cron/history', { params })
export const createPriceScrapeCronSetting = (body: Record<string, unknown>) =>
  api.post('/api/songket/master-settings/prices-scrape-cron', body)
export const updatePriceScrapeCronSetting = (body: Record<string, unknown>) =>
  api.put('/api/songket/master-settings/prices-scrape-cron', body)
export const deletePriceScrapeCronSetting = () =>
  api.delete('/api/songket/master-settings/prices-scrape-cron')

export const fetchDealers = (params?: Record<string, unknown>) => api.get('/api/songket/finance/dealers', { params })
export const fetchFinanceCompanies = (params?: Record<string, unknown>) => api.get('/api/songket/finance/companies', { params })
export const listFinanceMigrationReport = (params?: Record<string, unknown>) =>
  api.get('/api/songket/finance/report/migrations', { params })
export const listFinanceMigrationOrderInDetail = (id: string, params?: Record<string, unknown>) =>
  api.get(`/api/songket/finance/report/migrations/${id}/order-ins`, { params })
export const fetchDealerMetrics = (id: string, params?: Record<string, unknown>) =>
  api.get(`/api/songket/finance/dealers/${id}/metrics`, { params })
export const createDealer = (body: Record<string, unknown>) => api.post('/api/songket/finance/dealers', body)
export const updateDealer = (id: string, body: Record<string, unknown>) => api.put(`/api/songket/finance/dealers/${id}`, body)
export const deleteDealer = (id: string) => api.delete(`/api/songket/finance/dealers/${id}`)
export const createFinanceCompany = (body: Record<string, unknown>) => api.post('/api/songket/finance/companies', body)
export const updateFinanceCompany = (id: string, body: Record<string, unknown>) => api.put(`/api/songket/finance/companies/${id}`, body)
export const deleteFinanceCompany = (id: string) => api.delete(`/api/songket/finance/companies/${id}`)

export const listJobs = (params?: Record<string, unknown>) => api.get('/api/songket/jobs', { params })
export const getJob = (id: string) => api.get(`/api/songket/jobs/${id}`)
export const createJob = (body: Record<string, unknown>) => api.post('/api/songket/jobs', body)
export const updateJob = (id: string, body: Record<string, unknown>) => api.put(`/api/songket/jobs/${id}`, body)
export const deleteJob = (id: string) => api.delete(`/api/songket/jobs/${id}`)

export const listNetIncome = (params?: Record<string, unknown>) => api.get('/api/songket/net-income', { params })
export const getNetIncome = (id: string) => api.get(`/api/songket/net-income/${id}`)
export const createNetIncome = (body: Record<string, unknown>) => api.post('/api/songket/net-income', body)
export const updateNetIncome = (id: string, body: Record<string, unknown>) => api.put(`/api/songket/net-income/${id}`, body)
export const deleteNetIncome = (id: string) => api.delete(`/api/songket/net-income/${id}`)

export const fetchNews = (category?: string) => api.get('/api/songket/news/latest', { params: { category } })
export const listNewsItems = (params?: Record<string, unknown>) => api.get('/api/songket/news/items', { params })
export const listDashboardNewsItems = (params?: Record<string, unknown>) => api.get('/api/songket/dashboard/news-items', { params })
export const deleteNewsItem = (id: string) => api.delete(`/api/songket/news/items/${id}`)
export const listNewsSources = (params?: Record<string, unknown>) => api.get('/api/songket/news/sources', { params })
export const scrapeNews = (body?: Record<string, unknown>) => api.post('/api/songket/news/scrape', body)
export const importNews = (body: Record<string, unknown>) => api.post('/api/songket/news/import', body)
export const fetchPricesLatest = () => api.get('/api/songket/commodities/prices/latest')
export const listDashboardPrices = (params?: Record<string, unknown>) =>
  api.get('/api/songket/dashboard/prices', { params })
export const fetchPriceList = (params?: Record<string, unknown>) =>
  api.get('/api/songket/commodities/prices', { params })
export const listCommodities = () => api.get('/api/songket/commodities')
export const upsertCommodity = (body: Record<string, unknown>) => api.post('/api/songket/commodities', body)
export const addCommodityPrice = (body: Record<string, unknown>) => api.post('/api/songket/commodities/price', body)
export const deletePrice = (id: string) => api.delete(`/api/songket/commodities/prices/${id}`)
export const scrapePrices = (body?: Record<string, unknown>) =>
  api.post('/api/songket/commodities/prices/scrape', body)
export const createScrapeJob = (body: Record<string, unknown>) =>
  api.post('/api/songket/commodities/prices/scrape-jobs', body)
export const listScrapeJobs = (params?: Record<string, unknown>) => api.get('/api/songket/commodities/prices/jobs', { params })
export const fetchScrapeResults = (jobId: string, params?: Record<string, unknown>) =>
  api.get(`/api/songket/commodities/prices/jobs/${jobId}/results`, { params })
export const commitScrapeResults = (jobId: string, result_ids: string[]) =>
  api.post(`/api/songket/commodities/prices/jobs/${jobId}/commit`, { result_ids })

export const fetchCredit = (params?: Record<string, unknown>) => api.get('/api/songket/credit', { params })
export const fetchCreditSummary = () => api.get('/api/songket/credit/summary')
export const fetchCreditWorksheet = (params?: Record<string, unknown>) => api.get('/api/songket/credit/worksheet', { params })
export const upsertCredit = (body: Record<string, unknown>) => api.post('/api/songket/credit', body)

export const recomputeQuadrant = (body: Record<string, unknown>) => api.post('/api/songket/quadrants/recompute', body)
export const fetchQuadrants = (params?: Record<string, unknown>) => api.get('/api/songket/quadrants', { params })
export const fetchQuadrantSummary = () => api.get('/api/songket/quadrants/summary')

export const getMe = () => api.get('/api/user')
export const updateMe = (body: Record<string, unknown>) => api.put('/api/user', body)
export const changeMyPassword = (body: Record<string, unknown>) => api.put('/api/user/change/password', body)
export const fetchLookups = () => api.get('/api/songket/lookups')

// Admin / Superadmin
export const listUsers = (params?: Record<string, unknown>) => api.get('/api/users', { params })
export const adminCreateUser = (body: Record<string, unknown>) => api.post('/api/user', body)
export const updateUserById = (id: string, body: Record<string, unknown>) => api.put(`/api/user/${id}`, body)
export const deleteUserById = (id: string) => api.delete(`/api/user/${id}`)

export const listRoles = (params?: Record<string, unknown>) => api.get('/api/roles', { params })
export const getRoleById = (id: string) => api.get(`/api/role/${id}`)
export const createRole = (body: Record<string, unknown>) => api.post('/api/role', body)
export const updateRole = (id: string, body: Record<string, unknown>) => api.put(`/api/role/${id}`, body)
export const deleteRole = (id: string) => api.delete(`/api/role/${id}`)
export const assignRolePermissions = (id: string, permission_ids: string[]) =>
  api.post(`/api/role/${id}/permissions`, { permission_ids })
export const assignRoleMenus = (id: string, menu_ids: string[]) =>
  api.post(`/api/role/${id}/menus`, { menu_ids })

export const listMenus = (params?: Record<string, unknown>) => api.get('/api/menus', { params })
export const listMyMenus = () => api.get('/api/menus/me')
export const createMenu = (body: Record<string, unknown>) => api.post('/api/menu', body)
export const updateMenu = (id: string, body: Record<string, unknown>) => api.put(`/api/menu/${id}`, body)
export const deleteMenu = (id: string) => api.delete(`/api/menu/${id}`)

export const listPermissions = (params?: Record<string, unknown>) => api.get('/api/permissions', { params })
export const getMyPermissions = () => api.get('/api/permissions/me')
export const getUserPermissions = (userId: string) => api.get(`/api/user/${userId}/permissions`)
export const setUserPermissions = (userId: string, permission_ids: string[]) =>
  api.post(`/api/user/${userId}/permissions`, { permission_ids })

// Scrape sources
export const listScrapeSources = (params?: Record<string, unknown>) => api.get('/api/songket/scrape-sources', { params })
export const createScrapeSource = (body: Record<string, unknown>) => api.post('/api/songket/scrape-sources', body)
export const updateScrapeSource = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/songket/scrape-sources/${id}`, body)
export const deleteScrapeSource = (id: string) => api.delete(`/api/songket/scrape-sources/${id}`)

// Master wilayah
export const fetchProvinces = () => api.get('/api/master/provinsi')
export const fetchKabupaten = (pro: string) => api.get('/api/master/kabupaten', { params: { pro } })
export const fetchKecamatan = (pro: string, kab: string) => api.get('/api/master/kecamatan', { params: { pro, kab } })

export default api
