import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchKabupaten, fetchKecamatan, fetchProvinces, listFinanceMigrationReport } from '../api'
import ActionMenu from '../components/ActionMenu'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'
import { formatRupiah } from '../utils/currency'

type FinanceMigrationRow = {
  order_id: string
  pooling_number: string
  pooling_at: string
  result_at?: string
  dealer_name: string
  consumer_name: string
  consumer_phone: string
  province: string
  regency: string
  district: string
  village: string
  address: string
  job_name: string
  motor_type_name: string
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

function formatDateTime(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US')
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
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
  const [orderDetailModalOpen, setOrderDetailModalOpen] = useState(false)
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
                        <th>Action</th>
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
                        <td className="action-cell">
                          <ActionMenu
                            items={[
                              {
                                key: 'view_order_in',
                                label: 'View',
                                onClick: () => setOrderDetailModalOpen(true),
                              },
                            ]}
                          />
                        </td>
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

              {orderDetailModalOpen && (
                <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Order In detail modal">
                  <div className="modal">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <h3>Order In Detail</h3>
                      <button className="btn-ghost" onClick={() => setOrderDetailModalOpen(false)}>
                        Close
                      </button>
                    </div>

                    <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
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
                          { label: 'Address', value: item.address || '-' },
                          { label: 'Job', value: item.job_name || '-' },
                          { label: 'Motor Type', value: item.motor_type_name || '-' },
                          { label: 'OTR', value: formatRupiah(Number(item.otr || 0)) },
                          { label: 'DP Gross', value: formatRupiah(Number(item.dp_gross || 0)) },
                          { label: 'DP Paid', value: formatRupiah(Number(item.dp_paid || 0)) },
                          { label: 'DP Percentage', value: `${Number(item.dp_pct || 0).toFixed(2)}%` },
                          { label: 'Tenor', value: `${Number(item.tenor || 0)} months` },
                          { label: 'Order Status', value: statusBadge(item.order_result_status || '') },
                          { label: 'Order Notes', value: item.order_result_notes || '-' },
                        ]}
                      />

                      <div>
                        <h4 style={{ margin: '4px 0 8px' }}>Finance Attempt Detail</h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table" style={{ minWidth: 820 }}>
                            <thead>
                              <tr>
                                <th>Attempt</th>
                                <th>Finance Company</th>
                                <th>Status</th>
                                <th>Decision At</th>
                                <th>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>1</td>
                                <td>{item.finance_1_name || '-'}</td>
                                <td>{statusBadge(item.finance_1_status || '')}</td>
                                <td>{formatDateTime(item.finance_1_decision_at)}</td>
                                <td>{item.finance_1_notes || '-'}</td>
                              </tr>
                              <tr>
                                <td>2</td>
                                <td>{item.finance_2_name || '-'}</td>
                                <td>{statusBadge(item.finance_2_status || '')}</td>
                                <td>{formatDateTime(item.finance_2_decision_at)}</td>
                                <td>{item.finance_2_notes || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
        <div className="card" style={{ minWidth: 0, maxWidth: '100%' }}>
          <div
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
            <table className="table" style={{ minWidth: 1890, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 130 }}>Pooling Number</th>
                  <th style={{ width: 165 }}>Pooling Date</th>
                  <th style={{ width: 170 }}>Dealer</th>
                  <th style={{ width: 170 }}>Consumer Name</th>
                  <th style={{ width: 140 }}>Consumer Phone</th>
                  <th style={{ width: 340 }}>Location</th>
                  <th style={{ width: 150 }}>Job</th>
                  <th style={{ width: 220 }}>Motor Type / OTR</th>
                  <th style={{ width: 150 }}>Finance 1</th>
                  <th style={{ width: 130 }}>Status 1</th>
                  <th style={{ width: 150 }}>Finance 2</th>
                  <th style={{ width: 130 }}>Status 2</th>
                  <th style={{ width: 240 }}>Notes Finance 2</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={15}>No finance migration data.</td>
                  </tr>
                )}
                {rows.map((item, idx) => {
                  const rowNumber = (page - 1) * limit + idx + 1
                  const namedLocation = locationNamesByOrderId[item.order_id]
                  const locationText = [
                    namedLocation?.province || item.province || '-',
                    namedLocation?.regency || item.regency || '-',
                    namedLocation?.district || item.district || '-',
                    item.village || '-',
                    item.address || '-',
                  ].join(', ')
                  const motorOtrText = `${item.motor_type_name || '-'} | ${formatRupiah(Number(item.otr || 0))}`
                  return (
                    <tr key={`${item.order_id}-${idx}`}>
                      <td>{rowNumber}</td>
                      <td title={item.pooling_number || '-'}>{item.pooling_number || '-'}</td>
                      <td title={formatDateTime(item.pooling_at)}>{formatDateTime(item.pooling_at)}</td>
                      <td title={item.dealer_name || '-'}>{item.dealer_name || '-'}</td>
                      <td title={item.consumer_name || '-'}>{item.consumer_name || '-'}</td>
                      <td title={item.consumer_phone || '-'}>{item.consumer_phone || '-'}</td>
                      <td title={locationText}>{locationText}</td>
                      <td title={item.job_name || '-'}>{item.job_name || '-'}</td>
                      <td title={motorOtrText}>{motorOtrText}</td>
                      <td title={item.finance_1_name || '-'}>{item.finance_1_name || '-'}</td>
                      <td>{statusBadge(item.finance_1_status)}</td>
                      <td title={item.finance_2_name || '-'}>{item.finance_2_name || '-'}</td>
                      <td>{statusBadge(item.finance_2_status)}</td>
                      <td title={item.finance_2_notes || '-'}>{item.finance_2_notes || '-'}</td>
                      <td className="action-cell">
                        <ActionMenu
                          items={[
                            {
                              key: 'view',
                              label: 'View',
                              onClick: () =>
                                navigate(`/finance-report/${item.order_id}`, {
                                  state: { row: item },
                                }),
                            },
                          ]}
                        />
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
