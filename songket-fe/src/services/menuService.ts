import api from './api'

export const listMenus = (params?: Record<string, unknown>) => api.get('/api/menus', { params })
export const listMyMenus = () => api.get('/api/menus/me')
export const listActiveMenus = () => api.get('/api/menus/active')
export const updateMenu = (id: string, body: Record<string, unknown>) =>
  api.put(`/api/menu/${id}`, body)

const menuService = {
  listMenus,
  listMyMenus,
  listActiveMenus,
  updateMenu,
}

export default menuService
