import api from './api'

export const fetchNews = (category?: string) => api.get('/api/news/latest', { params: { category } })
export const listNewsItems = (params?: Record<string, unknown>) => api.get('/api/news/items', { params })
export const deleteNewsItem = (id: string) => api.delete(`/api/news/items/${id}`)
export const listNewsSources = (params?: Record<string, unknown>) => api.get('/api/news/sources', { params })
export const scrapeNews = (body?: Record<string, unknown>) => api.post('/api/news/scrape', body)
export const importNews = (body: Record<string, unknown>) => api.post('/api/news/import', body)

const newsService = {
  fetchNews,
  listNewsItems,
  deleteNewsItem,
  listNewsSources,
  scrapeNews,
  importNews,
}

export default newsService
