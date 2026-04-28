import api from './api'

export const listScrapeSources = (params?: Record<string, unknown>) =>
  api.get('/api/scrape-sources', { params })
export const createScrapeSource = (body: Record<string, unknown>) => api.post('/api/scrape-source', body)
export const updateScrapeSource = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/scrape-source/${id}`, body)
export const deleteScrapeSource = (id: string) => api.delete(`/api/scrape-source/${id}`)

const scrapeSourceService = {
  listScrapeSources,
  createScrapeSource,
  updateScrapeSource,
  deleteScrapeSource,
}

export default scrapeSourceService
