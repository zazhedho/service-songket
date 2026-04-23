import { FormEvent, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  cacheOrder,
  cacheOrders,
  createOrder,
  deleteOrder,
  downloadOrderExport,
  fetchOrders,
  getCachedOrder,
  getOrderExportStatus,
  removeCachedOrder,
  startOrderExport,
  updateOrder,
} from '../../services/orderService'
import {
} from '../../services/locationService'
import { fetchLookups } from '../../services/lookupService'
import { useAlert, useConfirm } from '../../components/common/ConfirmDialog'
import { useLocationNameResolver } from '../../hooks/useLocationNameResolver'
import { useLocationOptions } from '../../hooks/useLocationOptions'
import { usePermissions } from '../../hooks/usePermissions'
import { parseRupiahInput } from '../../utils/currency'
import OrderList from './components/OrderList'
import { getAttempt, lookupOptionName, resolveOptionCode } from './components/orderHelpers'

const OrderDetail = lazy(() => import('./components/OrderDetail'))
const OrderForm = lazy(() => import('./components/OrderForm'))

const defaultForm = {
  pooling_number: '',
  pooling_at: dayjs().toISOString(),
  result_at: '',
  dealer_id: '',
  finance_company_id: '',
  consumer_name: '',
  consumer_phone: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  address: '',
  job_id: '',
  motor_type_id: '',
  installment: 0,
  dp_gross: 0,
  dp_paid: 0,
  tenor: 12,
  result_status: 'pending',
  result_notes: '',
  finance_company2_id: '',
  result_status2: '',
  result_notes2: '',
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/orders\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

function OrderModeLoader() {
  return (
    <div className="page">
      <div className="card">Loading order view...</div>
    </div>
  )
}

export default function OrdersPage() {
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
  const confirm = useConfirm()

  const canCreate = hasPermission('orders', 'create')
  const canUpdate = hasPermission('orders', 'update')
  const canList = hasPermission('orders', 'list')
  const canDelete = hasPermission('orders', 'delete')
  const canView = canList
  const showTable = canList

  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState(defaultForm)
  const [lookups, setLookups] = useState<any>({})
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '', export_from: '', export_to: '' })
  const [exportJob, setExportJob] = useState<{
    id: string
    status: string
    progress: number
    message: string
    file_name?: string
    error?: string
  } | null>(null)
  const [exportDownloading, setExportDownloading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const exportPollRef = useRef<number | null>(null)
  const exportDownloadLockRef = useRef(false)
  const lookupsLoadedRef = useRef(false)

  const stateOrder = (location.state as any)?.order || null
  const stateBackTo = (location.state as any)?.back_to
  const backTo = typeof stateBackTo === 'string' && stateBackTo.trim() ? stateBackTo : '/orders'
  const {
    provinces,
    regencies: kabupaten,
    districts: kecamatan,
  } = useLocationOptions({
    enabled: true,
    provinceCode: form.province,
    regencyCode: form.regency,
    withDistricts: true,
  })
  const { displayRegency, locationNamesByKey } = useLocationNameResolver({
    rows: list,
    getKey: (row) => String(row?.id || '').trim(),
    getProvince: (row) => String(row?.province || '').trim(),
    getRegency: (row) => String(row?.regency || '').trim(),
    getDistrict: (row) => String(row?.district || '').trim(),
  })

  const loadList = async (params?: Record<string, unknown>) => {
    const requestRaw = params || { page, limit }
    const request: Record<string, unknown> = { ...requestRaw }
    const statusFilter = String(request.status || '').trim()
    if (statusFilter) {
      const existingFilters = request.filters && typeof request.filters === 'object'
        ? (request.filters as Record<string, unknown>)
        : {}
      request.filters = { ...existingFilters, status: statusFilter }
    }
    delete request.status
    const res = await fetchOrders(request)
    const nextList = res.data.data || res.data || []
    setList(nextList)
    cacheOrders(nextList)
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || (request.page as number) || 1)
  }

  const loadLookups = async () => {
    if (lookupsLoadedRef.current) return
    const lookupRes = await fetchLookups()
    setLookups(lookupRes.data.data || lookupRes.data || {})
    lookupsLoadedRef.current = true
  }

  useEffect(() => {
    if (isList && !showTable) return
    loadLookups().catch(() => {
      lookupsLoadedRef.current = false
      setLookups({})
    })
  }, [isList, showTable])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(String(filters.search || ''))
    }, 250)
    return () => {
      window.clearTimeout(timer)
    }
  }, [filters.search])

  useEffect(() => {
    if (isCreate && lookups?.dealers?.length === 1) {
      setForm((prev) => ({ ...prev, dealer_id: lookups.dealers[0].id }))
    }
  }, [isCreate, lookups.dealers])

  useEffect(() => {
    if (isList && showTable) {
      loadList({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        from_date: filters.export_from || undefined,
        to_date: filters.export_to || undefined,
      }).catch(() => {
        setList([])
        setTotalPages(1)
        setTotalData(0)
      })
    }
  }, [debouncedSearch, filters.status, filters.export_from, filters.export_to, isList, limit, page, showTable])

  useEffect(() => {
    setPage(1)
  }, [filters.search, filters.status, filters.export_from, filters.export_to])

  useEffect(() => {
    return () => {
      if (exportPollRef.current) {
        window.clearInterval(exportPollRef.current)
        exportPollRef.current = null
      }
    }
  }, [])

  const stopExportPolling = () => {
    if (exportPollRef.current) {
      window.clearInterval(exportPollRef.current)
      exportPollRef.current = null
    }
  }

  const resolveDownloadFileName = (rawHeader?: string, fallback?: string) => {
    const value = String(rawHeader || '').trim()
    if (!value) return fallback || 'order-in-export.xlsx'
    const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i)
    if (utfMatch?.[1]) {
      const decoded = decodeURIComponent(utfMatch[1]).trim()
      if (decoded) return decoded
    }
    const basicMatch = value.match(/filename="?([^"]+)"?/i)
    if (basicMatch?.[1]) return basicMatch[1].trim()
    return fallback || 'order-in-export.xlsx'
  }

  const triggerOrderExportDownload = async (jobID: string, fallbackFileName?: string) => {
    if (exportDownloadLockRef.current) return
    exportDownloadLockRef.current = true
    setExportDownloading(true)
    try {
      const res = await downloadOrderExport(jobID)
      const contentType = String(res.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      const fileName = resolveDownloadFileName(res.headers?.['content-disposition'], fallbackFileName)
      const blob = new Blob([res.data], { type: contentType })
      const objectURL = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectURL
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(objectURL)

      setExportJob((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'downloaded',
          progress: 100,
          message: 'Export completed. File downloaded.',
          file_name: fileName,
          error: '',
        }
      })
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to download export file'
      setExportJob((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'failed',
          progress: 100,
          message,
          error: message,
        }
      })
    } finally {
      stopExportPolling()
      exportDownloadLockRef.current = false
      setExportDownloading(false)
    }
  }

  const pollOrderExportStatus = (jobID: string) => {
    stopExportPolling()
    exportPollRef.current = window.setInterval(() => {
      void getOrderExportStatus(jobID)
        .then((res) => {
          const payload = res?.data?.data || res?.data || null
          if (!payload) return
          const normalized = {
            id: String(payload.id || jobID),
            status: String(payload.status || ''),
            progress: Number(payload.progress || 0),
            message: String(payload.message || ''),
            file_name: String(payload.file_name || ''),
            error: String(payload.error || ''),
          }
          setExportJob(normalized)

          if (normalized.status === 'completed') {
            void triggerOrderExportDownload(normalized.id, normalized.file_name || 'order-in-export.xlsx')
          } else if (normalized.status === 'failed' || normalized.status === 'downloaded') {
            stopExportPolling()
          }
        })
        .catch((err: any) => {
          const message = err?.response?.data?.error || err?.message || 'Failed to fetch export status'
          setExportJob((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              status: 'failed',
              progress: 100,
              message,
              error: message,
            }
          })
          stopExportPolling()
        })
    }, 1500)
  }

  const requestOrderExport = async () => {
    const fromDate = String(filters.export_from || '').trim()
    const toDate = String(filters.export_to || '').trim()
    if (!fromDate || !toDate) {
      await showAlert('Please select export date range first.')
      return
    }
    if (dayjs(fromDate).isAfter(dayjs(toDate), 'day')) {
      await showAlert('Export from date cannot be after to date.')
      return
    }

    stopExportPolling()
    exportDownloadLockRef.current = false
    setExportDownloading(false)
    setExportJob({
      id: '',
      status: 'queued',
      progress: 0,
      message: 'Queueing export job...',
      file_name: '',
      error: '',
    })

    try {
      const res = await startOrderExport({
        from_date: fromDate,
        to_date: toDate,
        search: filters.search || '',
        status: filters.status || '',
      })
      const payload = res?.data?.data || res?.data || null
      const jobID = String(payload?.id || '').trim()
      if (!jobID) {
        throw new Error('Invalid export job response')
      }

      setExportJob({
        id: jobID,
        status: String(payload?.status || 'queued'),
        progress: Number(payload?.progress || 0),
        message: String(payload?.message || 'Export queued'),
        file_name: String(payload?.file_name || ''),
        error: String(payload?.error || ''),
      })
      pollOrderExportStatus(jobID)
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to create export job'
      setExportJob({
        id: '',
        status: 'failed',
        progress: 100,
        message,
        file_name: '',
        error: message,
      })
    }
  }

  const cachedSelectedOrder = useMemo(() => {
    if (!selectedId) return null
    return getCachedOrder(selectedId)
  }, [selectedId])

  const selectedOrder = useMemo(() => {
    if (!selectedId) return null
    return list.find((order) => order.id === selectedId)
      || (stateOrder?.id === selectedId ? stateOrder : null)
      || cachedSelectedOrder
  }, [cachedSelectedOrder, list, selectedId, stateOrder])
  const selectedDealer = useMemo(() => {
    const rows = Array.isArray(lookups?.dealers) ? lookups.dealers : []
    return rows.find((dealer: any) => dealer.id === form.dealer_id) || null
  }, [form.dealer_id, lookups?.dealers])
  const detailProvinceCode = selectedOrder?.province || ''
  const detailRegencyCode = selectedOrder?.regency || ''
  const {
    regencies: detailKabupaten,
    districts: detailKecamatan,
  } = useLocationOptions({
    enabled: isDetail,
    loadProvinces: false,
    provinceCode: detailProvinceCode,
    regencyCode: detailRegencyCode,
    withDistricts: true,
  })

  const filteredMotorTypes = useMemo(() => {
    const rows = Array.isArray(lookups?.motor_types) ? lookups.motor_types : []
    const dealerProvinceCode = `${selectedDealer?.province || ''}`.trim()
    const dealerRegencyCode = `${selectedDealer?.regency || ''}`.trim()
    if (!dealerProvinceCode && !dealerRegencyCode) return rows
    return rows.filter((motor: any) => {
      const provinceCode = `${motor?.province_code || ''}`.trim()
      const regencyCode = `${motor?.regency_code || ''}`.trim()
      if (dealerProvinceCode && provinceCode !== dealerProvinceCode) return false
      if (dealerRegencyCode && regencyCode !== dealerRegencyCode) return false
      return true
    })
  }, [lookups?.motor_types, selectedDealer])

  const applyOrderToForm = (order: any) => {
    const firstAttempt = getAttempt(order, 1)
    const secondAttempt = getAttempt(order, 2)
    setForm({
      pooling_number: order.pooling_number || '',
      pooling_at: order.pooling_at || dayjs().toISOString(),
      result_at: order.result_at || '',
      dealer_id: order.dealer_id || '',
      finance_company_id: firstAttempt?.finance_company_id || '',
      consumer_name: order.consumer_name || '',
      consumer_phone: order.consumer_phone || '',
      province: order.province || '',
      regency: order.regency || '',
      district: order.district || '',
      village: order.village || '',
      address: order.address || '',
      job_id: order.job_id || '',
      motor_type_id: order.motor_type_id || '',
      installment: order.installment || 0,
      dp_gross: order.dp_gross || 0,
      dp_paid: order.dp_paid || 0,
      tenor: order.tenor || 12,
      result_status: order.result_status || 'pending',
      result_notes: order.result_notes || '',
      finance_company2_id: secondAttempt?.finance_company_id || '',
      result_status2: secondAttempt?.status || '',
      result_notes2: secondAttempt?.notes || '',
    })
  }

  useEffect(() => {
    if (isCreate) {
      setForm(defaultForm)
      setError('')
      return
    }

    if (isEdit && selectedOrder) {
      applyOrderToForm(selectedOrder)
      setError('')
    }
  }, [isCreate, isEdit, selectedOrder])

  useEffect(() => {
    if (!stateOrder) return
    cacheOrder(stateOrder)
  }, [stateOrder])

  useEffect(() => {
    if (!selectedOrder) return
    cacheOrder(selectedOrder)
  }, [selectedOrder])

  useEffect(() => {
    if (!provinces.length || !form.province) return
    const resolvedProvince = resolveOptionCode(provinces, form.province)
    if (!resolvedProvince || resolvedProvince === form.province) return
    setForm((prev) => ({ ...prev, province: resolvedProvince }))
  }, [form.province, provinces])

  useEffect(() => {
    if (!form.motor_type_id) return
    const exists = filteredMotorTypes.some((motor: any) => motor.id === form.motor_type_id)
    if (!exists) {
      setForm((prev) => ({ ...prev, motor_type_id: '' }))
    }
  }, [filteredMotorTypes, form.motor_type_id])

  const poolingRowsCount = useMemo(() => {
    const key = String(form.pooling_number || '').trim().toLowerCase()
    if (!key) return 0
    return list.filter((item) => String(item?.pooling_number || '').trim().toLowerCase() === key).length
  }, [form.pooling_number, list])
  const hasAttempt2Value = Boolean(form.finance_company2_id || form.result_status2 || form.result_notes2)
  const showAttempt2 = form.result_status === 'reject' && (poolingRowsCount < 2 || hasAttempt2Value)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return
    const payload: any = { ...form }

    if (payload.result_status !== 'reject') {
      payload.finance_company2_id = ''
      payload.result_status2 = ''
      payload.result_notes2 = ''
    }

    payload.finance_company3_id = ''
    payload.result_status3 = ''
    payload.result_notes3 = ''

    if (payload.finance_company2_id && !payload.result_status2) {
      await showAlert('Select a result for Finance Company 2.')
      return
    }
    if (!payload.finance_company2_id && payload.result_status2) {
      await showAlert('Select Finance Company 2 before filling Finance Result 2.')
      return
    }
    setLoading(true)
    setError('')

    try {
      if (isEdit && selectedId) await updateOrder(selectedId, payload)
      else await createOrder(payload)
      if (showTable) {
        await loadList({
          page,
          limit,
          search: filters.search || undefined,
          status: filters.status || undefined,
          from_date: filters.export_from || undefined,
          to_date: filters.export_to || undefined,
        }).catch(() => undefined)
      }
      setForm(defaultForm)
      navigate('/orders')
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to save order.'
      setError(message)
      await showAlert(message)
    } finally {
      setLoading(false)
    }
  }

  const removeOrder = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Order',
      description: 'Are you sure you want to delete this order?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    setLoading(true)
    try {
      await deleteOrder(id)
      removeCachedOrder(id)
      await loadList({
        page,
        limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        from_date: filters.export_from || undefined,
        to_date: filters.export_to || undefined,
      })
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to delete order.'
      await showAlert(message)
    } finally {
      setLoading(false)
    }
  }

  const selectedMotor = lookups?.motor_types?.find((m: any) => m.id === form.motor_type_id)

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const parseNumber = (value: string) => parseRupiahInput(value)
  const exportJobRunning = exportJob?.status === 'queued' || exportJob?.status === 'running' || exportDownloading

  if (isDetail) {
    return (
      <Suspense fallback={<OrderModeLoader />}>
        <OrderDetail
          backTo={backTo}
          canUpdate={canUpdate}
          detailKabupaten={detailKabupaten}
          detailKecamatan={detailKecamatan}
          lookups={lookups}
          navigate={navigate}
          provinces={provinces}
          selectedId={selectedId}
          selectedOrder={selectedOrder}
        />
      </Suspense>
    )
  }

  if (isCreate || isEdit) {
    return (
      <Suspense fallback={<OrderModeLoader />}>
        <OrderForm
          canCreate={canCreate}
          canUpdate={canUpdate}
          error={error}
          filteredMotorTypes={filteredMotorTypes}
          form={form}
          isCreate={isCreate}
          isEdit={isEdit}
          kabupaten={kabupaten}
          kecamatan={kecamatan}
          loading={loading}
          lookups={lookups}
          navigate={navigate}
          parseNumber={parseNumber}
          poolingRowsCount={poolingRowsCount}
          provinces={provinces}
          selectedMotor={selectedMotor}
          set={set}
          setError={setError}
          setForm={setForm}
          showAttempt2={showAttempt2}
          submit={submit}
        />
      </Suspense>
    )
  }

  return (
    <OrderList
      canCreate={canCreate}
      canDelete={canDelete}
      canUpdate={canUpdate}
      exportDownloading={exportDownloading}
      exportJob={exportJob}
      exportJobRunning={exportJobRunning}
      filters={filters}
      limit={limit}
      list={list}
      locationNamesByKey={locationNamesByKey}
      lookups={lookups}
      navigate={navigate}
      onExport={requestOrderExport}
      onClearExportJob={() => setExportJob(null)}
      onFilterChange={setFilters}
      onLimitChange={setLimit}
      onPageChange={setPage}
      onRemove={removeOrder}
      page={page}
      resolveRegencyLabel={displayRegency}
      showTable={showTable}
      totalData={totalData}
      totalPages={totalPages}
    />
  )
}
