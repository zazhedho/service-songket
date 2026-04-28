import api from './api'

export const getNewsScrapeCronSetting = () => api.get('/api/master-setting/news-scrape-cron')
export const listNewsScrapeCronSettingHistory = (params?: Record<string, unknown>) =>
  api.get('/api/master-setting/news-scrape-cron/history', { params })
export const createNewsScrapeCronSetting = (body: Record<string, unknown>) =>
  api.post('/api/master-setting/news-scrape-cron', body)
export const updateNewsScrapeCronSetting = (body: Record<string, unknown>) =>
  api.put('/api/master-setting/news-scrape-cron', body)
export const deleteNewsScrapeCronSetting = () =>
  api.delete('/api/master-setting/news-scrape-cron')
export const getPriceScrapeCronSetting = () => api.get('/api/master-setting/prices-scrape-cron')
export const listPriceScrapeCronSettingHistory = (params?: Record<string, unknown>) =>
  api.get('/api/master-setting/prices-scrape-cron/history', { params })
export const createPriceScrapeCronSetting = (body: Record<string, unknown>) =>
  api.post('/api/master-setting/prices-scrape-cron', body)
export const updatePriceScrapeCronSetting = (body: Record<string, unknown>) =>
  api.put('/api/master-setting/prices-scrape-cron', body)
export const deletePriceScrapeCronSetting = () =>
  api.delete('/api/master-setting/prices-scrape-cron')

const masterSettingService = {
  getNewsScrapeCronSetting,
  listNewsScrapeCronSettingHistory,
  createNewsScrapeCronSetting,
  updateNewsScrapeCronSetting,
  deleteNewsScrapeCronSetting,
  getPriceScrapeCronSetting,
  listPriceScrapeCronSettingHistory,
  createPriceScrapeCronSetting,
  updatePriceScrapeCronSetting,
  deletePriceScrapeCronSetting,
}

export default masterSettingService
