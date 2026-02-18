import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchKabupaten, fetchKecamatan, fetchProvinces, listFinanceMigrationReport } from '../api'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'
import { formatRupiah } from '../utils/currency'

type FinanceMigrationRow = {
  order_id: string
  pooling_number: string
  pooling_at: string
  result_at?: string
  dealer_order_total?: number
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

type FinanceApprovalSnapshotRow = {
  finance_company_name: string
  total_orders: number
  approved_count: number
  rejected_count: number
  approval_rate: number
}

type FinanceApprovalTransitionRow = {
  finance_1_company_name: string
  finance_2_company_name: string
  total_data: number
  approved_count: number
  rejected_count: number
  approval_rate: number
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

function normalizeFinanceStatus(status: unknown) {
  const value = String(status || '').trim().toLowerCase()
  if (value.startsWith('approve')) return 'approve'
  if (value.startsWith('reject')) return 'reject'
  if (value === 'success') return 'approve'
  if (value === 'error') return 'reject'
  return value
}

function approvalRateTone(rate: number) {
  const value = Number(rate || 0)
  if (value >= 0.6) return 'good'
  if (value >= 0.4) return 'warn'
  return 'bad'
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

function DetailTable({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <table className="table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: 200 }}>{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MiniMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mini-metric">
      <div className="mini-metric-label">{label}</div>
      <div className="mini-metric-value">{value}</div>
    </div>
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
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [financeApprovalLoading, setFinanceApprovalLoading] = useState(false)
  const [financeApprovalError, setFinanceApprovalError] = useState('')
  const [financeApprovalSnapshotRows, setFinanceApprovalSnapshotRows] = useState<FinanceApprovalSnapshotRow[]>([])
  const [financeApprovalTransitionRows, setFinanceApprovalTransitionRows] = useState<FinanceApprovalTransitionRow[]>([])
  const [selectedTransitionFromFinanceName, setSelectedTransitionFromFinanceName] = useState('')
  const [approvalFinancePage, setApprovalFinancePage] = useState(1)
  const [approvalFinanceLimit, setApprovalFinanceLimit] = useState(10)
  const [approvalTransitionPage, setApprovalTransitionPage] = useState(1)
  const [approvalTransitionLimit, setApprovalTransitionLimit] = useState(5)

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
        order_by: 'pooling_at',
        order_direction: 'desc',
      }

      if (search.trim()) params.search = search.trim()
      if (month) params.month = Number(month)
      if (year) params.year = Number(year)

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
  }, [canList, isDetail, page, limit, search, month, year])

  useEffect(() => {
    if (!canList || isDetail) return
    let cancelled = false

    const loadFinanceApprovalSummary = async () => {
      setFinanceApprovalLoading(true)
      setFinanceApprovalError('')

      const summaryParams: Record<string, unknown> = {
        order_by: 'pooling_at',
        order_direction: 'desc',
      }
      if (search.trim()) summaryParams.search = search.trim()
      if (month) summaryParams.month = Number(month)
      if (year) summaryParams.year = Number(year)

      const financeSnapshotMap = new Map<string, { name: string; total: number; approved: number; rejected: number }>()
      const financeTransitionMap = new Map<string, { from: string; to: string; total: number; approved: number; rejected: number }>()
      const ingestRows = (dataRows: FinanceMigrationRow[]) => {
        dataRows.forEach((row) => {
          const finance1Name = normalizeText(row.finance_1_name) || '-'
          const finance2Name = normalizeText(row.finance_2_name) || '-'
          const status = normalizeFinanceStatus(row.finance_2_status)

          const finance2Key = finance2Name.toLowerCase()
          const currentSnapshot = financeSnapshotMap.get(finance2Key) || {
            name: finance2Name,
            total: 0,
            approved: 0,
            rejected: 0,
          }
          currentSnapshot.total += 1
          if (status === 'approve') currentSnapshot.approved += 1
          if (status === 'reject') currentSnapshot.rejected += 1
          financeSnapshotMap.set(finance2Key, currentSnapshot)

          const transitionKey = `${finance1Name.toLowerCase()}::${finance2Key}`
          const currentTransition = financeTransitionMap.get(transitionKey) || {
            from: finance1Name,
            to: finance2Name,
            total: 0,
            approved: 0,
            rejected: 0,
          }
          currentTransition.total += 1
          if (status === 'approve') currentTransition.approved += 1
          if (status === 'reject') currentTransition.rejected += 1
          financeTransitionMap.set(transitionKey, currentTransition)
        })
      }

      try {
        const pageLimit = 200
        let currentPage = 1
        let totalPagesToFetch = 1

        while (currentPage <= totalPagesToFetch) {
          const res = await listFinanceMigrationReport({
            ...summaryParams,
            page: currentPage,
            limit: pageLimit,
          })
          if (cancelled) return

          const payload = res?.data || {}
          const data = Array.isArray(payload?.data) ? (payload.data as FinanceMigrationRow[]) : []
          ingestRows(data)

          if (currentPage === 1) {
            const totalPagesRaw = Number(payload?.total_pages || 1)
            totalPagesToFetch = Number.isFinite(totalPagesRaw) && totalPagesRaw > 0 ? totalPagesRaw : 1
          }
          currentPage += 1
        }

        if (cancelled) return

        const nextSnapshotRows: FinanceApprovalSnapshotRow[] = Array.from(financeSnapshotMap.values())
          .map((item) => ({
            finance_company_name: item.name,
            total_orders: item.total,
            approved_count: item.approved,
            rejected_count: item.rejected,
            approval_rate: item.total > 0 ? item.approved / item.total : 0,
          }))
          .sort((a, b) => {
            if (b.total_orders !== a.total_orders) return b.total_orders - a.total_orders
            return a.finance_company_name.localeCompare(b.finance_company_name)
          })

        const nextTransitionRows: FinanceApprovalTransitionRow[] = Array.from(financeTransitionMap.values())
          .map((item) => ({
            finance_1_company_name: item.from,
            finance_2_company_name: item.to,
            total_data: item.total,
            approved_count: item.approved,
            rejected_count: item.rejected,
            approval_rate: item.total > 0 ? item.approved / item.total : 0,
          }))
          .sort((a, b) => {
            const byFrom = a.finance_1_company_name.localeCompare(b.finance_1_company_name)
            if (byFrom !== 0) return byFrom
            return a.finance_2_company_name.localeCompare(b.finance_2_company_name)
          })

        setFinanceApprovalSnapshotRows(nextSnapshotRows)
        setFinanceApprovalTransitionRows(nextTransitionRows)
      } catch (err: any) {
        if (cancelled) return
        setFinanceApprovalSnapshotRows([])
        setFinanceApprovalTransitionRows([])
        setFinanceApprovalError(err?.response?.data?.error || 'Failed to load finance approval summary.')
      } finally {
        if (!cancelled) setFinanceApprovalLoading(false)
      }
    }

    void loadFinanceApprovalSummary()
    return () => {
      cancelled = true
    }
  }, [canList, isDetail, search, month, year])

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

  const sourceRows = useMemo(() => {
    if (isDetail) {
      return detailRow ? [detailRow] : []
    }
    return rows
  }, [detailRow, isDetail, rows])

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
    setPage(1)
  }

  const resetFilters = () => {
    setSearchInput('')
    setMonthInput('')
    setYearInput('')
    setSearch('')
    setMonth('')
    setYear('')
    setPage(1)
  }

  const transitionFromFinanceOptions = useMemo(() => {
    const unique = new Set<string>()
    financeApprovalTransitionRows.forEach((item) => {
      const name = normalizeText(item.finance_1_company_name)
      if (name) unique.add(name)
    })
    return Array.from(unique)
      .map((name) => ({ id: name, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [financeApprovalTransitionRows])

  useEffect(() => {
    if (transitionFromFinanceOptions.length === 0) {
      setSelectedTransitionFromFinanceName('')
      return
    }
    const hasSelected = transitionFromFinanceOptions.some((item) => item.id === selectedTransitionFromFinanceName)
    if (!hasSelected) {
      setSelectedTransitionFromFinanceName(transitionFromFinanceOptions[0].id)
    }
  }, [selectedTransitionFromFinanceName, transitionFromFinanceOptions])

  const filteredTransitionRows = useMemo(() => {
    if (!selectedTransitionFromFinanceName) return []
    return financeApprovalTransitionRows.filter(
      (item) => normalizeText(item.finance_1_company_name) === selectedTransitionFromFinanceName,
    )
  }, [financeApprovalTransitionRows, selectedTransitionFromFinanceName])

  const selectedTransitionSummary = useMemo(() => {
    const total = filteredTransitionRows.reduce((sum, item) => sum + Number(item.total_data || 0), 0)
    const approved = filteredTransitionRows.reduce((sum, item) => sum + Number(item.approved_count || 0), 0)
    const rejected = filteredTransitionRows.reduce((sum, item) => sum + Number(item.rejected_count || 0), 0)
    return {
      total,
      approved,
      rejected,
      approvalRate: total > 0 ? approved / total : 0,
    }
  }, [filteredTransitionRows])

  const approvalFinanceTotalData = financeApprovalSnapshotRows.length
  const approvalFinanceTotalPages = Math.max(1, Math.ceil(approvalFinanceTotalData / approvalFinanceLimit))
  const pagedApprovalFinanceRows = useMemo(() => {
    const start = (approvalFinancePage - 1) * approvalFinanceLimit
    return financeApprovalSnapshotRows.slice(start, start + approvalFinanceLimit)
  }, [approvalFinanceLimit, approvalFinancePage, financeApprovalSnapshotRows])

  const approvalTransitionTotalData = filteredTransitionRows.length
  const approvalTransitionTotalPages = Math.max(1, Math.ceil(approvalTransitionTotalData / approvalTransitionLimit))
  const pagedApprovalTransitionRows = useMemo(() => {
    const start = (approvalTransitionPage - 1) * approvalTransitionLimit
    return filteredTransitionRows.slice(start, start + approvalTransitionLimit)
  }, [approvalTransitionLimit, approvalTransitionPage, filteredTransitionRows])

  useEffect(() => {
    setApprovalFinancePage(1)
    setApprovalTransitionPage(1)
  }, [search, month, year])

  useEffect(() => {
    if (approvalFinancePage > approvalFinanceTotalPages) {
      setApprovalFinancePage(approvalFinanceTotalPages)
    }
  }, [approvalFinancePage, approvalFinanceTotalPages])

  useEffect(() => {
    setApprovalTransitionPage(1)
  }, [selectedTransitionFromFinanceName])

  useEffect(() => {
    if (approvalTransitionPage > approvalTransitionTotalPages) {
      setApprovalTransitionPage(approvalTransitionTotalPages)
    }
  }, [approvalTransitionPage, approvalTransitionTotalPages])

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
    const namedLocation = item ? locationNamesByOrderId[item.order_id] : null
    const locationText = item
      ? [
          namedLocation?.province || item.province || '-',
          namedLocation?.regency || item.regency || '-',
          namedLocation?.district || item.district || '-',
          item.village || '-',
          item.address || '-',
        ].join(', ')
      : '-'
    const motorOtrText = item ? `${item.motor_type_name || '-'} | ${formatRupiah(Number(item.otr || 0))}` : '-'

    return (
      <div style={{ overflowX: 'hidden' }}>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Report Finance Detail</div>
            <div style={{ color: '#64748b' }}>Detailed migration data from finance 1 to finance 2</div>
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
                <h3>Order In Data</h3>
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
                        <th>Status 2</th>
                        <th>Order Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{item.pooling_number || '-'}</td>
                        <td>{formatDateTime(item.pooling_at)}</td>
                        <td>{item.dealer_name || '-'}</td>
                        <td>{item.consumer_name || '-'}</td>
                        <td>{locationText}</td>
                        <td>{motorOtrText}</td>
                        <td>{statusBadge(item.finance_1_status || '')}</td>
                        <td>{statusBadge(item.finance_2_status || '')}</td>
                        <td>{statusBadge(item.order_result_status || '')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <h3>Order Information</h3>
                <DetailTable
                  rows={[
                    { label: 'Pooling Number', value: item.pooling_number || '-' },
                    { label: 'Pooling Date', value: formatDateTime(item.pooling_at) },
                    { label: 'Result Date', value: formatDateTime(item.result_at) },
                    { label: 'Created At', value: formatDateTime(item.order_created_at) },
                    { label: 'Updated At', value: formatDateTime(item.order_updated_at) },
                    { label: 'Dealer', value: item.dealer_name || '-' },
                    { label: 'Consumer Name', value: item.consumer_name || '-' },
                    { label: 'Consumer Phone', value: item.consumer_phone || '-' },
                    { label: 'Location', value: locationText },
                    { label: 'Job', value: item.job_name || '-' },
                    { label: 'Motor Type / OTR', value: motorOtrText },
                    { label: 'DP Gross', value: formatRupiah(Number(item.dp_gross || 0)) },
                    { label: 'DP Paid', value: formatRupiah(Number(item.dp_paid || 0)) },
                    { label: 'DP Percentage', value: `${Number(item.dp_pct || 0).toFixed(2)}%` },
                    { label: 'Tenor', value: `${Number(item.tenor || 0)} months` },
                    { label: 'Order Status', value: statusBadge(item.order_result_status || '') },
                    { label: 'Order Notes', value: item.order_result_notes || '-' },
                  ]}
                />
              </div>

              <div className="card">
                <h3>Finance Result</h3>
                <DetailTable
                  rows={[
                    { label: 'Finance 1', value: item.finance_1_name || '-' },
                    { label: 'Status 1', value: statusBadge(item.finance_1_status) },
                    { label: 'Decision At 1', value: formatDateTime(item.finance_1_decision_at) },
                    { label: 'Notes Finance 1', value: item.finance_1_notes || '-' },
                    { label: 'Finance 2', value: item.finance_2_name || '-' },
                    { label: 'Status 2', value: statusBadge(item.finance_2_status) },
                    { label: 'Decision At 2', value: formatDateTime(item.finance_2_decision_at) },
                    { label: 'Notes Finance 2', value: item.finance_2_notes || '-' },
                  ]}
                />
              </div>

            </>
          )}
        </div>
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
        <div className="card finance-report-approval-card">
          <div className="finance-report-approval-header">
            <div className="finance-report-approval-title">
              <h3>Finance Approval</h3>
              <div className="finance-report-approval-subtitle">
                Ringkasan performa approval berdasarkan filter report saat ini (search, month, year).
              </div>
            </div>
            <div className="finance-report-approval-meta">
              <span className="finance-report-approval-meta-item">
                Snapshot: {approvalFinanceTotalData.toLocaleString('id-ID')}
              </span>
              <span className="finance-report-approval-meta-item">
                Transition: {financeApprovalTransitionRows.length.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {financeApprovalError && <div className="alert" style={{ marginTop: 12 }}>{financeApprovalError}</div>}
          {financeApprovalLoading && <div style={{ marginTop: 12, color: '#64748b' }}>Loading finance approval summary...</div>}

          {!financeApprovalLoading && (
            <div className="finance-report-approval-body">
              <div className="finance-report-approval-top">
                <div className="finance-report-approval-filter-panel">
                  <label>Select Finance 1</label>
                  <select
                    value={selectedTransitionFromFinanceName}
                    onChange={(e) => setSelectedTransitionFromFinanceName(e.target.value)}
                    disabled={transitionFromFinanceOptions.length === 0}
                  >
                    {transitionFromFinanceOptions.length === 0 && <option value="">No data</option>}
                    {transitionFromFinanceOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="finance-report-approval-kpi-grid">
                  <MiniMetric label="Finance 1" value={selectedTransitionFromFinanceName || '-'} />
                  <MiniMetric label="Total" value={selectedTransitionSummary.total.toLocaleString('id-ID')} />
                  <MiniMetric label="Approved" value={selectedTransitionSummary.approved.toLocaleString('id-ID')} />
                  <MiniMetric label="Rejected" value={selectedTransitionSummary.rejected.toLocaleString('id-ID')} />
                  <MiniMetric
                    label="Rate"
                    value={
                      <span className={`finance-report-rate ${approvalRateTone(selectedTransitionSummary.approvalRate)}`}>
                        {(selectedTransitionSummary.approvalRate * 100).toFixed(1)}%
                      </span>
                    }
                  />
                </div>
              </div>

              <div className="compact-section finance-report-approval-section">
                <div className="finance-report-approval-section-header">
                  <div className="compact-section-title">Finance Snapshot</div>
                  <div className="finance-report-approval-caption">Distribusi hasil approval per Finance 2</div>
                </div>
                <div className="finance-report-approval-table-wrap">
                  <table className="table compact-table finance-report-approval-table">
                    <thead>
                      <tr>
                        <th>Finance</th>
                        <th>Total</th>
                        <th>Approved</th>
                        <th>Rejected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedApprovalFinanceRows.map((item) => (
                        <tr key={`report-finance-snapshot-${item.finance_company_name}`}>
                          <td>{item.finance_company_name || '-'}</td>
                          <td>{Number(item.total_orders || 0).toLocaleString('id-ID')}</td>
                          <td>{Number(item.approved_count || 0).toLocaleString('id-ID')}</td>
                          <td>{Number(item.rejected_count || 0).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                      {approvalFinanceTotalData === 0 && (
                        <tr>
                          <td colSpan={4}>No finance snapshot data for current filter.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {approvalFinanceTotalData > 0 && (
                  <Pagination
                    page={approvalFinancePage}
                    totalPages={approvalFinanceTotalPages}
                    totalData={approvalFinanceTotalData}
                    limit={approvalFinanceLimit}
                    onPageChange={setApprovalFinancePage}
                    onLimitChange={(next) => {
                      setApprovalFinanceLimit(next)
                      setApprovalFinancePage(1)
                    }}
                    limitOptions={[5, 10, 20, 50]}
                  />
                )}
              </div>

              <div className="compact-section finance-report-approval-section">
                <div className="finance-report-approval-section-header">
                  <div className="compact-section-title">Finance 1 Reject to Finance 2 Outcome</div>
                  <div className="finance-report-approval-caption">Hasil akhir berdasarkan Finance 1 yang dipilih</div>
                </div>
                <div className="finance-report-approval-table-wrap">
                  <table className="table compact-table finance-report-approval-table">
                    <thead>
                      <tr>
                        <th>Finance 2 Name</th>
                        <th>Total Data</th>
                        <th>Approved</th>
                        <th>Rejected</th>
                        <th>Approval Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedApprovalTransitionRows.map((item) => (
                        <tr key={`report-finance-transition-${item.finance_1_company_name}-${item.finance_2_company_name}`}>
                          <td>{item.finance_2_company_name || '-'}</td>
                          <td>{Number(item.total_data || 0).toLocaleString('id-ID')}</td>
                          <td>{Number(item.approved_count || 0).toLocaleString('id-ID')}</td>
                          <td>{Number(item.rejected_count || 0).toLocaleString('id-ID')}</td>
                          <td>
                            <span className={`finance-report-rate ${approvalRateTone(Number(item.approval_rate || 0))}`}>
                              {(Number(item.approval_rate || 0) * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {approvalTransitionTotalData === 0 && (
                        <tr>
                          <td colSpan={5}>No finance transition data for selected Finance 1.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {approvalTransitionTotalData > 0 && (
                  <Pagination
                    page={approvalTransitionPage}
                    totalPages={approvalTransitionTotalPages}
                    totalData={approvalTransitionTotalData}
                    limit={approvalTransitionLimit}
                    onPageChange={setApprovalTransitionPage}
                    onLimitChange={(next) => {
                      setApprovalTransitionLimit(next)
                      setApprovalTransitionPage(1)
                    }}
                    limitOptions={[5, 10, 20, 50]}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ minWidth: 0, maxWidth: '100%' }}>
          <div
            className="mobile-filter-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.3fr) minmax(120px, 150px) minmax(120px, 150px) auto',
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
            <table className="table" style={{ minWidth: 3380, tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 150 }}>Pooling Number</th>
                  <th style={{ width: 180 }}>Pooling Date</th>
                  <th style={{ width: 190 }}>Nama Konsumen</th>
                  <th style={{ width: 500 }}>Alamat Konsumen</th>
                  <th style={{ width: 190 }}>Nama Dealer</th>
                  <th style={{ width: 420 }}>Area Dealer</th>
                  <th style={{ width: 240 }}>Tipe Motor</th>
                  <th style={{ width: 180 }}>OTR</th>
                  <th style={{ width: 180 }}>Angsuran</th>
                  <th style={{ width: 180 }}>Net Income</th>
                  <th style={{ width: 160 }}>Finance 1</th>
                  <th style={{ width: 130 }}>Status Finance 1</th>
                  <th style={{ width: 220 }}>Keterangan Finance 1</th>
                  <th style={{ width: 160 }}>Finance 2</th>
                  <th style={{ width: 130 }}>Status Finance 2</th>
                  <th style={{ width: 240 }}>Keterangan Finance 2</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={18}>No finance migration data.</td>
                  </tr>
                )}
                {rows.map((item, idx) => {
                  const rowNumber = (page - 1) * limit + idx + 1
                  const namedLocation = locationNamesByOrderId[item.order_id]
                  const consumerAddress = [
                    namedLocation?.province || item.province || '-',
                    namedLocation?.regency || item.regency || '-',
                    namedLocation?.district || item.district || '-',
                    item.village || '-',
                    item.address || '-',
                  ]
                    .map((it) => String(it || '').trim())
                    .filter(Boolean)
                    .join(', ')
                  const dealerArea = [
                    item.dealer_province || '-',
                    item.dealer_regency || '-',
                    item.dealer_district || '-',
                    item.dealer_village || '-',
                    item.dealer_address || '-',
                  ]
                    .map((it) => String(it || '').trim())
                    .filter(Boolean)
                    .join(', ')
                  const motorTypeCombined = `${item.motor_type_name || '-'} | ${formatRupiah(Number(item.otr || 0))}`

                  return (
                    <tr key={`${item.order_id}-${idx}`}>
                      <td>{rowNumber}</td>
                      <td title={item.pooling_number || '-'}>{item.pooling_number || '-'}</td>
                      <td title={formatDateTime(item.pooling_at)}>{formatDateTime(item.pooling_at)}</td>
                      <td title={item.consumer_name || '-'}>{item.consumer_name || '-'}</td>
                      <td title={consumerAddress || '-'}>{consumerAddress || '-'}</td>
                      <td title={item.dealer_name || '-'}>{item.dealer_name || '-'}</td>
                      <td title={dealerArea || '-'}>{dealerArea || '-'}</td>
                      <td title={motorTypeCombined}>{motorTypeCombined}</td>
                      <td title={formatRupiah(Number(item.otr || 0))}>{formatRupiah(Number(item.otr || 0))}</td>
                      <td title={formatRupiah(Number(item.installment_amount || 0))}>{formatRupiah(Number(item.installment_amount || 0))}</td>
                      <td title={formatRupiah(Number(item.net_income || 0))}>{formatRupiah(Number(item.net_income || 0))}</td>
                      <td title={item.finance_1_name || '-'}>{item.finance_1_name || '-'}</td>
                      <td>{statusBadge(item.finance_1_status)}</td>
                      <td title={item.finance_1_notes || '-'}>{item.finance_1_notes || '-'}</td>
                      <td title={item.finance_2_name || '-'}>{item.finance_2_name || '-'}</td>
                      <td>{statusBadge(item.finance_2_status)}</td>
                      <td title={item.finance_2_notes || '-'}>{item.finance_2_notes || '-'}</td>
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
