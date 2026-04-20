import api from './api'

export const recomputeQuadrant = (body: Record<string, unknown>) => api.post('/api/quadrant/recompute', body)
export const fetchQuadrants = (params?: Record<string, unknown>) => api.get('/api/quadrants', { params })
export const fetchQuadrantSummary = (params?: Record<string, unknown>) =>
  api.get('/api/quadrant/summary', { params })

const quadrantService = {
  recomputeQuadrant,
  fetchQuadrants,
  fetchQuadrantSummary,
}

export default quadrantService
