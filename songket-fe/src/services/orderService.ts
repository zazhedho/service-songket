import api from './api'

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
  startOrderExport,
  getOrderExportStatus,
  downloadOrderExport,
  createOrder,
  updateOrder,
  deleteOrder,
}

export default orderService
