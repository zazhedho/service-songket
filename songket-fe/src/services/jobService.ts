import api from './api'

export const listJobs = (params?: Record<string, unknown>) => api.get('/api/jobs', { params })
export const getJob = (id: string) => api.get(`/api/job/${id}`)
export const createJob = (body: Record<string, unknown>) => api.post('/api/job', body)
export const updateJob = (id: string, body: Record<string, unknown>) => api.put(`/api/job/${id}`, body)
export const deleteJob = (id: string) => api.delete(`/api/job/${id}`)

const jobService = {
  listJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
}

export default jobService
