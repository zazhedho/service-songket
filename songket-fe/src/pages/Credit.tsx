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
  regency_code: string
  regency_name: string
  matrix: WorksheetMatrixRow[]
}

type WorksheetJobMaster = {
  job_id: string
  job_name: string
  net_income: number
  regency_code: string
  regency_name: string
}

type WorksheetMotorMaster = {
  motor_type_id: string
  motor_type_name: string
  installment: number
  regency_code: string
  regency_name: string
}

type WorksheetPayload = {
  areas: WorksheetArea[]
  jobs_master: WorksheetJobMaster[]
  motor_types_master: WorksheetMotorMaster[]
}

type JobOption = {
  job_id: string
  job_name: string
}

type MotorOption = {
  motor_type_id: string
  motor_type_name: string
}

type AreaRow = {
  area_key: string
  area_name: string
  cells_by_motor: Record<string, WorksheetCell>
}

const EMPTY_WORKSHEET: WorksheetPayload = {
  areas: [],
  jobs_master: [],
  motor_types_master: [],
}

function normalizeWorksheet(raw: unknown): WorksheetPayload {
  const data = (raw || {}) as Partial<WorksheetPayload>
  return {
    areas: Array.isArray(data.areas) ? data.areas : [],
    jobs_master: Array.isArray(data.jobs_master) ? data.jobs_master : [],
    motor_types_master: Array.isArray(data.motor_types_master) ? data.motor_types_master : [],
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

  const [jobsPage, setJobsPage] = useState(1)
  const [jobsLimit, setJobsLimit] = useState(5)
  const [motorsPage, setMotorsPage] = useState(1)
  const [motorsLimit, setMotorsLimit] = useState(5)
  const [matrixPage, setMatrixPage] = useState(1)
  const [matrixLimit, setMatrixLimit] = useState(5)

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
  const motorsMaster = useMemo(() => worksheet.motor_types_master || [], [worksheet])

  // Dropdown source from matrix-first, fallback to master list.
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

  useEffect(() => {
    if (jobOptions.length === 0) {
      setSelectedJobId('')
      return
    }
    if (!selectedJobId || !jobOptions.some((opt) => opt.job_id === selectedJobId)) {
      setSelectedJobId(jobOptions[0].job_id)
    }
  }, [jobOptions, selectedJobId])

  useEffect(() => {
    setMatrixPage(1)
  }, [selectedJobId])

  const selectedRows = useMemo(() => {
    if (!selectedJobId) return [] as AreaRow[]
    const out: AreaRow[] = []
    for (const area of areas) {
      const matrixRow = (area.matrix || []).find((row) => row.job_id === selectedJobId)
      if (!matrixRow) continue
      const cellsByMotor: Record<string, WorksheetCell> = {}
      for (const cell of matrixRow.cells || []) {
        if (!cell?.motor_type_id) continue
        cellsByMotor[cell.motor_type_id] = cell
      }
      out.push({
        area_key: area.area_key,
        area_name: area.regency_name || area.regency_code || '-',
        cells_by_motor: cellsByMotor,
      })
    }
    return out
  }, [areas, selectedJobId])

  const motorColumns = useMemo(() => {
    const map = new Map<string, MotorOption>()
    for (const area of selectedRows) {
      for (const cell of Object.values(area.cells_by_motor)) {
        if (!cell?.motor_type_id || map.has(cell.motor_type_id)) continue
        map.set(cell.motor_type_id, {
          motor_type_id: cell.motor_type_id,
          motor_type_name: cell.motor_type_name || cell.motor_type_id,
        })
      }
    }

    if (map.size === 0) {
      for (const motor of motorsMaster) {
        if (!motor?.motor_type_id || map.has(motor.motor_type_id)) continue
        map.set(motor.motor_type_id, {
          motor_type_id: motor.motor_type_id,
          motor_type_name: motor.motor_type_name || motor.motor_type_id,
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => a.motor_type_name.localeCompare(b.motor_type_name))
  }, [motorsMaster, selectedRows])

  const jobsPagination = useMemo(() => paginate(jobsMaster, jobsPage, jobsLimit), [jobsMaster, jobsPage, jobsLimit])
  const motorsPagination = useMemo(() => paginate(motorsMaster, motorsPage, motorsLimit), [motorsMaster, motorsPage, motorsLimit])
  const matrixPagination = useMemo(() => paginate(selectedRows, matrixPage, matrixLimit), [selectedRows, matrixPage, matrixLimit])

  useEffect(() => setJobsPage(jobsPagination.safePage), [jobsPagination.safePage])
  useEffect(() => setMotorsPage(motorsPagination.safePage), [motorsPagination.safePage])
  useEffect(() => setMatrixPage(matrixPagination.safePage), [matrixPagination.safePage])

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0,
      useGrouping: false,
    }).format(Number(value || 0))

  const formatPercent = (value: number) => `${(Number(value || 0) * 100).toFixed(2)}%`

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
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
                <div className="card" style={{ margin: 0 }}>
                  <table className="table compact-table">
                    <thead>
                      <tr>
                        <th>Pekerjaan</th>
                        <th>Net income</th>
                        <th>Area</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobsPagination.pageItems.map((job) => (
                        <tr key={`${job.job_id}-${job.regency_code}`}>
                          <td>{job.job_name || '-'}</td>
                          <td>{formatNumber(job.net_income)}</td>
                          <td>{job.regency_name || '-'}</td>
                        </tr>
                      ))}
                      {jobsPagination.pageItems.length === 0 && (
                        <tr>
                          <td colSpan={3}>No data.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 8 }}>
                    <Pagination
                      page={jobsPagination.safePage}
                      totalPages={jobsPagination.totalPages}
                      totalData={jobsPagination.totalData}
                      limit={jobsLimit}
                      onPageChange={setJobsPage}
                      onLimitChange={(value) => {
                        setJobsLimit(value)
                        setJobsPage(1)
                      }}
                      limitOptions={[5, 10, 20, 50]}
                    />
                  </div>
                </div>

                <div className="card" style={{ margin: 0 }}>
                  <table className="table compact-table">
                    <thead>
                      <tr>
                        <th>Tipe Motor</th>
                        <th>Angsuran</th>
                        <th>Area</th>
                      </tr>
                    </thead>
                    <tbody>
                      {motorsPagination.pageItems.map((motor) => (
                        <tr key={`${motor.motor_type_id}-${motor.regency_code}`}>
                          <td>{motor.motor_type_name || '-'}</td>
                          <td>{formatNumber(motor.installment)}</td>
                          <td>{motor.regency_name || '-'}</td>
                        </tr>
                      ))}
                      {motorsPagination.pageItems.length === 0 && (
                        <tr>
                          <td colSpan={3}>No data.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 8 }}>
                    <Pagination
                      page={motorsPagination.safePage}
                      totalPages={motorsPagination.totalPages}
                      totalData={motorsPagination.totalData}
                      limit={motorsLimit}
                      onPageChange={setMotorsPage}
                      onLimitChange={(value) => {
                        setMotorsLimit(value)
                        setMotorsPage(1)
                      }}
                      limitOptions={[5, 10, 20, 50]}
                    />
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <div style={{ maxWidth: 260, marginBottom: 8 }}>
                  <label htmlFor="credit-job-select">Select Pekerjaan</label>
                  <select id="credit-job-select" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                    {jobOptions.map((job) => (
                      <option key={job.job_id} value={job.job_id}>
                        {job.job_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="table compact-table">
                    <thead>
                      <tr>
                        <th rowSpan={2}>Area</th>
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
                          <td colSpan={5}>No data for selected pekerjaan.</td>
                        </tr>
                      )}

                      {matrixPagination.pageItems.map((area) => {
                        const motors = motorColumns.length > 0 ? motorColumns : [{ motor_type_id: '', motor_type_name: '-' }]
                        return motors.map((motor, idx) => {
                          const cell = motor.motor_type_id ? area.cells_by_motor[motor.motor_type_id] : undefined
                          const style = cell ? rateCellStyle(cell.capability_rate) : undefined
                          return (
                            <tr key={`${area.area_key}-${motor.motor_type_id || 'empty'}-${idx}`}>
                              {idx === 0 && <td rowSpan={motors.length}>{area.area_name}</td>}
                              <td>{motor.motor_type_name}</td>
                              <td style={style}>{cell ? formatPercent(cell.capability_rate) : '-'}</td>
                              <td>{motor.motor_type_name}</td>
                              <td style={style}>{cell ? formatNumber(cell.program_suggestion) : '-'}</td>
                            </tr>
                          )
                        })
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 8 }}>
                  <Pagination
                    page={matrixPagination.safePage}
                    totalPages={matrixPagination.totalPages}
                    totalData={matrixPagination.totalData}
                    limit={matrixLimit}
                    onPageChange={setMatrixPage}
                    onLimitChange={(value) => {
                      setMatrixLimit(value)
                      setMatrixPage(1)
                    }}
                    limitOptions={[5, 10, 20]}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
