import api from './api'

export const fetchPricesLatest = () => api.get('/api/commodity/prices/latest')
export const fetchPriceList = (params?: Record<string, unknown>) => api.get('/api/commodity/prices', { params })
export const listCommodities = () => api.get('/api/commodities')
export const upsertCommodity = (body: Record<string, unknown>) => api.post('/api/commodity', body)
export const addCommodityPrice = (body: Record<string, unknown>) => api.post('/api/commodity/price', body)
export const deletePrice = (id: string) => api.delete(`/api/commodity/prices/${id}`)
export const scrapePrices = (body?: Record<string, unknown>) =>
  api.post('/api/commodity/prices/scrape', body)
export const createScrapeJob = (body: Record<string, unknown>) =>
  api.post('/api/commodity/prices/scrape-jobs', body)
export const listScrapeJobs = (params?: Record<string, unknown>) =>
  api.get('/api/commodity/prices/jobs', { params })
export const fetchScrapeResults = (jobId: string, params?: Record<string, unknown>) =>
  api.get(`/api/commodity/prices/jobs/${jobId}/results`, { params })
export const commitScrapeResults = (jobId: string, result_ids: string[]) =>
  api.post(`/api/commodity/prices/jobs/${jobId}/commit`, { result_ids })

const commodityService = {
  fetchPricesLatest,
  fetchPriceList,
  listCommodities,
  upsertCommodity,
  addCommodityPrice,
  deletePrice,
  scrapePrices,
  createScrapeJob,
  listScrapeJobs,
  fetchScrapeResults,
  commitScrapeResults,
}

export default commodityService
