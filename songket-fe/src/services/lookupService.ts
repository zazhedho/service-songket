import api from './api'
import {
  buildRequestCacheKey,
  createRequestCacheStore,
  withAuthScopedRequestCache,
} from './requestCache'

const lookupsCache = createRequestCacheStore<any>()

export const fetchLookups = () =>
  withAuthScopedRequestCache(
    lookupsCache,
    buildRequestCacheKey('lookups'),
    () => api.get('/api/lookups'),
    5 * 60 * 1000,
  )

const lookupService = {
  fetchLookups,
}

export default lookupService
