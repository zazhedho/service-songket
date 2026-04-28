type InstallmentRangeItem = {
  label: string
  total: number
  approve: number
  reject: number
  approval_rate: number
  range_start: number
  range_end: number
  is_product_range?: boolean
  product_range_hit?: number
}

type WorksheetPayload = {
  areas: any[]
  jobs_master: any[]
  motor_types_master: any[]
  installment_range: InstallmentRangeItem[]
  dp_range: any[]
}

export const EMPTY_WORKSHEET: WorksheetPayload = {
  areas: [],
  jobs_master: [],
  motor_types_master: [],
  installment_range: [],
  dp_range: [],
}

export function normalizeWorksheet(raw: unknown): WorksheetPayload {
  const data = (raw || {}) as Partial<WorksheetPayload>
  return {
    areas: Array.isArray(data.areas) ? data.areas : [],
    jobs_master: Array.isArray(data.jobs_master) ? data.jobs_master : [],
    motor_types_master: Array.isArray(data.motor_types_master) ? data.motor_types_master : [],
    installment_range: Array.isArray(data.installment_range) ? data.installment_range : [],
    dp_range: Array.isArray(data.dp_range) ? data.dp_range : [],
  }
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const safeLimit = limit > 0 ? limit : 1
  const totalPages = Math.max(1, Math.ceil(items.length / safeLimit))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * safeLimit
  const end = start + safeLimit
  return {
    pageItems: items.slice(start, end),
    totalPages,
    safePage,
    totalData: items.length,
  }
}

export function rateCellStyle(rate: number) {
  const value = Number(rate || 0)
  if (value > 0.4) {
    return { background: '#fecaca', color: '#b91c1c', fontWeight: 700 }
  }
  if (value > 0.35) {
    return { background: '#fef08a', color: '#a16207', fontWeight: 700 }
  }
  return { background: '#22c55e', color: '#052e16', fontWeight: 700 }
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
    useGrouping: false,
  }).format(Number(value || 0))
}

export function formatPercent(value: number) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`
}

export function formatApprovalRate(value: number) {
  return `${Number(value || 0).toFixed(2)}%`
}

export function formatCompactCurrency(value: number) {
  const numeric = Number(value || 0)
  if (numeric >= 1000000) return `Rp ${(numeric / 1000000).toFixed(2)}M`
  if (numeric >= 1000) return `Rp ${(numeric / 1000).toFixed(0)}K`
  return `Rp ${numeric.toFixed(0)}`
}

export function formatInstallmentRangeLabel(item: InstallmentRangeItem) {
  return `${formatCompactCurrency(item.range_start)} - < ${formatCompactCurrency(item.range_end)}`
}
