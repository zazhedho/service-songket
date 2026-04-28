import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createJob,
  deleteJob,
  getJob,
  listJobs,
  updateJob,
} from '../../services/jobService'
import {
  createNetIncome,
  deleteNetIncome,
  getNetIncome,
  listNetIncome,
  updateNetIncome,
} from '../../services/netIncomeService'
import { useAlert, useConfirm } from '../../components/common/ConfirmDialog'
import { useLocationOptions } from '../../hooks/useLocationOptions'
import { usePermissions } from '../../hooks/usePermissions'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../../utils/currency'
import { focusFirstInvalidField } from '../../utils/formFocus'
import JobDetail from './components/JobDetail'
import JobForm from './components/JobForm'
import JobList from './components/JobList'

type OptionItem = {
  code: string
  name: string
}

type JobItem = {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

type NetIncomeArea = {
  province_code: string
  province_name: string
  regency_code: string
  regency_name: string
}

type NetIncomeItem = {
  id: string
  job_id: string
  job_name?: string
  net_income: number
  area_net_income: NetIncomeArea[]
  created_at?: string
  updated_at?: string
}

type CombinedItem = {
  id: string
  job_id: string
  net_income_id: string
  name: string
  net_income: number
  area_net_income: NetIncomeArea[]
  created_at?: string
  updated_at?: string
}

function normalizeCombinedItem(rawJob?: any, rawNetIncome?: any): CombinedItem | null {
  const jobId = String(rawNetIncome?.job_id || rawJob?.job_id || rawJob?.id || '').trim()
  if (!jobId) return null

  return {
    id: String(rawNetIncome?.id || rawJob?.id || jobId).trim(),
    job_id: jobId,
    net_income_id: String(rawNetIncome?.id || rawJob?.net_income_id || '').trim(),
    name: String(rawJob?.name || rawNetIncome?.job_name || rawJob?.job_name || '').trim(),
    net_income: Number(rawNetIncome?.net_income ?? rawJob?.net_income ?? 0),
    area_net_income: normalizeAreaInput(rawNetIncome?.area_net_income ?? rawJob?.area_net_income),
    created_at: rawNetIncome?.created_at || rawJob?.created_at,
    updated_at: rawNetIncome?.updated_at || rawJob?.updated_at,
  }
}

const emptyForm = {
  name: '',
  net_income: '0',
  province_code: '',
  regency_code: '',
  selected_areas: [] as NetIncomeArea[],
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/jobs\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function normalizeAreaInput(raw: any): NetIncomeArea[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const out: NetIncomeArea[] = []

  raw.forEach((entry) => {
    if (typeof entry === 'string') {
      const val = entry.trim()
      if (!val) return
      const key = `|${val}|${val}`.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      out.push({
        province_code: '',
        province_name: '',
        regency_code: val,
        regency_name: val,
      })
      return
    }

    if (!entry || typeof entry !== 'object') return

    const provinceCode = String(entry.province_code || '').trim()
    const provinceName = String(entry.province_name || '').trim()
    const regencyCode = String(entry.regency_code || '').trim()
    const regencyName = String(entry.regency_name || '').trim()

    if (!regencyCode && !regencyName) return

    const normalized: NetIncomeArea = {
      province_code: provinceCode,
      province_name: provinceName,
      regency_code: regencyCode || regencyName,
      regency_name: regencyName || regencyCode,
    }

    const key = `${normalized.province_code}|${normalized.regency_code}|${normalized.regency_name}`.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(normalized)
  })

  return out
}

function normalizeNetIncomeItem(raw: any): NetIncomeItem {
  return {
    id: String(raw?.id || ''),
    job_id: String(raw?.job_id || ''),
    job_name: raw?.job_name || '',
    net_income: Number(raw?.net_income || 0),
    area_net_income: normalizeAreaInput(raw?.area_net_income),
    created_at: raw?.created_at,
    updated_at: raw?.updated_at,
  }
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US')
}

function looksLikeLocationCode(value?: string) {
  const raw = String(value || '').trim()
  if (!raw) return false
  if (/^\d+$/.test(raw)) return true
  if (!/\s/.test(raw) && /^[A-Z0-9._-]+$/.test(raw) && /[0-9._-]/.test(raw)) return true
  return false
}

function areaLabel(area: NetIncomeArea) {
  const regencyName = String(area.regency_name || '').trim()
  if (regencyName && !looksLikeLocationCode(regencyName)) return regencyName
  return '-'
}

function errorMessage(err: any, fallback: string) {
  const raw = err?.response?.data?.error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object' && typeof raw.message === 'string' && raw.message.trim()) return raw.message
  return fallback
}

export default function JobsPage() {
  const showAlert = useAlert()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const { hasAnyPermission, hasPermission } = usePermissions()
  const canList = hasAnyPermission([
    { resource: 'jobs', action: 'list' },
    { resource: 'net_income', action: 'list' },
  ])
  const canCreate = hasPermission('jobs', 'create') && hasPermission('net_income', 'create')
  const canUpdate = hasPermission('jobs', 'update') && hasAnyPermission([
    { resource: 'net_income', action: 'update' },
    { resource: 'net_income', action: 'create' },
  ])
  const canDelete = hasPermission('jobs', 'delete')
  const confirm = useConfirm()

  const [items, setItems] = useState<CombinedItem[]>([])
  const [allItems, setAllItems] = useState<CombinedItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const [detailLoading, setDetailLoading] = useState(false)
  const [fetchedItem, setFetchedItem] = useState<CombinedItem | null>(null)

  const stateItem = (location.state as any)?.item || null
  const isFormMode = isCreate || isEdit
  const {
    provinces,
    regencies: kabupaten,
  } = useLocationOptions({
    enabled: isFormMode,
    provinceCode: form.province_code,
  })

  const load = async () => {
    const [jobRes, netRes] = await Promise.all([
      listJobs({ page: 1, limit: 1000 }).catch(() => ({ data: { data: [] } } as any)),
      listNetIncome({ page: 1, limit: 1000 }).catch(() => ({ data: { data: [] } } as any)),
    ])

    const jobData = jobRes.data?.data || jobRes.data || []
    const netData = netRes.data?.data || netRes.data || []

    const jobs: JobItem[] = Array.isArray(jobData) ? jobData : []
    const netItems: NetIncomeItem[] = Array.isArray(netData) ? netData.map((item: any) => normalizeNetIncomeItem(item)) : []
    const jobsByID = new Map<string, JobItem>()
    jobs.forEach((job) => {
      if (job.id) jobsByID.set(job.id, job)
    })

    const merged = netItems.map((income) => {
      const job = jobsByID.get(income.job_id)
      return {
        id: income.id,
        job_id: income.job_id,
        net_income_id: income.id,
        name: income.job_name || job?.name || '',
        net_income: Number(income.net_income || 0),
        area_net_income: normalizeAreaInput(income.area_net_income),
        created_at: income.created_at || job?.created_at,
        updated_at: income.updated_at || job?.updated_at,
      } as CombinedItem
    })

    const orphanJobs = jobs
      .filter((job) => !netItems.some((income) => income.job_id === job.id))
      .map((job) => ({
        id: job.id,
        job_id: job.id,
        net_income_id: '',
        name: job.name || '',
        net_income: 0,
        area_net_income: [],
        created_at: job.created_at,
        updated_at: job.updated_at,
      } as CombinedItem))

    const rows = [...merged, ...orphanJobs]

    const keyword = search.trim().toLowerCase()
    const filtered = keyword
      ? rows.filter((item) => item.name.toLowerCase().includes(keyword))
      : rows

    const nextTotalPages = Math.max(1, Math.ceil(filtered.length / limit) || 1)
    const safePage = Math.min(page, nextTotalPages)
    const offset = (safePage - 1) * limit

    setAllItems(filtered)
    setItems(filtered.slice(offset, offset + limit))
    setTotalPages(nextTotalPages)
    setTotalData(filtered.length)

    if (safePage !== page) {
      setPage(safePage)
    }
  }

  useEffect(() => {
    if (!canList || !isList) return

    load().catch(() => {
      setItems([])
      setAllItems([])
    })
  }, [canList, isList, limit, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    const normalizedStateItem =
      stateItem && (stateItem?.id === selectedId || stateItem?.net_income_id === selectedId || stateItem?.job_id === selectedId)
        ? normalizeCombinedItem(
            stateItem?.net_income_id ? { id: stateItem.job_id, name: stateItem.name } : stateItem,
            stateItem?.net_income_id ? stateItem : null,
          )
        : null
    return (
      allItems.find((item) => item.id === selectedId || item.job_id === selectedId || item.net_income_id === selectedId) ||
      normalizedStateItem ||
      (fetchedItem?.id === selectedId || fetchedItem?.job_id === selectedId ? fetchedItem : null)
    )
  }, [allItems, fetchedItem, selectedId, stateItem])

  useEffect(() => {
    if (!(isDetail || isEdit) || !selectedId || selectedItem) return

    setDetailLoading(true)

    getNetIncome(selectedId)
      .then((res) => {
        const netData = res.data?.data || res.data || null
        const normalizedNetIncome = netData ? normalizeNetIncomeItem(netData) : null
        if (!normalizedNetIncome) {
          setFetchedItem(null)
          return
        }
        setFetchedItem(normalizeCombinedItem({ id: normalizedNetIncome.job_id, name: normalizedNetIncome.job_name }, normalizedNetIncome))
      })
      .catch(async () => {
        const jobRes = await getJob(selectedId).catch(() => null)
        const jobData = jobRes?.data?.data || jobRes?.data || null
        setFetchedItem(normalizeCombinedItem(jobData))
      })
      .finally(() => setDetailLoading(false))
  }, [isDetail, isEdit, selectedId, selectedItem])

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm)
      setError('')
      return
    }

    if (isEdit && selectedItem) {
      setForm({
        name: selectedItem.name || '',
        net_income: formatRupiahInput(String(selectedItem.net_income ?? 0)),
        province_code: '',
        regency_code: '',
        selected_areas: normalizeAreaInput(selectedItem.area_net_income),
      })
      setError('')
    }
  }, [isCreate, isEdit, selectedItem])

  const addArea = () => {
    const province = provinces.find((item) => item.code === form.province_code)
    const regency = kabupaten.find((item) => item.code === form.regency_code)

    if (!province) {
      focusFirstInvalidField('province_code')
      setError('Province is required')
      return
    }
    if (!regency) {
      focusFirstInvalidField('regency_code')
      setError('Regency/City is required')
      return
    }

    const nextArea: NetIncomeArea = {
      province_code: province.code,
      province_name: province.name,
      regency_code: regency.code,
      regency_name: regency.name,
    }

    const exists = form.selected_areas.some(
      (item) => item.province_code === nextArea.province_code && item.regency_code === nextArea.regency_code,
    )
    if (exists) {
      setError('Selected area already exists')
      return
    }

    setError('')
    setForm((prev) => ({
      ...prev,
      selected_areas: [...prev.selected_areas, nextArea],
      regency_code: '',
    }))
  }

  const removeArea = (index: number) => {
    setForm((prev) => ({
      ...prev,
      selected_areas: prev.selected_areas.filter((_, idx) => idx !== index),
    }))
  }

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    const name = form.name.trim()
    const netIncome = parseRupiahInput(form.net_income)
    const areas = normalizeAreaInput(form.selected_areas)

    if (!name) {
      focusFirstInvalidField('name')
      setError('Job name is required')
      return
    }
    if (Number.isNaN(netIncome) || netIncome < 0) {
      focusFirstInvalidField('net_income')
      setError('Net income must be a number >= 0')
      return
    }
    if (areas.length === 0) {
      focusFirstInvalidField('province_code')
      setError('At least one area is required')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (isEdit && selectedItem) {
        await updateJob(selectedItem.job_id, { name })

        if (selectedItem?.net_income_id) {
          await updateNetIncome(selectedItem.net_income_id, {
            job_id: selectedItem.job_id,
            net_income: netIncome,
            area_net_income: areas,
          })
        } else {
          await createNetIncome({
            job_id: selectedItem.job_id,
            net_income: netIncome,
            area_net_income: areas,
          })
        }
      } else {
        const jobLookup = await listJobs({ page: 1, limit: 1000, search: name }).catch(() => ({ data: { data: [] } } as any))
        const foundJobs = Array.isArray(jobLookup.data?.data) ? jobLookup.data.data : Array.isArray(jobLookup.data) ? jobLookup.data : []
        const existingJob = foundJobs.find((job: any) => String(job?.name || '').trim().toLowerCase() === name.toLowerCase())

        let jobId = String(existingJob?.id || '').trim()
        let createdJob = false
        if (!jobId) {
          const jobRes = await createJob({ name })
          const job = jobRes.data?.data || jobRes.data
          jobId = String(job?.id || '').trim()
          createdJob = true
        }
        if (!jobId) {
          throw new Error('Failed to create job')
        }

        try {
          await createNetIncome({
            job_id: jobId,
            net_income: netIncome,
            area_net_income: areas,
          })
        } catch (err) {
          if (createdJob) {
            await deleteJob(jobId).catch(() => undefined)
          }
          throw err
        }
      }

      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/jobs')
    } catch (err: any) {
      const message = errorMessage(err, 'Failed to save jobs and net income')
      setError(message)
      await showAlert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (item: CombinedItem) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Job & Net Income',
      description: 'Are you sure you want to delete this job and net income data?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    try {
      if (item.net_income_id) {
        await deleteNetIncome(item.net_income_id).catch(() => undefined)
      }

      const latestNetIncomesRes = await listNetIncome({ page: 1, limit: 1000 }).catch(() => ({ data: { data: [] } } as any))
      const latestNetIncomesData = latestNetIncomesRes.data?.data || latestNetIncomesRes.data || []
      const latestNetIncomes = Array.isArray(latestNetIncomesData) ? latestNetIncomesData.map((row: any) => normalizeNetIncomeItem(row)) : []
      if (!latestNetIncomes.some((row) => row.job_id === item.job_id)) {
        await deleteJob(item.job_id).catch(() => undefined)
      }
      await load()
    } catch (err: any) {
      await showAlert(errorMessage(err, 'Failed to delete job'))
    }
  }

  const detailAreaRows = normalizeAreaInput(selectedItem?.area_net_income)
  const detailJobName = selectedItem?.name || '-'
  const detailNetIncomeValue = Number(selectedItem?.net_income ?? 0)
  const detailCreatedAt = formatDate(selectedItem?.created_at)
  const detailUpdatedAt = formatDate(selectedItem?.updated_at)

  if (isDetail) {
    return (
      <JobDetail
        canUpdate={canUpdate}
        detailAreaRows={detailAreaRows}
        detailCreatedAt={detailCreatedAt}
        detailJobName={detailJobName}
        detailLoading={detailLoading}
        detailNetIncomeValue={detailNetIncomeValue}
        detailUpdatedAt={detailUpdatedAt}
        formatRupiah={formatRupiah}
        navigate={navigate}
        selectedId={selectedId}
        selectedItem={selectedItem}
      />
    )
  }

  if (isCreate || isEdit) {
    return (
      <JobForm
        addArea={addArea}
        areaLabel={areaLabel}
        canCreate={canCreate}
        canUpdate={canUpdate}
        error={error}
        form={form}
        isCreate={isCreate}
        isEdit={isEdit}
        kabupaten={kabupaten}
        loading={loading}
        navigate={navigate}
        provinces={provinces}
        removeArea={removeArea}
        save={save}
        setForm={(updater) =>
          setForm((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater
            if (next?.net_income !== undefined && typeof next.net_income === 'string') {
              return { ...next, net_income: formatRupiahInput(next.net_income) }
            }
            return next
          })
        }
      />
    )
  }

  return (
    <JobList
      areaLabel={areaLabel}
      canCreate={canCreate}
      canDelete={canDelete}
      canList={canList}
      canUpdate={canUpdate}
      formatDate={formatDate}
      formatRupiah={formatRupiah}
      items={items}
      limit={limit}
      navigate={navigate}
      page={page}
      remove={remove}
      search={search}
      setLimit={setLimit}
      setPage={setPage}
      setSearch={setSearch}
      totalData={totalData}
      totalPages={totalPages}
    />
  )
}
