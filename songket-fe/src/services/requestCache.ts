type CacheEntry<T> = {
  expiresAt: number
  value: T
}

type RequestCacheStore<T> = {
  inflight: Map<string, Promise<T>>
  values: Map<string, CacheEntry<T>>
}

function getAuthScopeKey() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

function stableSerialize(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, entryValue]) => `${key}:${stableSerialize(entryValue)}`).join(',')}}`
  }
  return String(value)
}

export function buildRequestCacheKey(...parts: unknown[]) {
  return parts.map(stableSerialize).join('|')
}

export function createRequestCacheStore<T>(): RequestCacheStore<T> {
  return {
    inflight: new Map<string, Promise<T>>(),
    values: new Map<string, CacheEntry<T>>(),
  }
}

export function clearRequestCache(store: RequestCacheStore<unknown>) {
  store.inflight.clear()
  store.values.clear()
}

export function withAuthScopedRequestCache<T>(
  store: RequestCacheStore<T>,
  key: string,
  factory: () => Promise<T>,
  ttlMs = 5 * 60 * 1000,
) {
  const cacheKey = `${getAuthScopeKey()}::${key}`
  const now = Date.now()
  const cached = store.values.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.value)
  }

  const inflight = store.inflight.get(cacheKey)
  if (inflight) {
    return inflight
  }

  const request = factory()
    .then((response) => {
      store.values.set(cacheKey, {
        value: response,
        expiresAt: now + ttlMs,
      })
      return response
    })
    .catch((error) => {
      store.values.delete(cacheKey)
      throw error
    })
    .finally(() => {
      store.inflight.delete(cacheKey)
    })

  store.inflight.set(cacheKey, request)
  return request
}
