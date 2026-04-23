export const MAX_CURRENCY_DIGITS = 12
export const MAX_CURRENCY_INPUT_LENGTH = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
  .format(Number('9'.repeat(MAX_CURRENCY_DIGITS)))
  .length

function sanitizeCurrencyDigits(raw: string) {
  return String(raw || '')
    .replace(/[^\d]/g, '')
    .slice(0, MAX_CURRENCY_DIGITS)
}

export function formatRupiah(value: number | string): string {
  const numeric = Number(value)
  const safe = Number.isFinite(numeric) ? numeric : 0
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(safe)
  return `Rp ${formatted}`
}

export function formatRupiahInput(raw: string): string {
  const digits = sanitizeCurrencyDigits(raw)
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(digits))
}

export function parseRupiahInput(raw: string): number {
  const digits = sanitizeCurrencyDigits(raw)
  if (!digits) return 0
  const value = Number(digits)
  return Number.isFinite(value) ? value : 0
}
