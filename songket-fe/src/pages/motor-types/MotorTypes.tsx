import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createMotorType,
  deleteMotorType,
  getMotorType,
  listMotorTypes,
  updateMotorType,
} from '../../services/motorTypeService'
import { useAlert, useConfirm } from '../../components/common/ConfirmDialog'
import { useLocationOptions } from '../../hooks/useLocationOptions'
import { usePermissions } from '../../hooks/usePermissions'
import { formatRupiah, parseRupiahInput } from '../../utils/currency'
import MotorTypeDetail from './components/MotorTypeDetail'
import MotorTypeForm from './components/MotorTypeForm'
import MotorTypeList from './components/MotorTypeList'

type MotorTypeItem = {
  id: string
  name: string
  brand: string
  model: string
  type: string
  otr: number
  province_code: string
  province_name: string
  regency_code: string
  regency_name: string
  created_at?: string
  updated_at?: string
}

type FormState = {
  name: string
  brand: string
  model: string
  type: string
  otr: number
  province_code: string
  province_name: string
  regency_code: string
  regency_name: string
}

const emptyForm: FormState = {
  name: '',
  brand: '',
  model: '',
  type: '',
  otr: 0,
  province_code: '',
  province_name: '',
  regency_code: '',
  regency_name: '',
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/motor-types\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-GB')
}

function errorMessage(err: any, fallback: string) {
  const raw = err?.response?.data?.error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object' && typeof raw.message === 'string' && raw.message.trim()) return raw.message
  return fallback
}

export default function MotorTypesPage() {
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

  const { hasPermission } = usePermissions()
  const canList = hasPermission('motor_types', 'list')
  const canView = hasPermission('motor_types', 'view')
  const canCreate = hasPermission('motor_types', 'create')
  const canUpdate = hasPermission('motor_types', 'update')
  const canDelete = hasPermission('motor_types', 'delete')
  const confirm = useConfirm()

  const [items, setItems] = useState<MotorTypeItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<MotorTypeItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const [regencyFilter, setRegencyFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const stateItem = (location.state as any)?.motorType || null
  const isFormMode = isCreate || isEdit
  const { provinces, regencies } = useLocationOptions({
    enabled: isFormMode || isList,
    provinceCode: form.province_code,
  })
  const { regencies: filterRegencies } = useLocationOptions({
    enabled: Boolean(provinceFilter),
    loadProvinces: false,
    provinceCode: provinceFilter,
  })

  const load = async () => {
    const res = await listMotorTypes({
      page,
      limit,
      search: search || undefined,
      filters: {
        province_code: provinceFilter || undefined,
        regency_code: regencyFilter || undefined,
      },
    })
    setItems(res.data.data || res.data || [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || page)
  }

  useEffect(() => {
    if (!provinceFilter) {
      setRegencyFilter('')
    }
  }, [provinceFilter])

  useEffect(() => {
    if (!canList || !isList) return

    load().catch(() => setItems([]))
  }, [canList, isList, limit, page, search, provinceFilter, regencyFilter])

  useEffect(() => {
    setPage(1)
  }, [search, provinceFilter, regencyFilter])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null) || fetchedItem
  }, [items, selectedId, stateItem, fetchedItem])

  useEffect(() => {
    if (!(isEdit || isDetail) || !selectedId || selectedItem) return

    getMotorType(selectedId)
      .then((res) => {
        const data = res.data?.data || res.data
        setFetchedItem(data || null)
      })
      .catch(() => setFetchedItem(null))
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
        brand: selectedItem.brand || '',
        model: selectedItem.model || '',
        type: selectedItem.type || '',
        otr: selectedItem.otr || 0,
        province_code: selectedItem.province_code || '',
        province_name: selectedItem.province_name || '',
        regency_code: selectedItem.regency_code || '',
        regency_name: selectedItem.regency_name || '',
      })
      setError('')
    }
  }, [isCreate, isEdit, selectedItem])

  useEffect(() => {
    if (!form.province_code && !form.regency_code && !form.regency_name) return
    if (form.province_code) return
    setForm((prev) => ({ ...prev, regency_code: '', regency_name: '' }))
  }, [form.province_code, form.regency_code, form.regency_name])

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setError('')

    try {
      if (isEdit && selectedId) {
        await updateMotorType(selectedId, form)
      } else {
        await createMotorType(form)
      }
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/motor-types')
    } catch (err: any) {
      const message = errorMessage(err, 'Failed to save motor type.')
      setError(message)
      await showAlert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Motor Type',
      description: 'Are you sure you want to delete this motor type?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    try {
      await deleteMotorType(id)
      await load()
    } catch (err: any) {
      await showAlert(errorMessage(err, 'Failed to delete motor type.'))
    }
  }

  const updateProvince = (code: string) => {
    const item = provinces.find((p) => p.code === code)
    setForm((prev) => ({
      ...prev,
      province_code: code,
      province_name: item?.name || '',
      regency_code: '',
      regency_name: '',
    }))
  }

  const updateRegency = (code: string) => {
    const item = regencies.find((r) => r.code === code)
    setForm((prev) => ({
      ...prev,
      regency_code: code,
      regency_name: item?.name || '',
    }))
  }

  if (isDetail) {
    return (
      <MotorTypeDetail
        canUpdate={canUpdate}
        formatDate={formatDate}
        formatRupiah={formatRupiah}
        navigate={navigate}
        selectedId={selectedId}
        selectedItem={selectedItem}
      />
    )
  }

  if (isCreate || isEdit) {
    return (
      <MotorTypeForm
        canCreate={canCreate}
        canUpdate={canUpdate}
        error={error}
        form={form}
        formatRupiah={formatRupiah}
        isCreate={isCreate}
        isEdit={isEdit}
        loading={loading}
        navigate={navigate}
        parseRupiahInput={parseRupiahInput}
        provinces={provinces}
        regencies={regencies}
        save={save}
        setForm={setForm}
        updateProvince={updateProvince}
        updateRegency={updateRegency}
      />
    )
  }

  return (
    <MotorTypeList
      canCreate={canCreate}
      canDelete={canDelete}
      canList={canList}
      canUpdate={canUpdate}
      canView={canView}
      filterRegencies={filterRegencies}
      formatDate={formatDate}
      formatRupiah={formatRupiah}
      items={items}
      limit={limit}
      navigate={navigate}
      page={page}
      provinceFilter={provinceFilter}
      provinces={provinces}
      regencyFilter={regencyFilter}
      remove={remove}
      search={search}
      setLimit={setLimit}
      setPage={setPage}
      setProvinceFilter={setProvinceFilter}
      setRegencyFilter={setRegencyFilter}
      setSearch={setSearch}
      totalData={totalData}
      totalPages={totalPages}
    />
  )
}
