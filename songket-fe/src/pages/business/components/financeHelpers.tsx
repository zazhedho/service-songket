export type Option = { code: string; name: string }
export type DealerLocationNames = { province: string; regency: string; district: string }
export type CompanyLocationNames = { regency: string }

export type DealerForm = {
  name: string
  province: string
  regency: string
  district: string
  village: string
  phone: string
  address: string
  lat: string
  lng: string
}

export type FinanceForm = {
  name: string
  province: string
  regency: string
  district: string
  village: string
  phone: string
  address: string
}

export type CompanyDealerRow = {
  dealer_id: string
  dealer_name: string
  total_orders: number
  approval_rate: number
  lead_time_seconds_avg: number | null
  rescue_approved_fc2: number
}

export type CompanySummary = {
  total_orders: number
  approval_rate: number
  lead_time_seconds_avg: number | null
  rescue_approved_fc2: number
  active_dealers: number
  dealer_rows: CompanyDealerRow[]
}

export const initialDealerForm: DealerForm = {
  name: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  phone: '',
  address: '',
  lat: '',
  lng: '',
}

export const initialFinanceForm: FinanceForm = {
  name: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  phone: '',
  address: '',
}

export const INDONESIA_CENTER: [number, number] = [-2.5489, 118.0149]

export function parseFinanceMode(pathname: string) {
  if (pathname === '/dealer/dealers/create' || pathname === '/business/dealer/dealers/create') return 'dealer_create'
  if (/^(\/dealer|\/business\/dealer)\/dealers\/[^/]+\/edit$/.test(pathname)) return 'dealer_edit'
  if (/^(\/dealer|\/business\/dealer)\/dealers\/[^/]+$/.test(pathname)) return 'dealer_detail'
  if (pathname === '/finance/companies/create' || pathname === '/business/finance/companies/create') return 'company_create'
  if (/^(\/finance|\/business\/finance)\/companies\/[^/]+\/edit$/.test(pathname)) return 'company_edit'
  if (/^(\/finance|\/business\/finance)\/companies\/[^/]+$/.test(pathname)) return 'company_detail'
  return 'list'
}

export function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #dbe3ef' }}>
      <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 19 }}>{value}</div>
    </div>
  )
}

export function DetailTable({ rows }: { rows: Array<{ label: string; value: any }> }) {
  return (
    <table className="table responsive-detail polished-detail-table" style={{ marginTop: 10 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: '36%', textTransform: 'none', letterSpacing: 'normal' }}>{row.label}</th>
            <td style={{ wordBreak: 'break-word' }}>
              <span className="detail-value-strong">{row.value ?? '-'}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function resolveOptionNameValue(list: Option[] | undefined, value?: string) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  const normalized = rawValue.toLowerCase()
  const found =
    list?.find((item) => String(item?.code || '').trim().toLowerCase() === normalized) ||
    list?.find((item) => String(item?.name || '').trim().toLowerCase() === normalized)
  return found?.name || rawValue
}

function looksLikeLocationCode(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return false
  if (/^\d+$/.test(raw)) return true
  if (/^[A-Z0-9._-]+$/.test(raw) && !/[a-z]/.test(raw)) return true
  return false
}

export function findOptionCodeByValue(list: Option[] | undefined, value?: string) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  const normalized = rawValue.toLowerCase()
  const foundByCode = list?.find((item) => String(item?.code || '').trim().toLowerCase() === normalized)
  if (foundByCode?.code) return String(foundByCode.code)

  const normalizedName = normalizeLocationName(rawValue)
  const foundByName = list?.find((item) => normalizeLocationName(item?.name) === normalizedName)
  if (foundByName?.code) return String(foundByName.code)

  return ''
}

export function lookupOptionName(list: Option[] | undefined, code?: string) {
  const resolved = resolveOptionNameValue(list, code)
  if (!resolved) return '-'
  return looksLikeLocationCode(resolved) ? '-' : resolved
}

export function formatDealerLocationSummary(dealer: any, names?: DealerLocationNames) {
  const normalizeValue = (value: unknown) => {
    const text = String(value || '').trim()
    if (!text || text === '-' || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') {
      return ''
    }
    if (looksLikeLocationCode(text)) {
      return ''
    }
    return text
  }

  const address = normalizeValue(dealer?.address)
  const village = normalizeValue(dealer?.village)
  const district = normalizeValue(names?.district || dealer?.district)
  const regency = normalizeValue(names?.regency || dealer?.regency)
  const province = normalizeValue(names?.province || dealer?.province)

  const parts = [address, village, district, regency, province].filter(Boolean)
  return parts.join(', ') || '-'
}

