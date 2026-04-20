import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createNetIncome,
  deleteNetIncome,
  getNetIncome,
  listNetIncome,
  updateNetIncome,
} from '../../services/netIncomeService'
import { listJobs } from '../../services/jobService'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useLocationOptions } from '../../hooks/useLocationOptions'
import { usePermissions } from '../../hooks/usePermissions'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../../utils/currency'
import NetIncomeDetail from './components/NetIncomeDetail'
import NetIncomeForm from './components/NetIncomeForm'
import NetIncomeList from './components/NetIncomeList'

type OptionItem = {
  code: string
  name: string
}

type JobItem = {
  id: string
  name: string
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

const emptyForm = {
  job_id: '',
  net_income: '0',
  province_code: '',
  regency_code: '',
  selected_areas: [] as NetIncomeArea[],
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/net-income\/[^/]+$/.test(pathname)) return 'detail'
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
  return d.toLocaleString('id-ID')
}

function areaLabel(area: NetIncomeArea) {
  const province = area.province_name || area.province_code
  const regency = area.regency_name || area.regency_code
  if (province) return `${province} - ${regency}`
  return regency || '-'
}

export default function NetIncomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const { hasPermission } = usePermissions()
  const canList = hasPermission('net_income', 'list')
  const canCreate = hasPermission('net_income', 'create')
  const canUpdate = hasPermission('net_income', 'update')
  const canDelete = hasPermission('net_income', 'delete')
  const confirm = useConfirm()

  const [items, setItems] = useState<NetIncomeItem[]>([])
  const [jobs, setJobs] = useState<JobItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<NetIncomeItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

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
    const [netRes, jobRes] = await Promise.all([
      listNetIncome({ page, limit, search: search || undefined }).catch(() => ({ data: { data: [] } } as any)),
      listJobs({ page: 1, limit: 500 }).catch(() => ({ data: { data: [] } } as any)),
    ])

    const netData = netRes.data?.data || netRes.data || []
    const jobData = jobRes.data?.data || jobRes.data || []

    setItems(Array.isArray(netData) ? netData.map((item: any) => normalizeNetIncomeItem(item)) : [])
    setJobs(Array.isArray(jobData) ? jobData : [])

    setTotalPages(netRes.data?.total_pages || 1)
    setTotalData(netRes.data?.total_data || 0)
    setPage(netRes.data?.current_page || page)
  }

  useEffect(() => {
    load().catch(() => {
      setItems([])
      setJobs([])
    })
  }, [limit, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if ((canList || isEdit || isDetail) && items.length === 0) {
      load().catch(() => {
        setItems([])
        setJobs([])
      })
    }
  }, [canList, isEdit, isDetail, items.length])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? normalizeNetIncomeItem(stateItem) : null) || fetchedItem
  }, [items, selectedId, stateItem, fetchedItem])

  useEffect(() => {
    if (!selectedId || selectedItem) return
    getNetIncome(selectedId)
      .then((res) => {
        const data = res.data?.data || res.data
        setFetchedItem(data ? normalizeNetIncomeItem(data) : null)
      })
      .catch(() => setFetchedItem(null))
  }, [selectedId, selectedItem])

  useEffect(() => {
    if (isCreate) {
      setForm((prev) => ({ ...emptyForm, job_id: prev.job_id || '' }))
      return
    }

    if (isEdit && selectedItem) {
      setForm({
        job_id: selectedItem.job_id || '',
        net_income: formatRupiahInput(String(selectedItem.net_income ?? 0)),
        province_code: '',
        regency_code: '',
        selected_areas: normalizeAreaInput(selectedItem.area_net_income),
      })
    }
  }, [isCreate, isEdit, selectedItem])

  useEffect(() => {
    if ((isCreate || isEdit) && jobs.length && !form.job_id) {
      setForm((prev) => ({ ...prev, job_id: jobs[0].id }))
    }
  }, [isCreate, isEdit, jobs, form.job_id])

  const addArea = () => {
    const province = provinces.find((item) => item.code === form.province_code)
    const regency = kabupaten.find((item) => item.code === form.regency_code)

    if (!province) {
      setError('Province must be selected.')
      return
    }
    if (!regency) {
      setError('Regency / city must be selected.')
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
      setError('The selected area already exists.')
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

    const netIncome = parseRupiahInput(form.net_income)
    const areas = normalizeAreaInput(form.selected_areas)

    if (!form.job_id) {
      setError('Job must be selected.')
      return
    }
    if (Number.isNaN(netIncome) || netIncome < 0) {
      setError('Net income must be a number greater than or equal to 0.')
      return
    }
    if (areas.length === 0) {
      setError('At least one net income area is required.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const body = {
        job_id: form.job_id,
        net_income: netIncome,
        area_net_income: areas,
      }
      if (isEdit && selectedId) await updateNetIncome(selectedId, body)
      else await createNetIncome(body)
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/net-income')
    } catch (err: any) {
      const rawError = err?.response?.data?.error
      const message =
        (typeof rawError === 'string' && rawError.trim()) ||
        (rawError && typeof rawError === 'object' && typeof rawError.message === 'string' && rawError.message.trim()) ||
        (typeof err?.response?.data?.message === 'string' && err.response.data.message.trim()) ||
        'Failed to save net income.'
      setError(message)
      await confirm({
        title: 'Save Failed',
        description: message,
        confirmText: 'OK',
        cancelText: 'Close',
        tone: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Net Income',
      description: 'Are you sure you want to delete this net income data?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    await deleteNetIncome(id)
    await load()
  }

  const jobName = (id: string, fallback?: string) => {
    if (fallback) return fallback
    return jobs.find((j) => j.id === id)?.name || '-'
  }

  if (isDetail) {
    return (
      <NetIncomeDetail
        areaLabel={areaLabel}
        canUpdate={canUpdate}
        formatDate={formatDate}
        formatRupiah={formatRupiah}
        jobName={jobName}
        navigate={navigate}
        selectedId={selectedId}
        selectedItem={selectedItem}
      />
    )
  }

  if (isCreate || isEdit) {
    return (
      <NetIncomeForm
        addArea={addArea}
        areaLabel={areaLabel}
        canCreate={canCreate}
        canUpdate={canUpdate}
        error={error}
        form={form}
        isCreate={isCreate}
        isEdit={isEdit}
        jobs={jobs}
        kabupaten={kabupaten}
        loading={loading}
        navigate={navigate}
        provinces={provinces}
        removeArea={removeArea}
        save={save}
        setForm={setForm}
        formatRupiahInput={formatRupiahInput}
      />
    )
  }

  return (
    <NetIncomeList
      areaLabel={areaLabel}
      canCreate={canCreate}
      canDelete={canDelete}
      canList={canList}
      canUpdate={canUpdate}
      formatDate={formatDate}
      formatRupiah={formatRupiah}
      items={items}
      jobName={jobName}
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
