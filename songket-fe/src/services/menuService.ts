import api from './api'

type MenuResponse = Awaited<ReturnType<typeof api.get>>

let myMenusCacheToken = ''
let myMenusCacheResponse: MenuResponse | null = null
let myMenusCachePromise: Promise<MenuResponse> | null = null

export const listMenus = (params?: Record<string, unknown>) => api.get('/api/menus', { params })
export const listMyMenus = () => {
  const token = localStorage.getItem('token') || ''
  if (myMenusCacheToken === token && myMenusCacheResponse) {
    return Promise.resolve(myMenusCacheResponse)
  }
  if (myMenusCacheToken === token && myMenusCachePromise) {
    return myMenusCachePromise
  }

  myMenusCacheToken = token
  myMenusCachePromise = api.get('/api/menus/me')
    .then((res) => {
      myMenusCacheResponse = res
      return res
    })
    .catch((err) => {
      if (myMenusCacheToken === token) {
        myMenusCacheResponse = null
      }
      throw err
    })
    .finally(() => {
      if (myMenusCacheToken === token) {
        myMenusCachePromise = null
      }
    })

  return myMenusCachePromise
}
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