export function findOptionCodeByNames(list: Option[] | undefined, names: Array<string | undefined>) {
  const options = Array.isArray(list) ? list : []
  const candidates = names
    .map((name) => normalizeLocationName(name))
    .filter(Boolean)

  if (!candidates.length || !options.length) return ''

  for (const candidate of candidates) {
    const exact = options.find((item) => normalizeLocationName(item?.name) === candidate)
    if (exact?.code) return String(exact.code)
  }

  let bestCode = ''
  let bestScore = 0

  for (const candidate of candidates) {
    const candidateTokens = tokenizeLocationName(candidate)
    if (!candidateTokens.length) continue

    const genericSingleToken = candidateTokens.length === 1 && isGenericLocationToken(candidateTokens[0])

    for (const option of options) {
      const optionName = normalizeLocationName(option?.name)
      const optionTokens = tokenizeLocationName(optionName)
      if (!optionTokens.length) continue

      const matched = candidateTokens.filter((token) => optionTokens.includes(token)).length
      if (matched === 0) continue

      const coverage = matched / candidateTokens.length
      const density = matched / optionTokens.length
      let score = coverage * 70 + density * 30

      if (candidateTokens.length >= 2 && coverage >= 0.75) score += 15
      if (!genericSingleToken && candidate.length >= 6 && optionName.includes(candidate)) score += 10
      if (genericSingleToken && coverage < 1) continue

      if (score > bestScore && option?.code) {
        bestScore = score
        bestCode = String(option.code)
      }
    }
  }

  return bestScore >= 55 ? bestCode : ''
}

export function normalizeLocationName(value?: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\(/g, ' ')
    .replace(/\)/g, ' ')
    .replace(/\./g, ' ')
    .replace(/,/g, ' ')
    .replace(/\badministrasi\b/g, ' ')
    .replace(/\badm\b/g, ' ')
    .replace(/\bkotamadya\b/g, ' ')
    .replace(/\bkab\s*adm\b/g, ' ')
    .replace(/\bkota\s*adm\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^provinsi\s+/, '')
    .replace(/^prov\s+/, '')
    .replace(/^kota administrasi\s+/, '')
    .replace(/^kabupaten administrasi\s+/, '')
    .replace(/^kabupaten\s+/, '')
    .replace(/^kab\s+/, '')
    .replace(/^kab\s*\.\s+/, '')
    .replace(/^kota\s+/, '')
    .replace(/^kecamatan\s+/, '')
    .replace(/^kec\s+/, '')
    .replace(/^daerah khusus ibukota\s+/, '')
    .replace(/^daerah istimewa\s+/, '')
    .replace(/^dki\s+/, '')
    .replace(/^di\s+/, '')
}

export function firstFilled(values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = String(value || '').trim()
    if (trimmed) return trimmed
  }
  return ''
}

export function tokenizeLocationName(value?: string) {
  return normalizeLocationName(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
}

export function isGenericLocationToken(token: string) {
  const generic = new Set([
    'jawa',
    'sumatera',
    'kalimantan',
    'sulawesi',
    'papua',
    'nusa',
    'kepulauan',
    'daerah',
    'khusus',
    'ibukota',
    'provinsi',
    'kota',
    'kabupaten',
    'kecamatan',
    'indonesia',
  ])
  return generic.has(String(token || '').trim())
}

export function splitDisplayAddressSegments(displayAddress: string) {
  return String(displayAddress || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function hasRegionAddressFields(address: Record<string, any>) {
  if (!address || typeof address !== 'object') return false
  return Boolean(
    firstFilled([
      address.state,
      address.province,
      address.region,
      address.state_district,
      address.city,
      address.county,
      address.municipality,
      address.regency,
      address.city_district,
      address.district,
    ]),
  )
}

export function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US')
}

export function formatLeadTimeHours(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) return '-'
  return (seconds / 3600).toFixed(2)
}

export function roundCoordinate(value: number) {
  return Number(value.toFixed(6))
}

export function parseCoordinateValue(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return Number.NaN
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}
