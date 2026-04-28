export function resolveErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  const candidate = (error as any)?.response?.data?.error
    ?? (error as any)?.response?.data?.message
    ?? (error as any)?.error
    ?? (error as any)?.message
    ?? error

  if (typeof candidate === 'string') {
    return candidate.trim() || fallback
  }

  if (candidate && typeof candidate === 'object') {
    const nestedMessage = (candidate as any).message || (candidate as any).error
    if (typeof nestedMessage === 'string') {
      return nestedMessage.trim() || fallback
    }
  }

  return fallback
}
