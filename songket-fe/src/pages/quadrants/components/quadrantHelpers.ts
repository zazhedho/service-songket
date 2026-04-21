export function normalizeToken(value?: string) {
  return String(value || '').trim().toLowerCase()
}

export function clampPercent(value: number) {
  const number = Number(value || 0)
  if (number < 0) return 0
  if (number > 100) return 100
  return number
}

export function getOrderInGrowth(item: { order_in_growth_percent?: number; order_in_percent?: number }) {
  const raw = Number(item.order_in_growth_percent ?? item.order_in_percent ?? 0)
  return Number.isFinite(raw) ? raw : 0
}

export function buildAxisTicks(min: number, max: number, targetTickCount = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0]
  if (max <= min) return [min]

  const rawStep = (max - min) / Math.max(1, targetTickCount - 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1e-6))))
  const normalized = rawStep / magnitude

  let step = magnitude
  if (normalized > 5) step = 10 * magnitude
  else if (normalized > 2) step = 5 * magnitude
  else if (normalized > 1) step = 2 * magnitude

  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let value = start; value <= end + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(6)))
  }
  return ticks
}

export function formatAxisPercent(value: number) {
  const abs = Math.abs(value)
  if (Number.isInteger(value) || abs >= 100) return `${value.toFixed(0)}%`
  if (abs >= 10) return `${value.toFixed(1)}%`
  return `${value.toFixed(2)}%`
}

export function quadrantColor(value: number) {
  switch (value) {
    case 1:
      return '#16a34a'
    case 2:
      return '#f59e0b'
    case 3:
      return '#f97316'
    default:
      return '#ef4444'
  }
}

export function buildAnalysisText(item: {
  order_in_growth_percent?: number
  order_in_percent?: number
  total_orders?: number
  order_in_current_total?: number
  order_in_previous_total?: number
  reference_month?: string
  reference_prev_month?: string
  credit_capability?: number
}) {
  const growth = getOrderInGrowth(item)
  const growthText = `${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`
  const currentTotal = Number(item.order_in_current_total ?? item.total_orders ?? 0)
  const previousTotal = Number(item.order_in_previous_total ?? 0)
  const referenceMonth = String(item.reference_month || '-')
  const referencePrevMonth = String(item.reference_prev_month || '-')

  return `Order In ${currentTotal.toLocaleString('id-ID')} unit (${referenceMonth}) vs ${previousTotal.toLocaleString('id-ID')} unit (${referencePrevMonth}), growth ${growthText}, credit capability ${Number(item.credit_capability || 0).toFixed(2)}%.`
}
