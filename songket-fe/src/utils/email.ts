export function normalizeEmailInput(value: string) {
  return String(value || '').toLowerCase()
}
