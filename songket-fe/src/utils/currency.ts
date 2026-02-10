export function formatRupiah(value: number | string): string {
  const numeric = Number(value)
  const safe = Number.isFinite(numeric) ? numeric : 0
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(safe)
  return `Rp ${formatted}`
}

export function formatRupiahInput(raw: string): string {
  const digits = String(raw || '').replace(/[^\d]/g, '')
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(digits))
}

export function parseRupiahInput(raw: string): number {
  const digits = String(raw || '').replace(/[^\d]/g, '')
  if (!digits) return 0
  const value = Number(digits)
  return Number.isFinite(value) ? value : 0
}
