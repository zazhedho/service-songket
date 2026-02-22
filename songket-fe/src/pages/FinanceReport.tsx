import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchFinanceCompanies,
  fetchKabupaten,
  fetchKecamatan,
  fetchProvinces,
  listFinanceMigrationOrderInDetail,
  listFinanceMigrationReport,
} from '../api'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'
import { formatRupiah } from '../utils/currency'

type FinanceMigrationRow = {
  order_id: string
  pooling_number: string
  pooling_at: string
  result_at?: string
  dealer_order_total?: number
  transition_total_data?: number
  dealer_name: string
  dealer_province?: string
  dealer_regency?: string
  dealer_district?: string
  dealer_village?: string
  dealer_address?: string
  consumer_name: string
  consumer_phone: string
  province: string
  regency: string
  district: string
  village: string
  address: string
  job_name: string
  net_income?: number
  motor_type_name: string
  installment_amount?: number
  otr: number
  dp_gross: number
  dp_paid: number
  dp_pct: number
  tenor: number
  order_result_status: string
  order_result_notes: string
  finance_1_name: string
  finance_1_status: string
  finance_1_notes?: string
  finance_2_name: string
  finance_2_status: string
  finance_2_notes: string
  total_approve_finance_2?: number
  total_reject_finance_2?: number
  order_created_at?: string
  order_updated_at?: string
  finance_1_decision_at?: string
  finance_2_decision_at?: string
}

type OptionItem = {
  code: string
  name: string
}

type LocationNames = {
  province: string
  regency: string
  district: string
}

type SummaryBucket = {
  label: string
  total: number
}

type DonutSlice = SummaryBucket & {
  percent: number
  color: string
}

