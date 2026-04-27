import { ReactNode } from 'react'
import dayjs from 'dayjs'

function looksLikeLocationCode(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return false
  if (/^\d+$/.test(raw)) return true
  if (/^[A-Z0-9._-]+$/.test(raw) && !/[a-z]/.test(raw)) return true
  return false
}

export function getAttempt(order: any, attemptNo: number) {
  const attempts = Array.isArray(order?.attempts) ? order.attempts : []
  return attempts.find((attempt: any) => Number(attempt?.attempt_no) === Number(attemptNo)) || null
}

export function normalizeCode(value?: string) {
  return String(value || '').trim().toLowerCase()
}

export function lookupName(list: any[] | undefined, id: string) {
  if (!id) return '-'
  return list?.find((item) => item.id === id)?.name || id
}

export function lookupDisplayName(list: any[] | undefined, id?: string, embeddedName?: string) {
  const name = String(embeddedName || '').trim()
  if (name) return name
  const rawID = String(id || '').trim()
  if (!rawID) return '-'
  return list?.find((item) => item.id === rawID)?.name || '-'
}

export function lookupOptionName(list: any[] | undefined, code?: string) {
  if (!code) return '-'
  const rawCode = String(code).trim()
  const normalized = rawCode.toLowerCase()
  const found =
    list?.find((item: any) => String(item?.code || item?.id || '').trim().toLowerCase() === normalized) ||
    list?.find((item: any) => String(item?.name || '').trim().toLowerCase() === normalized)
  if (found?.name) return found.name
  return looksLikeLocationCode(rawCode) ? '-' : rawCode
}

export function resolveOptionCode(list: any[] | undefined, value?: string) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  const normalized = rawValue.toLowerCase()
  const found =
    list?.find((item: any) => String(item?.code || item?.id || '').trim().toLowerCase() === normalized) ||
    list?.find((item: any) => String(item?.name || '').trim().toLowerCase() === normalized)
  return String(found?.code || found?.id || '').trim()
}

export function formatDate(value?: string) {
  if (!value) return '-'
  return dayjs(value).format('DD MMM YYYY HH:mm')
}

export function DetailTable({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <table className="table responsive-detail polished-detail-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: '44%', textTransform: 'none', letterSpacing: 'normal' }}>{row.label}</th>
            <td style={{ wordBreak: 'break-word' }}>
              <span className="detail-value-strong">{row.value ?? '-'}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
