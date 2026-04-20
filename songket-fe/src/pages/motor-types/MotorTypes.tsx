import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createMotorType,
  deleteMotorType,
  getMotorType,
  listMotorTypes,
  updateMotorType,
} from '../../services/motorTypeService'
import {
  fetchKabupaten,
  fetchProvinces,
} from '../../services/locationService'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuth } from '../../store'
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
  return d.toLocaleString('id-ID')
}

function errorMessage(err: any, fallback: string) {
  const raw = err?.response?.data?.error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object' && typeof raw.message === 'string' && raw.message.trim()) return raw.message
  return fallback
}

export default function MotorTypesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_motor_types')
  const canView = perms.includes('view_motor_types')
  const canCreate = perms.includes('create_motor_types')
  const canUpdate = perms.includes('update_motor_types')
  const canDelete = perms.includes('delete_motor_types')
  const confirm = useConfirm()

  const [items, setItems] = useState<MotorTypeItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<MotorTypeItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const [regencyFilter, setRegencyFilter] = useState('')
  const [provinces, setProvinces] = useState<any[]>([])
  const [regencies, setRegencies] = useState<any[]>([])
  const [filterRegencies, setFilterRegencies] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const stateItem = (location.state as any)?.motorType || null

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
    fetchProvinces()
      .then((res) => setProvinces(res.data.data || res.data || []))
      .catch(() => setProvinces([]))
  }, [])

  useEffect(() => {
    if (!provinceFilter) {
      setFilterRegencies([])
      setRegencyFilter('')
      return
    }
    fetchKabupaten(provinceFilter)
      .then((res) => setFilterRegencies(res.data.data || res.data || []))
      .catch(() => setFilterRegencies([]))
  }, [provinceFilter])

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setItems([]))
    }
  }, [canList, isEdit, isDetail, isList, limit, page, search, provinceFilter, regencyFilter])

  useEffect(() => {
    setPage(1)
  }, [search, provinceFilter, regencyFilter])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null) || fetchedItem
  }, [items, selectedId, stateItem, fetchedItem])

  useEffect(() => {
    if (!selectedId || selectedItem) return
    getMotorType(selectedId)
      .then((res) => {
        const data = res.data?.data || res.data
        setFetchedItem(data || null)
      })
      .catch(() => setFetchedItem(null))
  }, [selectedId, selectedItem])

  useEffect(() => {
    if (!form.province_code) {
      setRegencies([])
      setForm((prev) => ({ ...prev, regency_code: '', regency_name: '' }))
      return
    }
    fetchKabupaten(form.province_code)
      .then((res) => setRegencies(res.data.data || res.data || []))
      .catch(() => setRegencies([]))
  }, [form.province_code])

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
      const message = errorMessage(err, 'Gagal menyimpan jenis motor')
      setError(message)
      window.alert(message)
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
      window.alert(errorMessage(err, 'Gagal menghapus jenis motor'))
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
