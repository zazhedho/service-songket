import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createInstallment,
  deleteInstallment,
  getInstallment,
  listInstallments,
  updateInstallment,
} from '../../services/installmentService'
import {
  createMotorType,
  deleteMotorType,
  updateMotorType,
} from '../../services/motorTypeService'
import {
  fetchKabupaten,
  fetchProvinces,
} from '../../services/locationService'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuth } from '../../store'
import { formatRupiah, parseRupiahInput } from '../../utils/currency'
import InstallmentDetail from './components/InstallmentDetail'
import InstallmentForm from './components/InstallmentForm'
import InstallmentList from './components/InstallmentList'

type OptionItem = {
  code: string
  name: string
}

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
}

type InstallmentItem = {
  id: string
  motor_type_id: string
  amount: number
  motor_type?: MotorTypeItem
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
  amount: number
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
  amount: 0,
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/installments\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US')
}

function areaLabel(motor?: MotorTypeItem) {
  if (!motor) return '-'
  return [motor.regency_name, motor.province_name].filter(Boolean).join(', ') || '-'
}

function errorMessage(err: any, fallback: string) {
  const raw = err?.response?.data?.error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object' && typeof raw.message === 'string' && raw.message.trim()) return raw.message
  return fallback
}

export default function InstallmentsPage() {
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
  const canList = perms.includes('list_installments') || perms.includes('list_motor_types')
  const canView = perms.includes('view_installments') || perms.includes('view_motor_types')
  const canCreate = perms.includes('create_installments') && perms.includes('create_motor_types')
  const canUpdate = perms.includes('update_installments') && perms.includes('update_motor_types')
  const canDelete = perms.includes('delete_installments')
  const confirm = useConfirm()

  const [items, setItems] = useState<InstallmentItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<InstallmentItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const [regencyFilter, setRegencyFilter] = useState('')
  const [provinces, setProvinces] = useState<OptionItem[]>([])
  const [regencies, setRegencies] = useState<OptionItem[]>([])
  const [filterRegencies, setFilterRegencies] = useState<OptionItem[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const stateItem = (location.state as any)?.item || null

  const load = async () => {
    const res = await listInstallments({
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
      .then((res) => {
        const data = res.data?.data || res.data || []
        setProvinces(Array.isArray(data) ? data : [])
      })
      .catch(() => setProvinces([]))
  }, [])

  useEffect(() => {
    if (!provinceFilter) {
      setFilterRegencies([])
      setRegencyFilter('')
      return
    }

    fetchKabupaten(provinceFilter)
      .then((res) => {
        const data = res.data?.data || res.data || []
        setFilterRegencies(Array.isArray(data) ? data : [])
      })
      .catch(() => setFilterRegencies([]))
  }, [provinceFilter])

  useEffect(() => {
    if (!form.province_code || !(isCreate || isEdit)) {
      setRegencies([])
      return
    }

    fetchKabupaten(form.province_code)
      .then((res) => {
        const data = res.data?.data || res.data || []
        setRegencies(Array.isArray(data) ? data : [])
      })
      .catch(() => setRegencies([]))
  }, [form.province_code, isCreate, isEdit])

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setItems([]))
    }
  }, [canList, isDetail, isEdit, isList, limit, page, provinceFilter, regencyFilter, search])

  useEffect(() => {
    setPage(1)
  }, [provinceFilter, regencyFilter, search])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null) || fetchedItem
  }, [fetchedItem, items, selectedId, stateItem])

  useEffect(() => {
    if (!selectedId || selectedItem) return

    getInstallment(selectedId)
      .then((res) => {
        const data = res.data?.data || res.data
        setFetchedItem(data || null)
      })
      .catch(() => setFetchedItem(null))
  }, [selectedId, selectedItem])

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm)
      setError('')
      return
    }

    if (isEdit && selectedItem?.motor_type) {
      setForm({
        name: selectedItem.motor_type.name || '',
        brand: selectedItem.motor_type.brand || '',
        model: selectedItem.motor_type.model || '',
        type: selectedItem.motor_type.type || '',
        otr: Number(selectedItem.motor_type.otr || 0),
        province_code: selectedItem.motor_type.province_code || '',
        province_name: selectedItem.motor_type.province_name || '',
        regency_code: selectedItem.motor_type.regency_code || '',
        regency_name: selectedItem.motor_type.regency_name || '',
        amount: Number(selectedItem.amount || 0),
      })
      setError('')
    }
  }, [isCreate, isEdit, selectedItem])

  const updateProvince = (code: string) => {
    const province = provinces.find((item) => item.code === code)
    setForm((prev) => ({
      ...prev,
      province_code: code,
      province_name: province?.name || '',
      regency_code: '',
      regency_name: '',
    }))
  }

  const updateRegency = (code: string) => {
    const regency = regencies.find((item) => item.code === code)
    setForm((prev) => ({
      ...prev,
      regency_code: code,
      regency_name: regency?.name || '',
    }))
  }

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    const name = form.name.trim()
    const brand = form.brand.trim()
    const model = form.model.trim()
    const variantType = form.type.trim()

    if (!name || !brand || !model || !variantType) {
      setError('Motor type fields are required')
      return
    }
    if (!form.province_code || !form.regency_code) {
      setError('Province and regency are required')
      return
    }
    if (form.otr < 0) {
      setError('OTR must be >= 0')
      return
    }
    if (form.amount < 0) {
      setError('Installment amount must be >= 0')
      return
    }

    setLoading(true)
    setError('')

    try {
      const motorPayload = {
        name,
        brand,
        model,
        type: variantType,
        otr: Number(form.otr || 0),
        province_code: form.province_code,
        province_name: form.province_name,
        regency_code: form.regency_code,
        regency_name: form.regency_name,
      }

      if (isEdit && selectedId) {
        const motorTypeId = selectedItem?.motor_type_id
        if (!motorTypeId) throw new Error('Motor type not found')

        await updateMotorType(motorTypeId, motorPayload)
        await updateInstallment(selectedId, {
          motor_type_id: motorTypeId,
          amount: Number(form.amount || 0),
        })
      } else {
        const motorRes = await createMotorType(motorPayload)
        const motor = motorRes.data?.data || motorRes.data
        const motorTypeId = String(motor?.id || '').trim()

        if (!motorTypeId) throw new Error('Failed to create motor type')

        try {
          await createInstallment({
            motor_type_id: motorTypeId,
            amount: Number(form.amount || 0),
          })
        } catch (err) {
          await deleteMotorType(motorTypeId).catch(() => undefined)
          throw err
        }
      }

      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(emptyForm)
      navigate('/installments')
    } catch (err: any) {
      const message = errorMessage(err, 'Failed to save motor type and installment')
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Installment',
      description: 'Are you sure you want to delete this installment data?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    try {
      await deleteInstallment(id)
      await load()
    } catch (err: any) {
      window.alert(errorMessage(err, 'Failed to delete installment data'))
    }
  }

  if (isDetail) {
    return (
      <InstallmentDetail
        areaLabel={areaLabel}
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
      <InstallmentForm
        canCreate={canCreate}
        canUpdate={canUpdate}
        error={error}
        form={form}
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
        formatRupiah={formatRupiah}
      />
    )
  }

  return (
    <InstallmentList
      areaLabel={areaLabel}
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
