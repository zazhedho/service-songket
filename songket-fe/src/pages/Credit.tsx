import { useEffect, useMemo, useState } from 'react'
import { fetchCreditWorksheet } from '../api'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'

type WorksheetCell = {
  motor_type_id: string
  motor_type_name: string
  installment: number
  capability_rate: number
  program_suggestion: number
}

type WorksheetMatrixRow = {
  job_id: string
  job_name: string
  net_income: number
  area: string
  cells: WorksheetCell[]
}

type WorksheetArea = {
  area_key: string
  province_code?: string
  province_name?: string
  regency_code: string
  regency_name: string
  matrix: WorksheetMatrixRow[]
}

type WorksheetJobMaster = {
  job_id: string
  job_name: string
}

type WorksheetPayload = {
  areas: WorksheetArea[]
  jobs_master: WorksheetJobMaster[]
  installment_range: InstallmentRangeItem[]
  dp_range: RangeSummaryItem[]
}

type RangeSummaryItem = {
  label: string
  total: number
  approve: number
  reject: number
  approval_rate: number
}

type InstallmentRangeItem = RangeSummaryItem & {
  range_start: number
  range_end: number
  is_product_range?: boolean
  product_range_hit?: number
}

type JobOption = {
  job_id: string
  job_name: string
}

type AreaOption = {
  area_key: string
  area_name: string
}

type MotorOption = {
  motor_type_id: string
  motor_type_name: string
}

type AreaJobRow = {
  area_key: string
  area_name: string
  job_id: string
  job_name: string
  cells_by_motor: Record<string, WorksheetCell>
}

type MatrixDisplayRow = {
  area_key: string
  area_name: string
  job_id: string
  job_name: string
  motor_type_id: string
  motor_type_name: string
  cell?: WorksheetCell
}

const EMPTY_WORKSHEET: WorksheetPayload = {
  areas: [],
  jobs_master: [],
  installment_range: [],
  dp_range: [],
}

function normalizeWorksheet(raw: unknown): WorksheetPayload {
  const data = (raw || {}) as Partial<WorksheetPayload>
  return {
    areas: Array.isArray(data.areas) ? data.areas : [],
    jobs_master: Array.isArray(data.jobs_master) ? data.jobs_master : [],
    installment_range: Array.isArray(data.installment_range) ? (data.installment_range as InstallmentRangeItem[]) : [],
    dp_range: Array.isArray(data.dp_range) ? (data.dp_range as RangeSummaryItem[]) : [],
  }
}

