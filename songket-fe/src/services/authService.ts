import api from './api'

export const login = (email: string, password: string) =>
  api.post('/api/user/login', { email, password })

export const register = (body: Record<string, unknown>) => api.post('/api/user/register', body)

export const getMe = () => api.get('/api/user')
export const updateMe = (body: Record<string, unknown>) => api.put('/api/user', body)
export const changeMyPassword = (body: Record<string, unknown>) =>
  api.put('/api/user/change/password', body)
export const logout = () => api.post('/api/user/logout')

const authService = {
  login,
  register,
  getMe,
  updateMe,
  changeMyPassword,
  logout,
}

export default authService
