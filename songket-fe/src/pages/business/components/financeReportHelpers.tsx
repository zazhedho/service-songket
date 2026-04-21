import { type ReactNode } from 'react'

export function ReportDetailTable({
  rows,
  wrapValue = false,
}: {
  rows: Array<{ label: string; value: ReactNode }>
  wrapValue?: boolean
}) {
  return (
    <table className="table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: 200 }}>{row.label}</th>
            <td
              style={wrapValue
                ? {
                    maxWidth: 'none',
                    whiteSpace: 'normal',
                    overflow: 'visible',
                    textOverflow: 'clip',
                    wordBreak: 'break-word',
                  }
                : undefined}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export type SummaryBucket = {
  label: string
  total: number
}

export type DonutSlice = SummaryBucket & {
  percent: number
  color: string
}

export type DetailFinanceSummary = {
  totalOrders: number
  totalDealers: number
  dealerCoveragePercent: number
  approvedCount: number
  rejectedCount: number
  approvalRate: number
  leadAvgSeconds: number | null
  rescueFc2: number
  dealerTotals: SummaryBucket[]
  motorTypeTotals: SummaryBucket[]
}

export function formatDateTime(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US')
}

export function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function looksLikeLocationCode(value: string) {
  const raw = normalizeText(value)
  if (!raw) return false
  if (/^\d+$/.test(raw)) return true
  if (/^[A-Z0-9._-]+$/.test(raw) && !/[a-z]/.test(raw)) return true
  return false
}

export function summarizeLocation(parts: unknown[]) {
  const text = parts
    .map((part) => normalizeText(part))
    .filter((part) => !looksLikeLocationCode(part))
    .filter(Boolean)
    .join(' / ')
  return text || '-'
}

export function formatDateForQuery(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function truncateTableText(value: unknown, max = 150) {
  const text = normalizeText(value)
  if (!text) return '-'
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

export function toSafeNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatLeadTimeHours(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) return '-'
  return `${(seconds / 3600).toFixed(2)} hours`
}

export function formatCoordinate(value: unknown) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(6)
}

export function buildDonutSlices(buckets: SummaryBucket[], maxSlices = 6): DonutSlice[] {
  const palette = ['#2563eb', '#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#14b8a6']
  if (!Array.isArray(buckets) || buckets.length === 0) return []

  const top = buckets.slice(0, maxSlices)
  const othersTotal = buckets.slice(maxSlices).reduce((sum, item) => sum + Number(item.total || 0), 0)
  const merged = othersTotal > 0 ? [...top, { label: 'Others', total: othersTotal }] : top
  const total = merged.reduce((sum, item) => sum + Number(item.total || 0), 0)

  return merged.map((item, idx) => ({
    label: item.label,
    total: Number(item.total || 0),
    percent: total > 0 ? (Number(item.total || 0) / total) * 100 : 0,
    color: palette[idx % palette.length],
  }))
}

export function buildDonutGradient(slices: DonutSlice[]) {
  if (!Array.isArray(slices) || slices.length === 0) return '#e2e8f0'
  let start = 0
  const segments = slices.map((slice) => {
    const end = start + slice.percent
    const segment = `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`
    start = end
    return segment
  })
  return `conic-gradient(${segments.join(', ')})`
}

export function lookupOptionName(options: Array<{ code: string; name: string }>, codeOrName: string) {
  const needle = normalizeText(codeOrName)
  if (!needle) return '-'
  const found = options.find((opt) => normalizeText(opt.code) === needle)
  if (found) return normalizeText(found.name) || needle
  return looksLikeLocationCode(needle) ? '-' : needle
}

export function statusBadge(status: string) {
  const s = String(status || '').toLowerCase().trim()
  if (!s) return '-'
  return <span className={`badge ${s}`}>{s}</span>
}
