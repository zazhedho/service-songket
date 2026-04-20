import { useEffect, useMemo, useState } from 'react'
import { fetchCreditWorksheet } from '../../services/creditService'
import { usePermissions } from '../../hooks/usePermissions'
import CreditFilters from './components/CreditFilters'
import CreditMatrix from './components/CreditMatrix'
import CreditSummary from './components/CreditSummary'
import {
  EMPTY_WORKSHEET,
  formatCompactCurrency,
  normalizeWorksheet,
  paginate,
} from './components/creditHelpers'

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
  motor_types_master: WorksheetMotorMaster[]
  installment_range: InstallmentRangeItem[]
  dp_range: RangeSummaryItem[]
}

type WorksheetMotorMaster = {
  motor_type_id: string
  motor_type_name: string
  installment: number
  regency_code?: string
  regency_name?: string
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
  province_code?: string
  regency_code?: string
}

type MotorOption = {
  motor_type_id: string
  motor_type_name: string
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

export default function CreditPage() {
  const [worksheet, setWorksheet] = useState<WorksheetPayload>(EMPTY_WORKSHEET)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedAreaKey, setSelectedAreaKey] = useState('')
  const [selectedMotorTypeId, setSelectedMotorTypeId] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const { hasPermission } = usePermissions()
  const canList = hasPermission('credit', 'list')

  useEffect(() => {
    if (!canList) return

    const selectedArea = (worksheet.areas || []).find((item) => item.area_key === selectedAreaKey)
    const params: Record<string, unknown> = {}
    if (selectedArea?.province_code) params.province = selectedArea.province_code
    if (selectedArea?.regency_code) params.regency = selectedArea.regency_code
    if (selectedJobId) params.job_id = selectedJobId
    if (selectedMotorTypeId) params.motor_type_id = selectedMotorTypeId
    if (timeFrom) params.from = timeFrom
    if (timeTo) params.to = timeTo

    fetchCreditWorksheet(params)
      .then((res) => setWorksheet(normalizeWorksheet(res.data?.data || res.data)))
      .catch(() => setWorksheet(EMPTY_WORKSHEET))
  }, [canList, selectedAreaKey, selectedJobId, selectedMotorTypeId, timeFrom, timeTo])

  const areas = useMemo(() => worksheet.areas || [], [worksheet])
  const jobsMaster = useMemo(() => worksheet.jobs_master || [], [worksheet])
  const motorsMaster = useMemo(() => worksheet.motor_types_master || [], [worksheet])
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
        province_code: area.province_code,
        regency_code: area.regency_code,
      })
    }
    return Array.from(map.values()).sort((a, b) => a.area_name.localeCompare(b.area_name))
  }, [areas])

  const motorOptions = useMemo(() => {
    const map = new Map<string, MotorOption>()
    for (const row of motorsMaster) {
      const id = String(row?.motor_type_id || '').trim()
      if (!id || map.has(id)) continue
      map.set(id, {
        motor_type_id: id,
        motor_type_name: String(row?.motor_type_name || id).trim(),
      })
    }
    if (map.size === 0) {
      for (const area of areas) {
        for (const matrixRow of area.matrix || []) {
          for (const cell of matrixRow.cells || []) {
            const id = String(cell?.motor_type_id || '').trim()
            if (!id || map.has(id)) continue
            map.set(id, {
              motor_type_id: id,
              motor_type_name: String(cell?.motor_type_name || id).trim(),
            })
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.motor_type_name.localeCompare(b.motor_type_name))
  }, [motorsMaster, areas])

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
    if (!selectedMotorTypeId) return
    if (!motorOptions.some((opt) => opt.motor_type_id === selectedMotorTypeId)) {
      setSelectedMotorTypeId('')
    }
  }, [motorOptions, selectedMotorTypeId])

  useEffect(() => {
    setPage(1)
  }, [selectedJobId, selectedAreaKey, selectedMotorTypeId, timeFrom, timeTo])

  const filteredRows = useMemo(() => {
    const out: MatrixDisplayRow[] = []
    for (const area of areas) {
      if (selectedAreaKey && area.area_key !== selectedAreaKey) continue

      const areaName = area.regency_name || area.regency_code || '-'
      for (const matrixRow of area.matrix || []) {
        const jobID = String(matrixRow?.job_id || '').trim()
        if (selectedJobId && jobID !== selectedJobId) continue

        for (const cell of matrixRow.cells || []) {
          const motorID = String(cell?.motor_type_id || '').trim()
          if (!motorID) continue
          if (selectedMotorTypeId && motorID !== selectedMotorTypeId) continue

          out.push({
            area_key: area.area_key,
            area_name: areaName,
            job_id: jobID,
            job_name: matrixRow?.job_name || jobID || '-',
            motor_type_id: motorID,
            motor_type_name: String(cell?.motor_type_name || motorID).trim(),
            cell,
          })
        }
      }
    }

    out.sort((a, b) => {
      if (a.area_name !== b.area_name) return a.area_name.localeCompare(b.area_name)
      if (a.job_name !== b.job_name) return a.job_name.localeCompare(b.job_name)
      return a.motor_type_name.localeCompare(b.motor_type_name)
    })
    return out
  }, [areas, selectedAreaKey, selectedJobId, selectedMotorTypeId])

  const matrixPagination = useMemo(() => paginate(filteredRows, page, limit), [filteredRows, page, limit])
  useEffect(() => setPage(matrixPagination.safePage), [matrixPagination.safePage])

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
              <CreditFilters
                areaOptions={areaOptions}
                jobOptions={jobOptions}
                motorOptions={motorOptions}
                selectedAreaKey={selectedAreaKey}
                selectedJobId={selectedJobId}
                selectedMotorTypeId={selectedMotorTypeId}
                setSelectedAreaKey={setSelectedAreaKey}
                setSelectedJobId={setSelectedJobId}
                setSelectedMotorTypeId={setSelectedMotorTypeId}
                setTimeFrom={setTimeFrom}
                setTimeTo={setTimeTo}
                timeFrom={timeFrom}
                timeTo={timeTo}
              />

              <CreditSummary
                dpRanges={dpRanges}
                installmentRanges={installmentRanges}
                maxDPRangeTotal={maxDPRangeTotal}
                maxInstallmentTotal={maxInstallmentTotal}
              />

              <CreditMatrix
                limit={limit}
                matrixPagination={matrixPagination}
                setLimit={setLimit}
                setPage={setPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
