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
import { useAlert, useConfirm } from '../../components/common/ConfirmDialog'
import { useLocationOptions } from '../../hooks/useLocationOptions'
import { usePermissions } from '../../hooks/usePermissions'
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
    { resource: 'installments', action: 'list' },
    { resource: 'motor_types', action: 'list' },
  ])
  const canView = hasAnyPermission([
    { resource: 'installments', action: 'view' },
    { resource: 'motor_types', action: 'view' },
  ])
  const canCreate = hasPermission('installments', 'create') && hasPermission('motor_types', 'create')
  const canUpdate = hasPermission('installments', 'update') && hasPermission('motor_types', 'update')
  const canDelete = hasPermission('installments', 'delete')
  const confirm = useConfirm()

  const [items, setItems] = useState<InstallmentItem[]>([])
  const [fetchedItem, setFetchedItem] = useState<InstallmentItem | null>(null)
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

  const stateItem = (location.state as any)?.item || null
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
    if (!provinceFilter) {
      setRegencyFilter('')
    }
  }, [provinceFilter])

  useEffect(() => {
    if (!canList || !isList) return

    load().catch(() => setItems([]))
  }, [canList, isList, limit, page, provinceFilter, regencyFilter, search])

  useEffect(() => {
    setPage(1)
  }, [provinceFilter, regencyFilter, search])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null) || fetchedItem
  }, [fetchedItem, items, selectedId, stateItem])

  useEffect(() => {
    if (!(isEdit || isDetail) || !selectedId || selectedItem) return

    getInstallment(selectedId)
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

  useEffect(() => {
    if (!form.province_code && !form.regency_code && !form.regency_name) return
    if (form.province_code) return
    setForm((prev) => ({ ...prev, regency_code: '', regency_name: '' }))
  }, [form.province_code, form.regency_code, form.regency_name])

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
      await showAlert(message)
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
      await showAlert(errorMessage(err, 'Failed to delete installment data'))
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