function paginate<T>(items: T[], page: number, limit: number) {
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

function normalizeNeedle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function rateCellStyle(rate: number) {
  const value = Number(rate || 0)
  if (value > 0.4) {
    return { background: '#fecaca', color: '#b91c1c', fontWeight: 700 }
  }
  if (value > 0.35) {
    return { background: '#fef08a', color: '#a16207', fontWeight: 700 }
  }
  return { background: '#22c55e', color: '#052e16', fontWeight: 700 }
}

export default function CreditPage() {
  const [worksheet, setWorksheet] = useState<WorksheetPayload>(EMPTY_WORKSHEET)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedAreaKey, setSelectedAreaKey] = useState('')
  const [motorSearch, setMotorSearch] = useState('')

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_credit')

  useEffect(() => {
    if (!canList) return
    fetchCreditWorksheet()
      .then((res) => setWorksheet(normalizeWorksheet(res.data?.data || res.data)))
      .catch(() => setWorksheet(EMPTY_WORKSHEET))
  }, [canList])

  const areas = useMemo(() => worksheet.areas || [], [worksheet])
  const jobsMaster = useMemo(() => worksheet.jobs_master || [], [worksheet])
  const installmentRanges = useMemo(() => worksheet.installment_range || [], [worksheet])
  const dpRanges = useMemo(() => worksheet.dp_range || [], [worksheet])

  const jobOptions = useMemo(() => {
    const map = new Map<string, JobOption>()
    for (const area of areas) {
      for (const row of area.matrix || []) {
        if (!row?.job_id || map.has(row.job_id)) continue
        map.set(row.job_id, {
          job_id: row.job_id,
          job_name: row.job_name || row.job_id,
        })
      }
    }
    if (map.size === 0) {
      for (const row of jobsMaster) {
        if (!row?.job_id || map.has(row.job_id)) continue
        map.set(row.job_id, {
          job_id: row.job_id,
          job_name: row.job_name || row.job_id,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.job_name.localeCompare(b.job_name))
  }, [areas, jobsMaster])

  const areaOptions = useMemo(() => {
    const map = new Map<string, AreaOption>()
    for (const area of areas) {
      if (!area?.area_key) continue
      map.set(area.area_key, {
        area_key: area.area_key,
        area_name: area.regency_name || area.regency_code || '-',
      })
    }
    return Array.from(map.values()).sort((a, b) => a.area_name.localeCompare(b.area_name))
  }, [areas])

  useEffect(() => {
    if (!selectedJobId) return
    if (!jobOptions.some((opt) => opt.job_id === selectedJobId)) {
      setSelectedJobId('')
    }
  }, [jobOptions, selectedJobId])

  useEffect(() => {
    if (!selectedAreaKey) return
    if (!areaOptions.some((opt) => opt.area_key === selectedAreaKey)) {
      setSelectedAreaKey('')
    }
  }, [areaOptions, selectedAreaKey])

  useEffect(() => {
    setPage(1)
  }, [selectedJobId, selectedAreaKey, motorSearch])

  const filteredRows = useMemo(() => {
    const out: AreaJobRow[] = []
    for (const area of areas) {
      if (selectedAreaKey && area.area_key !== selectedAreaKey) continue

      const areaName = area.regency_name || area.regency_code || '-'
      for (const matrixRow of area.matrix || []) {
        const jobID = String(matrixRow?.job_id || '').trim()
        if (selectedJobId && jobID !== selectedJobId) continue

        const cellsByMotor: Record<string, WorksheetCell> = {}
        for (const cell of matrixRow.cells || []) {
          if (!cell?.motor_type_id) continue
          cellsByMotor[cell.motor_type_id] = cell
        }

        out.push({
          area_key: area.area_key,
          area_name: areaName,
          job_id: jobID,
          job_name: matrixRow?.job_name || jobID || '-',
          cells_by_motor: cellsByMotor,
        })
      }
    }
    return out
  }, [areas, selectedAreaKey, selectedJobId])

  const motorColumns = useMemo(() => {
    const map = new Map<string, MotorOption>()
    for (const area of filteredRows) {
      for (const cell of Object.values(area.cells_by_motor)) {
        if (!cell?.motor_type_id || map.has(cell.motor_type_id)) continue
        map.set(cell.motor_type_id, {
          motor_type_id: cell.motor_type_id,
          motor_type_name: cell.motor_type_name || cell.motor_type_id,
        })
      }
    }
    const all = Array.from(map.values()).sort((a, b) => a.motor_type_name.localeCompare(b.motor_type_name))
    const needle = normalizeNeedle(motorSearch)
    if (!needle) return all
    return all.filter((item) => normalizeNeedle(item.motor_type_name).includes(needle))
  }, [filteredRows, motorSearch])

  const displayRows = useMemo(() => {
    const motors = motorColumns.length > 0 ? motorColumns : [{ motor_type_id: '', motor_type_name: '-' }]
    const rows: MatrixDisplayRow[] = []

    for (const row of filteredRows) {
      for (const motor of motors) {
        rows.push({
          area_key: row.area_key,
          area_name: row.area_name,
          job_id: row.job_id,
          job_name: row.job_name,
          motor_type_id: motor.motor_type_id,
          motor_type_name: motor.motor_type_name,
          cell: motor.motor_type_id ? row.cells_by_motor[motor.motor_type_id] : undefined,
        })
      }
    }

    return rows
  }, [filteredRows, motorColumns])

  const matrixPagination = useMemo(() => paginate(displayRows, page, limit), [displayRows, page, limit])
  useEffect(() => setPage(matrixPagination.safePage), [matrixPagination.safePage])

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0,
      useGrouping: false,
    }).format(Number(value || 0))

  const formatPercent = (value: number) => `${(Number(value || 0) * 100).toFixed(2)}%`
  const formatApprovalRate = (value: number) => `${Number(value || 0).toFixed(2)}%`
  const formatCompactCurrency = (value: number) => {
    const numeric = Number(value || 0)
    if (numeric >= 1000000) return `Rp ${(numeric / 1000000).toFixed(2)}M`
    if (numeric >= 1000) return `Rp ${(numeric / 1000).toFixed(0)}K`
    return `Rp ${numeric.toFixed(0)}`
  }
  const formatInstallmentRangeLabel = (item: InstallmentRangeItem) =>
    `${formatCompactCurrency(item.range_start)} - < ${formatCompactCurrency(item.range_end)}`
  const maxInstallmentTotal = useMemo(
    () => Math.max(1, ...installmentRanges.map((item) => Number(item.total || 0))),
    [installmentRanges],
  )
  const maxDPRangeTotal = useMemo(() => Math.max(1, ...dpRanges.map((item) => Number(item.total || 0))), [dpRanges])

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Credit Capability</div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          {!canList && <div className="alert">No permission to view data.</div>}

          {canList && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div>
                  <label htmlFor="credit-job-select">Select Pekerjaan</label>
                  <select id="credit-job-select" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                    <option value="">Semua Pekerjaan</option>
                    {jobOptions.map((job) => (
                      <option key={job.job_id} value={job.job_id}>
                        {job.job_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="credit-area-select">Pilih Area</label>
                  <select id="credit-area-select" value={selectedAreaKey} onChange={(e) => setSelectedAreaKey(e.target.value)}>
                    <option value="">Semua Area</option>
                    {areaOptions.map((area) => (
                      <option key={area.area_key} value={area.area_key}>
                        {area.area_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="credit-motor-search">Search by Tipe Motor</label>
                  <input
                    id="credit-motor-search"
                    value={motorSearch}
                    onChange={(e) => setMotorSearch(e.target.value)}
                    placeholder="Ketik nama tipe motor"
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 12,
                    background: '#fff',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Installment Range</div>
                  <div style={{ color: '#475569', fontSize: 12, marginBottom: 10 }}>
                    Highlighted bars represent product installment ranges.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
                    <div>
                      {installmentRanges.map((item) => {
                        const total = Number(item.total || 0)
                        const width = Math.max(total > 0 ? 3 : 0, (total / maxInstallmentTotal) * 100)
                        const isHighlighted = Boolean(item.is_product_range)
                        return (
                          <div key={`${item.range_start}-${item.range_end}`} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: '#334155' }}>
                              <span>{formatInstallmentRangeLabel(item)}</span>
                              <span>{total}</span>
                            </div>
                            <div style={{ marginTop: 4, height: 12, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${width}%`,
                                  height: '100%',
                                  background: isHighlighted ? '#1d4ed8' : '#94a3b8',
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                      {installmentRanges.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>No installment range data.</div>}
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="table compact-table">
                        <thead>
                          <tr>
                            <th>Range</th>
                            <th>Approval Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {installmentRanges.map((item) => (
                            <tr key={`installment-rate-${item.range_start}-${item.range_end}`}>
                              <td>{formatInstallmentRangeLabel(item)}</td>
                              <td>{formatApprovalRate(item.approval_rate)}</td>
                            </tr>
                          ))}
                          {installmentRanges.length === 0 && (
                            <tr>
                              <td colSpan={2}>No data.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 12,
                    background: '#fff',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>DP Range</div>
                  <div style={{ color: '#475569', fontSize: 12, marginBottom: 10 }}>
                    Approval rate by DP percentage range.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
                    <div>
                      {dpRanges.map((item) => {
                        const total = Number(item.total || 0)
                        const width = Math.max(total > 0 ? 3 : 0, (total / maxDPRangeTotal) * 100)
                        return (
                          <div key={`dp-range-${item.label}`} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: '#334155' }}>
                              <span>{item.label}</span>
                              <span>{total}</span>
                            </div>
                            <div style={{ marginTop: 4, height: 12, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${width}%`,
                                  height: '100%',
                                  background: '#0ea5e9',
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                      {dpRanges.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>No DP range data.</div>}
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="table compact-table">
                        <thead>
                          <tr>
                            <th>Range</th>
                            <th>Approval Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dpRanges.map((item) => (
                            <tr key={`dp-rate-${item.label}`}>
                              <td>{item.label}</td>
                              <td>{formatApprovalRate(item.approval_rate)}</td>
                            </tr>
                          ))}
                          {dpRanges.length === 0 && (
                            <tr>
                              <td colSpan={2}>No data.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table compact-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>Area</th>
                      <th rowSpan={2}>Pekerjaan</th>
                      <th colSpan={2}>Credit Capability</th>
                      <th colSpan={2}>Program Suggestion</th>
                    </tr>
                    <tr>
                      <th>Tipe Motor</th>
                      <th>Rate</th>
                      <th>Tipe Motor</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixPagination.pageItems.length === 0 && (
                      <tr>
                        <td colSpan={6}>No data for current filter.</td>
                      </tr>
                    )}

                    {matrixPagination.pageItems.map((row, idx) => {
                      const style = row.cell ? rateCellStyle(row.cell.capability_rate) : undefined
                      return (
                        <tr key={`${row.area_key}-${row.job_id || 'all'}-${row.motor_type_id || 'empty'}-${idx}`}>
                          <td>{row.area_name}</td>
                          <td>{row.job_name || '-'}</td>
                          <td>{row.motor_type_name}</td>
                          <td style={style}>{row.cell ? formatPercent(row.cell.capability_rate) : '-'}</td>
                          <td>{row.motor_type_name}</td>
                          <td style={style}>{row.cell ? formatNumber(row.cell.program_suggestion) : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 8 }}>
                <Pagination
                  page={matrixPagination.safePage}
                  totalPages={matrixPagination.totalPages}
                  totalData={matrixPagination.totalData}
                  limit={limit}
                  onPageChange={setPage}
                  onLimitChange={(value) => {
                    setLimit(value)
                    setPage(1)
                  }}
                  limitOptions={[5, 10, 20]}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
