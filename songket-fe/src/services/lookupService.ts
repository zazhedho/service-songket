import api from './api'

export const fetchLookups = () => api.get('/api/lookups')

const lookupService = {
  fetchLookups,
}

export default lookupService