type DetailFinanceSummary = {
  totalOrders: number
  totalDealers: number
  dealerCoveragePercent: number
  approvedCount: number
  rejectedCount: number
  approvalRate: number
  leadAvgSeconds: number | null
  rescueFc2: number
  locationTotals: SummaryBucket[]
  motorTypeTotals: SummaryBucket[]
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US')
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function truncateTableText(value: unknown, max = 150) {
  const text = normalizeText(value)
  if (!text) return '-'
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

function toTopBuckets(counter: Record<string, number>, maxItems = 8): SummaryBucket[] {
  return Object.entries(counter)
    .map(([label, total]) => ({ label, total: Number(total || 0) }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, maxItems)
}

function buildDonutSlices(buckets: SummaryBucket[], maxSlices = 6): DonutSlice[] {
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

function buildDonutGradient(slices: DonutSlice[]) {
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

function buildDetailFinanceSummary(rows: FinanceMigrationRow[], provinceNameMap: Record<string, string> = {}): DetailFinanceSummary {
  const validRows = Array.isArray(rows) ? rows : []
  const totalOrders = validRows.length

  const dealerSet = new Set(
    validRows
      .map((row) => normalizeText(row.dealer_name).toLowerCase())
      .filter(Boolean),
  )

  const approveStatuses = new Set(['approve', 'approved', 'success'])
  const rejectStatuses = new Set(['reject', 'rejected', 'error'])

  let approvedCount = 0
  let rejectedCount = 0
  let rescueFc2 = 0
  let leadSumSeconds = 0
  let leadCount = 0

  const locationCounter: Record<string, number> = {}
  const motorTypeCounter: Record<string, number> = {}

  validRows.forEach((row) => {
    const finance2Status = normalizeText(row.finance_2_status).toLowerCase()
    const finance1Status = normalizeText(row.finance_1_status).toLowerCase()

    if (approveStatuses.has(finance2Status)) approvedCount += 1
    if (rejectStatuses.has(finance2Status)) rejectedCount += 1
    if (finance1Status === 'reject' && approveStatuses.has(finance2Status)) rescueFc2 += 1

    const poolingTime = new Date(row.pooling_at).getTime()
    const leadEndRaw = row.result_at || row.finance_2_decision_at || row.order_updated_at
    const leadEndTime = leadEndRaw ? new Date(leadEndRaw).getTime() : NaN
    if (Number.isFinite(poolingTime) && Number.isFinite(leadEndTime) && leadEndTime >= poolingTime) {
      leadSumSeconds += (leadEndTime - poolingTime) / 1000
      leadCount += 1
    }

    const provinceCode = normalizeText(row.province)
    const province = provinceNameMap[provinceCode] || provinceCode || '-'
    locationCounter[province] = (locationCounter[province] || 0) + 1

    const motorType = normalizeText(row.motor_type_name) || '-'
    motorTypeCounter[motorType] = (motorTypeCounter[motorType] || 0) + 1
  })

  return {
    totalOrders,
    totalDealers: dealerSet.size,
    dealerCoveragePercent: totalOrders > 0 ? (dealerSet.size / totalOrders) * 100 : 0,
    approvedCount,
    rejectedCount,
    approvalRate: totalOrders > 0 ? approvedCount / totalOrders : 0,
    leadAvgSeconds: leadCount > 0 ? leadSumSeconds / leadCount : null,
    rescueFc2,
    locationTotals: toTopBuckets(locationCounter),
    motorTypeTotals: toTopBuckets(motorTypeCounter),
  }
}

function lookupOptionName(options: OptionItem[], codeOrName: string) {
  const needle = normalizeText(codeOrName)
  if (!needle) return '-'
  const found = options.find((opt) => normalizeText(opt.code) === needle)
  if (found) return normalizeText(found.name) || needle
  return needle
}

function statusBadge(status: string) {
  const s = String(status || '').toLowerCase().trim()
  if (!s) return '-'
  return <span className={`badge ${s}`}>{s}</span>
}

function DetailTable({
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

export default function FinanceReportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const selectedId = params.id || ''
  const isDetail = Boolean(selectedId)
  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_finance_dealers')
  const stateRow = (location.state as any)?.row as FinanceMigrationRow | undefined

  const [rows, setRows] = useState<FinanceMigrationRow[]>([])
  const [detailRow, setDetailRow] = useState<FinanceMigrationRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationNamesByOrderId, setLocationNamesByOrderId] = useState<Record<string, LocationNames>>({})

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalData, setTotalData] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [searchInput, setSearchInput] = useState('')
  const [monthInput, setMonthInput] = useState('')
  const [yearInput, setYearInput] = useState('')
  const [finance1Input, setFinance1Input] = useState('')
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [finance1, setFinance1] = useState('')
  const [finance1Options, setFinance1Options] = useState<OptionItem[]>([])
  const [detailOrderInRows, setDetailOrderInRows] = useState<FinanceMigrationRow[]>([])
  const [detailOrderInLoading, setDetailOrderInLoading] = useState(false)
  const [detailOrderInError, setDetailOrderInError] = useState('')
  const [detailOrderInPage, setDetailOrderInPage] = useState(1)
  const [detailOrderInLimit, setDetailOrderInLimit] = useState(10)
  const [detailOrderInTotalData, setDetailOrderInTotalData] = useState(0)
  const [detailOrderInTotalPages, setDetailOrderInTotalPages] = useState(1)
  const [detailOrderInSearchInput, setDetailOrderInSearchInput] = useState('')
  const [detailOrderInSearch, setDetailOrderInSearch] = useState('')
  const [selectedOrderInRow, setSelectedOrderInRow] = useState<FinanceMigrationRow | null>(null)
  const [detailFinanceSummary, setDetailFinanceSummary] = useState<DetailFinanceSummary | null>(null)
  const [detailFinanceSummaryLoading, setDetailFinanceSummaryLoading] = useState(false)
  const [detailFinanceSummaryError, setDetailFinanceSummaryError] = useState('')

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, idx) => String(now - idx))
  }, [])

  const loadList = async () => {
    if (!canList) return
    setLoading(true)
    setError('')

    try {
      const params: Record<string, unknown> = {
        page,
        limit,
        order_by: 'finance_2_decision',
        order_direction: 'desc',
      }
      const filters: Record<string, unknown> = {}

      if (search.trim()) params.search = search.trim()
      if (month) params.month = Number(month)
      if (year) params.year = Number(year)
      if (finance1) filters.finance_1_company_id = finance1
      if (Object.keys(filters).length > 0) params.filters = filters

      const res = await listFinanceMigrationReport(params)
      const payload = res?.data || {}
      const data = payload?.data || []

      setRows(Array.isArray(data) ? data : [])
      setTotalPages(Number(payload?.total_pages || 1))
      setTotalData(Number(payload?.total_data || 0))
      setPage(Number(payload?.current_page || page))
    } catch (err: any) {
      setRows([])
      setTotalPages(1)
      setTotalData(0)
      setError(err?.response?.data?.error || 'Failed to load finance migration report.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isDetail) return
    void loadList()
  }, [canList, isDetail, page, limit, search, month, year, finance1])

  useEffect(() => {
    if (!canList || isDetail) return
    let cancelled = false

    fetchFinanceCompanies({
      page: 1,
      limit: 500,
      order_by: 'name',
      order_direction: 'asc',
    })
      .then((res) => {
        if (cancelled) return
        const raw = res?.data?.data || res?.data || []
        const mapped: OptionItem[] = Array.isArray(raw)
          ? raw
              .map((item: any) => ({
                code: normalizeText(item?.id),
                name: normalizeText(item?.name),
              }))
              .filter((item) => item.code && item.name)
          : []
        mapped.sort((a, b) => a.name.localeCompare(b.name))
        setFinance1Options(mapped)
      })
      .catch(() => {
        if (!cancelled) setFinance1Options([])
      })

    return () => {
      cancelled = true
    }
  }, [canList, isDetail])

  useEffect(() => {
    if (!canList || !isDetail || !selectedId) return

    let mounted = true
    setLoading(true)
    setError('')

    if (stateRow && stateRow.order_id === selectedId) {
      setDetailRow(stateRow)
    }

    listFinanceMigrationReport({
      page: 1,
      limit: 1,
      filters: { order_id: selectedId },
      order_by: 'pooling_at',
      order_direction: 'desc',
    })
      .then((res) => {
        if (!mounted) return
        const payload = res?.data || {}
        const data = payload?.data || []
        const row = Array.isArray(data) && data.length > 0 ? data[0] : null
        setDetailRow(row || (stateRow && stateRow.order_id === selectedId ? stateRow : null))
      })
      .catch((err: any) => {
        if (!mounted) return
        setDetailRow(stateRow && stateRow.order_id === selectedId ? stateRow : null)
        setError(err?.response?.data?.error || 'Failed to load finance migration detail.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [canList, isDetail, selectedId, stateRow])

  useEffect(() => {
    if (!isDetail) return
    setDetailOrderInSearchInput('')
    setDetailOrderInSearch('')
    setDetailOrderInPage(1)
    setSelectedOrderInRow(null)
    setDetailFinanceSummary(null)
    setDetailFinanceSummaryError('')
  }, [isDetail, selectedId])

  useEffect(() => {
    if (!canList || !isDetail || !selectedId) return
    let mounted = true

    setDetailOrderInLoading(true)
    setDetailOrderInError('')

    const params: Record<string, unknown> = {
      page: detailOrderInPage,
      limit: detailOrderInLimit,
      order_by: 'pooling_at',
      order_direction: 'desc',
    }
    if (detailOrderInSearch.trim()) params.search = detailOrderInSearch.trim()

    listFinanceMigrationOrderInDetail(selectedId, params)
      .then((res) => {
        if (!mounted) return
        const payload = res?.data || {}
        const data = Array.isArray(payload?.data) ? payload.data : []
        setDetailOrderInRows(data as FinanceMigrationRow[])
        setDetailOrderInTotalPages(Number(payload?.total_pages || 1))
        setDetailOrderInTotalData(Number(payload?.total_data || 0))
        setDetailOrderInPage(Number(payload?.current_page || detailOrderInPage))
      })
      .catch((err: any) => {
        if (!mounted) return
        setDetailOrderInRows([])
        setDetailOrderInTotalPages(1)
        setDetailOrderInTotalData(0)
        setDetailOrderInError(err?.response?.data?.error || 'Failed to load order in detail data.')
      })
      .finally(() => {
        if (mounted) setDetailOrderInLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [canList, isDetail, selectedId, detailOrderInPage, detailOrderInLimit, detailOrderInSearch])

  useEffect(() => {
    if (detailOrderInPage > detailOrderInTotalPages) {
      setDetailOrderInPage(detailOrderInTotalPages)
    }
  }, [detailOrderInPage, detailOrderInTotalPages])

  useEffect(() => {
    if (!canList || !isDetail || !selectedId) return
    let mounted = true
    setDetailFinanceSummaryLoading(true)
    setDetailFinanceSummaryError('')

    const loadSummary = async () => {
      const limitPerPage = 200
      const maxPages = 120
      const collected: FinanceMigrationRow[] = []
      let nextPage = 1
      let totalPagesRemote = 1

      while (nextPage <= totalPagesRemote && nextPage <= maxPages) {
        const params: Record<string, unknown> = {
          page: nextPage,
          limit: limitPerPage,
          order_by: 'pooling_at',
          order_direction: 'desc',
        }
        if (detailOrderInSearch.trim()) params.search = detailOrderInSearch.trim()

        const res = await listFinanceMigrationOrderInDetail(selectedId, params)
        const payload = res?.data || {}
        const data = Array.isArray(payload?.data) ? (payload.data as FinanceMigrationRow[]) : []
        totalPagesRemote = Number(payload?.total_pages || totalPagesRemote)
        collected.push(...data)
        nextPage += 1
      }

      const provinceNameMap: Record<string, string> = {}
      try {
        const provinceRes = await fetchProvinces()
        const provinceRaw = provinceRes?.data?.data || provinceRes?.data || []
        const provinceList: OptionItem[] = Array.isArray(provinceRaw) ? provinceRaw : []
        provinceList.forEach((province) => {
          const code = normalizeText(province?.code)
          const name = normalizeText(province?.name)
          if (code && name) provinceNameMap[code] = name
        })
      } catch {
        // use fallback province code when lookup failed
      }

      if (!mounted) return
      setDetailFinanceSummary(buildDetailFinanceSummary(collected, provinceNameMap))

      if (nextPage <= totalPagesRemote) {
        setDetailFinanceSummaryError('Summary is partial due to data volume limit.')
      }
    }

    loadSummary()
      .catch((err: any) => {
        if (!mounted) return
        setDetailFinanceSummary(null)
        setDetailFinanceSummaryError(err?.response?.data?.error || 'Failed to load finance summary.')
      })
      .finally(() => {
        if (mounted) setDetailFinanceSummaryLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [canList, isDetail, selectedId, detailOrderInSearch])

  const sourceRows = useMemo(() => {
    if (isDetail) {
      const rowMap: Record<string, FinanceMigrationRow> = {}
      detailOrderInRows.forEach((row) => {
        rowMap[row.order_id] = row
      })
      if (detailRow && !rowMap[detailRow.order_id]) {
        rowMap[detailRow.order_id] = detailRow
      }
      return Object.values(rowMap)
    }
    return rows
  }, [detailOrderInRows, detailRow, isDetail, rows])

  useEffect(() => {
    let mounted = true

    const resolveLocationNames = async () => {
      if (!sourceRows.length) {
        if (mounted) setLocationNamesByOrderId({})
        return
      }

      let provinceOptions: OptionItem[] = []
      try {
        const provRes = await fetchProvinces()
        const raw = provRes.data?.data || provRes.data || []
        provinceOptions = Array.isArray(raw) ? raw : []
      } catch {
        provinceOptions = []
      }

      const kabupatenCache: Record<string, OptionItem[]> = {}
      const kecamatanCache: Record<string, OptionItem[]> = {}
      const nextMap: Record<string, LocationNames> = {}

      for (const item of sourceRows) {
        const provinceCode = normalizeText(item.province)
        const regencyCode = normalizeText(item.regency)
        const districtCode = normalizeText(item.district)

        const provinceName = lookupOptionName(provinceOptions, provinceCode)

        let regencyName = regencyCode || '-'
        if (provinceCode) {
          if (!kabupatenCache[provinceCode]) {
            try {
              const kabRes = await fetchKabupaten(provinceCode)
              const rawKab = kabRes.data?.data || kabRes.data || []
              kabupatenCache[provinceCode] = Array.isArray(rawKab) ? rawKab : []
            } catch {
              kabupatenCache[provinceCode] = []
            }
          }
          regencyName = lookupOptionName(kabupatenCache[provinceCode], regencyCode)
        }

        let districtName = districtCode || '-'
        if (provinceCode && regencyCode) {
          const cacheKey = `${provinceCode}::${regencyCode}`
          if (!kecamatanCache[cacheKey]) {
            try {
              const kecRes = await fetchKecamatan(provinceCode, regencyCode)
              const rawKec = kecRes.data?.data || kecRes.data || []
              kecamatanCache[cacheKey] = Array.isArray(rawKec) ? rawKec : []
            } catch {
              kecamatanCache[cacheKey] = []
            }
          }
          districtName = lookupOptionName(kecamatanCache[cacheKey], districtCode)
        }

        nextMap[item.order_id] = {
          province: provinceName,
          regency: regencyName,
          district: districtName,
        }
      }

      if (mounted) {
        setLocationNamesByOrderId(nextMap)
      }
    }

    void resolveLocationNames()
    return () => {
      mounted = false
    }
  }, [sourceRows])

  const applyFilters = () => {
    setSearch(searchInput)
    setMonth(monthInput)
    setYear(yearInput)
    setFinance1(finance1Input)
    setPage(1)
  }

  const resetFilters = () => {
    setSearchInput('')
    setMonthInput('')
    setYearInput('')
    setFinance1Input('')
    setSearch('')
    setMonth('')
    setYear('')
    setFinance1('')
    setPage(1)
  }

  const applyDetailOrderInFilters = () => {
    setDetailOrderInSearch(detailOrderInSearchInput)
    setDetailOrderInPage(1)
  }

  const resetDetailOrderInFilters = () => {
    setDetailOrderInSearchInput('')
    setDetailOrderInSearch('')
    setDetailOrderInPage(1)
  }

  if (!canList) {
    return (
      <div className="page">
        <div className="card" style={{ minWidth: 0 }}>
          <h3>Report Finance</h3>
          <div className="alert">No access permission for finance migration report.</div>
        </div>
      </div>
    )
  }

  if (isDetail) {
    const item = detailRow
    const financePairText = item ? `${item.finance_1_name || '-'} -> ${item.finance_2_name || '-'}` : '-'
    const modalLocationNamed = selectedOrderInRow ? locationNamesByOrderId[selectedOrderInRow.order_id] : null
    const modalLocationText = selectedOrderInRow
      ? [
          modalLocationNamed?.province || selectedOrderInRow.province || '-',
          modalLocationNamed?.regency || selectedOrderInRow.regency || '-',
          modalLocationNamed?.district || selectedOrderInRow.district || '-',
          selectedOrderInRow.village || '-',
          selectedOrderInRow.address || '-',
        ].join(', ')
      : '-'
    const modalMotorOtrText = selectedOrderInRow
      ? `${selectedOrderInRow.motor_type_name || '-'} | ${formatRupiah(Number(selectedOrderInRow.otr || 0))}`
      : '-'
    const locationDonutSlices = buildDonutSlices(detailFinanceSummary?.locationTotals || [], 6)
    const motorTypeDonutSlices = buildDonutSlices(detailFinanceSummary?.motorTypeTotals || [], 6)
    const locationDonutGradient = buildDonutGradient(locationDonutSlices)
    const motorTypeDonutGradient = buildDonutGradient(motorTypeDonutSlices)

    return (
      <div style={{ overflowX: 'hidden' }}>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Report Finance Detail</div>
            <div style={{ color: '#64748b' }}>Detailed migration data: {financePairText}</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/finance-report')}>
            Back
          </button>
        </div>

        <div className="page" style={{ overflowX: 'hidden' }}>
          {error && <div className="alert">{error}</div>}
          {loading && !item && <div className="card"><div className="muted">Loading detail...</div></div>}
          {!loading && !item && <div className="card"><div className="alert">Finance migration detail not found.</div></div>}

          {item && (
            <>
              <div className="card">
                <h3>Finance Detail Identity</h3>
                <div
                  className="mobile-filter-grid"
                  style={{
                    marginTop: 10,
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                    <div className="muted" style={{ fontSize: 12 }}>Finance Pair</div>
                    <div style={{ marginTop: 4, fontWeight: 700 }}>{financePairText}</div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Status Finance 1</div>
                    {statusBadge(item.finance_1_status || '')}
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Status Finance 2</div>
                    {statusBadge(item.finance_2_status || '')}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Order In Data</h3>
                <div
                  className="mobile-filter-grid"
                  style={{
                    marginTop: 10,
                    marginBottom: 12,
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 10,
                    alignItems: 'end',
                  }}
                >
                  <div>
                    <label>Search</label>
                    <input
                      placeholder="Pooling number, dealer, consumer..."
                      value={detailOrderInSearchInput}
                      onChange={(e) => setDetailOrderInSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') applyDetailOrderInFilters()
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={applyDetailOrderInFilters}>Apply</button>
                    <button className="btn-ghost" onClick={resetDetailOrderInFilters}>Reset</button>
                  </div>
                </div>

                {detailOrderInError && <div className="alert" style={{ marginTop: 10 }}>{detailOrderInError}</div>}

                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ minWidth: 1280 }}>
                    <thead>
                      <tr>
                        <th>Pooling Number</th>
                        <th>Pooling Date</th>
                        <th>Dealer</th>
                        <th>Consumer</th>
                        <th>Location</th>
                        <th>Motor / OTR</th>
                        <th>Status 1</th>
                        <th>Keterangan Finance 1</th>
                        <th>Status 2</th>
                        <th>Keterangan Finance 2</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrderInLoading && (
                        <tr>
                          <td colSpan={11}>Loading order in data...</td>
                        </tr>
                      )}
                      {!detailOrderInLoading && detailOrderInRows.length === 0 && (
                        <tr>
                          <td colSpan={11}>No order in data found for this migration.</td>
                        </tr>
                      )}
                      {!detailOrderInLoading && detailOrderInRows.map((row) => {
                        const rowLocationNamed = locationNamesByOrderId[row.order_id]
                        const rowLocationText = [
                          rowLocationNamed?.province || row.province || '-',
                          rowLocationNamed?.regency || row.regency || '-',
                          rowLocationNamed?.district || row.district || '-',
                          row.village || '-',
                          row.address || '-',
                        ].join(', ')
                        const rowMotorOtrText = `${row.motor_type_name || '-'} | ${formatRupiah(Number(row.otr || 0))}`

                        return (
                          <tr key={`detail-order-in-${row.order_id}`}>
                            <td>{row.pooling_number || '-'}</td>
                            <td>{formatDateTime(row.pooling_at)}</td>
                            <td>{row.dealer_name || '-'}</td>
                            <td>{row.consumer_name || '-'}</td>
                            <td>{rowLocationText}</td>
                            <td>{rowMotorOtrText}</td>
                            <td>{statusBadge(row.finance_1_status || '')}</td>
                            <td title={row.finance_1_notes || '-'}>{truncateTableText(row.finance_1_notes || '-')}</td>
                            <td>{statusBadge(row.finance_2_status || '')}</td>
                            <td title={row.finance_2_notes || '-'}>{truncateTableText(row.finance_2_notes || '-')}</td>
                            <td className="action-cell">
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
                                onClick={() => setSelectedOrderInRow(row)}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="1.8" />
                                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                                </svg>
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={detailOrderInPage}
                  totalPages={detailOrderInTotalPages}
                  totalData={detailOrderInTotalData}
                  limit={detailOrderInLimit}
                  onPageChange={setDetailOrderInPage}
                  onLimitChange={(next) => {
                    setDetailOrderInLimit(next)
                    setDetailOrderInPage(1)
                  }}
                  disabled={detailOrderInLoading}
                />
              </div>

              <div className="card">
                <h3>Finance Result Summary</h3>
                {detailFinanceSummaryError && <div className="alert" style={{ marginTop: 10 }}>{detailFinanceSummaryError}</div>}
                {detailFinanceSummaryLoading && <div className="muted" style={{ marginTop: 10 }}>Loading summary...</div>}

                {!detailFinanceSummaryLoading && detailFinanceSummary && (
                  <>
                    <div
                      style={{
                        marginTop: 10,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 10,
                      }}
                    >
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                        <div className="muted" style={{ fontSize: 12 }}>Total Order Data</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{detailFinanceSummary.totalOrders}</div>
                      </div>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                        <div className="muted" style={{ fontSize: 12 }}>Total Dealer</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{detailFinanceSummary.totalDealers}</div>
                      </div>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                        <div className="muted" style={{ fontSize: 12 }}>Dealer Coverage</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{detailFinanceSummary.dealerCoveragePercent.toFixed(1)}%</div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Unique dealer / total order data</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Finance Performence</div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ minWidth: 760 }}>
                          <thead>
                            <tr>
                              <th>Total</th>
                              <th>Approve</th>
                              <th>Rejected</th>
                              <th>Approve %</th>
                              <th>Lead Avg</th>
                              <th>Rescue FC2</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{detailFinanceSummary.totalOrders}</td>
                              <td>{detailFinanceSummary.approvedCount}</td>
                              <td>{detailFinanceSummary.rejectedCount}</td>
                              <td>{(detailFinanceSummary.approvalRate * 100).toFixed(1)}%</td>
                              <td>{detailFinanceSummary.leadAvgSeconds != null ? `${detailFinanceSummary.leadAvgSeconds.toFixed(1)} s` : '-'}</td>
                              <td>{detailFinanceSummary.rescueFc2}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 12,
                      }}
                      className="mobile-filter-grid"
                    >
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Location Summary (Province)</div>
                        <div className="mobile-filter-grid" style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
                          {locationDonutSlices.length === 0 && <div className="muted">No location summary.</div>}
                          {locationDonutSlices.length > 0 && (
                            <>
                              <div style={{ display: 'grid', placeItems: 'center' }}>
                                <div style={{ width: 132, height: 132, borderRadius: '50%', background: locationDonutGradient, position: 'relative' }}>
                                  <div
                                    style={{
                                      position: 'absolute',
                                      inset: 18,
                                      borderRadius: '50%',
                                      background: '#fff',
                                      display: 'grid',
                                      placeItems: 'center',
                                      textAlign: 'center',
                                      border: '1px solid #e2e8f0',
                                    }}
                                  >
                                    <div className="muted" style={{ fontSize: 11, lineHeight: 1.1 }}>Location</div>
                                    <div style={{ fontSize: 16, fontWeight: 700 }}>{detailFinanceSummary.totalOrders}</div>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                                {locationDonutSlices.map((slice) => (
                                  <div key={`loc-${slice.label}`} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 999, background: slice.color, display: 'inline-block' }} />
                                    <div title={slice.label} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncateTableText(slice.label, 70)}</div>
                                    <div style={{ color: '#64748b', fontSize: 12 }}>{slice.percent.toFixed(1)}%</div>
                                    <div style={{ fontWeight: 700 }}>{slice.total}</div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Motor Type Summary</div>
                        <div className="mobile-filter-grid" style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
                          {motorTypeDonutSlices.length === 0 && <div className="muted">No motor type summary.</div>}
                          {motorTypeDonutSlices.length > 0 && (
                            <>
                              <div style={{ display: 'grid', placeItems: 'center' }}>
                                <div style={{ width: 132, height: 132, borderRadius: '50%', background: motorTypeDonutGradient, position: 'relative' }}>
                                  <div
                                    style={{
                                      position: 'absolute',
                                      inset: 18,
                                      borderRadius: '50%',
                                      background: '#fff',
                                      display: 'grid',
                                      placeItems: 'center',
                                      textAlign: 'center',
                                      border: '1px solid #e2e8f0',
                                    }}
                                  >
                                    <div className="muted" style={{ fontSize: 11, lineHeight: 1.1 }}>Motor Type</div>
                                    <div style={{ fontSize: 16, fontWeight: 700 }}>{detailFinanceSummary.totalOrders}</div>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                                {motorTypeDonutSlices.map((slice) => (
                                  <div key={`motor-${slice.label}`} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 999, background: slice.color, display: 'inline-block' }} />
                                    <div title={slice.label} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncateTableText(slice.label, 70)}</div>
                                    <div style={{ color: '#64748b', fontSize: 12 }}>{slice.percent.toFixed(1)}%</div>
                                    <div style={{ fontWeight: 700 }}>{slice.total}</div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </>
          )}
        </div>

        {selectedOrderInRow && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Order In Detail" onClick={() => setSelectedOrderInRow(null)}>
            <div className="modal" style={{ width: 'min(880px, 100%)' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <h3>Order In Detail</h3>
                <button className="btn-ghost" onClick={() => setSelectedOrderInRow(null)}>Close</button>
              </div>
              <DetailTable
                wrapValue
                rows={[
                  { label: 'Pooling Number', value: selectedOrderInRow.pooling_number || '-' },
                  { label: 'Pooling Date', value: formatDateTime(selectedOrderInRow.pooling_at) },
                  { label: 'Result Date', value: formatDateTime(selectedOrderInRow.result_at) },
                  { label: 'Created At', value: formatDateTime(selectedOrderInRow.order_created_at) },
                  { label: 'Updated At', value: formatDateTime(selectedOrderInRow.order_updated_at) },
                  { label: 'Dealer', value: selectedOrderInRow.dealer_name || '-' },
                  { label: 'Consumer Name', value: selectedOrderInRow.consumer_name || '-' },
                  { label: 'Consumer Phone', value: selectedOrderInRow.consumer_phone || '-' },
                  { label: 'Location', value: modalLocationText },
                  { label: 'Job', value: selectedOrderInRow.job_name || '-' },
                  { label: 'Motor Type / OTR', value: modalMotorOtrText },
                  { label: 'Installment', value: formatRupiah(Number(selectedOrderInRow.installment_amount || 0)) },
                  { label: 'Net Income', value: formatRupiah(Number(selectedOrderInRow.net_income || 0)) },
                  { label: 'DP Gross', value: formatRupiah(Number(selectedOrderInRow.dp_gross || 0)) },
                  { label: 'DP Paid', value: formatRupiah(Number(selectedOrderInRow.dp_paid || 0)) },
                  { label: 'DP Percentage', value: `${Number(selectedOrderInRow.dp_pct || 0).toFixed(2)}%` },
                  { label: 'Tenor', value: `${Number(selectedOrderInRow.tenor || 0)} months` },
                  { label: 'Order Status', value: statusBadge(selectedOrderInRow.order_result_status || '') },
                  { label: 'Order Notes', value: selectedOrderInRow.order_result_notes || '-' },
                  { label: 'Finance 1', value: selectedOrderInRow.finance_1_name || '-' },
                  { label: 'Status 1', value: statusBadge(selectedOrderInRow.finance_1_status || '') },
                  { label: 'Decision At 1', value: formatDateTime(selectedOrderInRow.finance_1_decision_at) },
                  { label: 'Notes Finance 1', value: selectedOrderInRow.finance_1_notes || '-' },
                  { label: 'Finance 2', value: selectedOrderInRow.finance_2_name || '-' },
                  { label: 'Status 2', value: statusBadge(selectedOrderInRow.finance_2_status || '') },
                  { label: 'Decision At 2', value: formatDateTime(selectedOrderInRow.finance_2_decision_at) },
                  { label: 'Notes Finance 2', value: selectedOrderInRow.finance_2_notes || '-' },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'hidden' }}>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Report Finance</div>
          <div style={{ color: '#64748b' }}>Finance 1 reject migration report to finance 2</div>
        </div>
      </div>

      <div className="page" style={{ overflowX: 'hidden' }}>
        <div className="card" style={{ minWidth: 0, maxWidth: '100%' }}>
          <div
            className="mobile-filter-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.2fr) minmax(180px, 240px) minmax(120px, 150px) minmax(120px, 150px) auto',
              gap: 10,
              alignItems: 'end',
            }}
          >
            <div>
              <label>Search</label>
              <input
                placeholder="Pooling number, dealer, consumer, finance..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters()
                }}
              />
            </div>
            <div>
              <label>Finance 1</label>
              <select value={finance1Input} onChange={(e) => setFinance1Input(e.target.value)}>
                <option value="">All Finance 1</option>
                {finance1Options.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Month</label>
              <select value={monthInput} onChange={(e) => setMonthInput(e.target.value)}>
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>
                    {String(idx + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Year</label>
              <select value={yearInput} onChange={(e) => setYearInput(e.target.value)}>
                <option value="">All Years</option>
                {yearOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={applyFilters}>Apply</button>
              <button className="btn-ghost" onClick={resetFilters}>Reset</button>
            </div>
          </div>

          {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}

          <div style={{ marginTop: 12, overflowX: 'auto', width: '100%', maxWidth: '100%', display: 'block' }}>
            <table className="table" style={{ minWidth: 1280, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 150 }}>Finance 2</th>
                  <th style={{ width: 160 }}>Last Status Finance 2</th>
                  <th style={{ width: 100 }}>Total Data</th>
                  <th style={{ width: 180 }}>Total Data Approve Finance 2</th>
                  <th style={{ width: 180 }}>Total Data Reject Finance 2</th>
                  <th style={{ width: 140 }}>Finance 1</th>
                  <th style={{ width: 120 }}>Status Finance 1</th>
                  <th style={{ width: 96 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={9}>No finance migration data.</td>
                  </tr>
                )}
                {rows.map((item, idx) => {
                  const rowNumber = (page - 1) * limit + idx + 1

                  return (
                    <tr key={`${item.order_id}-${idx}`}>
                      <td>{rowNumber}</td>
                      <td title={item.finance_2_name || '-'}>{truncateTableText(item.finance_2_name)}</td>
                      <td>{statusBadge(item.finance_2_status)}</td>
                      <td>{Number(item.transition_total_data || 0)}</td>
                      <td>{Number(item.total_approve_finance_2 || 0)}</td>
                      <td>{Number(item.total_reject_finance_2 || 0)}</td>
                      <td title={item.finance_1_name || '-'}>{truncateTableText(item.finance_1_name)}</td>
                      <td>{statusBadge(item.finance_1_status)}</td>
                      <td className="action-cell">
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
                          onClick={() =>
                            navigate(`/finance-report/${item.order_id}`, {
                              state: { row: item },
                            })
                          }
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="1.8" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalData={totalData}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next)
              setPage(1)
            }}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  )
}
