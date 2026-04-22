import api from './api'

type CachedOrderEntry = {
  order: any
  cachedAt: number
}

const ORDER_CACHE_STORAGE_KEY = 'songket_order_cache_v1'
const ORDER_CACHE_MAX_ITEMS = 250

let orderCacheLoaded = false
const orderCache = new Map<string, CachedOrderEntry>()

function getOrderCacheScopeKey() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

function toOrderCacheKey(id: string) {
  return `${getOrderCacheScopeKey()}::${String(id || '').trim()}`
}

function ensureOrderCacheLoaded() {
  if (orderCacheLoaded || typeof window === 'undefined') return
  orderCacheLoaded = true

  try {
    const raw = sessionStorage.getItem(ORDER_CACHE_STORAGE_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw) as Record<string, CachedOrderEntry>
    Object.entries(parsed || {}).forEach(([key, value]) => {
      if (!key || !value?.order) return
      orderCache.set(key, {
        order: value.order,
        cachedAt: Number(value.cachedAt || 0),
      })
    })
  } catch {
    orderCache.clear()
  }
}

function persistOrderCache() {
  if (typeof window === 'undefined') return
  ensureOrderCacheLoaded()

  const sortedEntries = Array.from(orderCache.entries())
    .sort((left, right) => right[1].cachedAt - left[1].cachedAt)
    .slice(0, ORDER_CACHE_MAX_ITEMS)

  orderCache.clear()
  sortedEntries.forEach(([key, value]) => {
    orderCache.set(key, value)
  })

  const serialized = Object.fromEntries(sortedEntries)
  sessionStorage.setItem(ORDER_CACHE_STORAGE_KEY, JSON.stringify(serialized))
}

export function cacheOrder(order: any) {
  const id = String(order?.id || '').trim()
  if (!id) return

  ensureOrderCacheLoaded()
  orderCache.set(toOrderCacheKey(id), {
    order,
    cachedAt: Date.now(),
  })
  persistOrderCache()
}

export function cacheOrders(orders: any[]) {
  if (!Array.isArray(orders) || orders.length === 0) return
  ensureOrderCacheLoaded()

  orders.forEach((order) => {
    const id = String(order?.id || '').trim()
    if (!id) return
    orderCache.set(toOrderCacheKey(id), {
      order,
      cachedAt: Date.now(),
    })
  })

  persistOrderCache()
}

export function getCachedOrder(id: string) {
  const normalizedID = String(id || '').trim()
  if (!normalizedID) return null

  ensureOrderCacheLoaded()
  const cached = orderCache.get(toOrderCacheKey(normalizedID))
  return cached?.order || null
}

export function removeCachedOrder(id: string) {
  const normalizedID = String(id || '').trim()
  if (!normalizedID) return

  ensureOrderCacheLoaded()
  orderCache.delete(toOrderCacheKey(normalizedID))
  persistOrderCache()
}

export const fetchOrders = (params: Record<string, unknown>) => api.get('/api/orders', { params })
export const startOrderExport = (body: Record<string, unknown>) => api.post('/api/order/export', body)
export const getOrderExportStatus = (id: string) => api.get(`/api/order/export/${id}/status`)
export const downloadOrderExport = (id: string) =>
  api.get(`/api/order/export/${id}/download`, { responseType: 'blob' })
export const createOrder = (body: Record<string, unknown>) => api.post('/api/order', body)
export const updateOrder = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/order/${id}`, body)
export const deleteOrder = (id: string) => api.delete(`/api/order/${id}`)

const orderService = {
  fetchOrders,
  cacheOrder,
  cacheOrders,
  getCachedOrder,
  removeCachedOrder,
  startOrderExport,
  getOrderExportStatus,
  downloadOrderExport,
  createOrder,
  updateOrder,
  deleteOrder,
}

export default orderService
