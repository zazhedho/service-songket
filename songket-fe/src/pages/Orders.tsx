import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  createOrder,
  deleteOrder,
  downloadOrderExport,
  fetchKabupaten,
  fetchKecamatan,
  fetchLookups,
  fetchOrders,
  fetchProvinces,
  getOrderExportStatus,
  startOrderExport,
  updateOrder,
} from '../api'
import ActionMenu from '../components/ActionMenu'
import { useConfirm } from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'
import { formatRupiah } from '../utils/currency'

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

export default function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const permissions = useAuth((s) => s.permissions)
  const role = useAuth((s) => s.role)
  const confirm = useConfirm()

  const canCreate = permissions.includes('create_orders')
  const canUpdate = permissions.includes('update_orders')
  const canView = permissions.includes('view_orders')
  const canList = permissions.includes('list_orders')
  const canDelete = permissions.includes('delete_orders')
  const showTable = canList && canView

  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState(defaultForm)
  const [lookups, setLookups] = useState<any>({})
  const [provinces, setProvinces] = useState<any[]>([])
  const [kabupaten, setKabupaten] = useState<any[]>([])
  const [kecamatan, setKecamatan] = useState<any[]>([])
  const [kabupatenLookup, setKabupatenLookup] = useState<Record<string, string>>({})
  const [kecamatanLookup, setKecamatanLookup] = useState<Record<string, string>>({})
  const [detailKabupaten, setDetailKabupaten] = useState<any[]>([])
  const [detailKecamatan, setDetailKecamatan] = useState<any[]>([])
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
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const fetchedKabupatenRef = useRef<Set<string>>(new Set())
  const fetchedKecamatanRef = useRef<Set<string>>(new Set())
  const exportPollRef = useRef<number | null>(null)
  const exportDownloadLockRef = useRef(false)

  const stateOrder = (location.state as any)?.order || null
  const stateBackTo = (location.state as any)?.back_to
  const backTo = typeof stateBackTo === 'string' && stateBackTo.trim() ? stateBackTo : '/orders'

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
    setList(res.data.data || res.data || [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || (request.page as number) || 1)
  }

  const loadLookups = async () => {
    const [lookupRes, provRes] = await Promise.all([fetchLookups(), fetchProvinces()])
    setLookups(lookupRes.data.data || lookupRes.data || {})
    setProvinces(provRes.data.data || provRes.data || [])
  }

  useEffect(() => {
    loadLookups().catch(() => {
      setLookups({})
      setProvinces([])
    })
  }, [])

  useEffect(() => {
    if (role === 'dealer' && lookups?.dealers?.length === 1 && isCreate) {
      setForm((prev) => ({ ...prev, dealer_id: lookups.dealers[0].id }))
    }
  }, [isCreate, lookups.dealers, role])

  useEffect(() => {
    if (isList && showTable) {
      loadList({
        page,
        limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        from_date: filters.export_from || undefined,
        to_date: filters.export_to || undefined,
      }).catch(() => {
        setList([])
        setTotalPages(1)
        setTotalData(0)
      })
    }
  }, [filters.search, filters.status, filters.export_from, filters.export_to, isList, limit, page, showTable])

  useEffect(() => {
    if (!list.length) return

    const provinceCodes = Array.from(
      new Set(
        list
          .map((order) => String(order?.province || '').trim())
          .filter(Boolean),
      ),
    )

    provinceCodes.forEach((provinceCode) => {
      if (fetchedKabupatenRef.current.has(provinceCode)) return
      fetchedKabupatenRef.current.add(provinceCode)

      fetchKabupaten(provinceCode)
        .then((res) => {
          const rows = Array.isArray(res.data?.data || res.data) ? (res.data?.data || res.data) : []
          const provinceKey = normalizeCode(provinceCode)
          setKabupatenLookup((prev) => {
            const next = { ...prev }
            rows.forEach((row: any) => {
              const codeKey = normalizeCode(row?.code || row?.id || row?.name)
              if (!codeKey) return
              next[`${provinceKey}|${codeKey}`] = String(row?.name || row?.code || '').trim()
            })
            return next
          })
        })
        .catch(() => {
          fetchedKabupatenRef.current.delete(provinceCode)
        })
    })

    const regencyPairs = Array.from(
      new Set(
        list
          .map((order) => {
            const provinceCode = String(order?.province || '').trim()
            const regencyCode = String(order?.regency || '').trim()
            if (!provinceCode || !regencyCode) return ''
            return `${provinceCode}|||${regencyCode}`
          })
          .filter(Boolean),
      ),
    )

    regencyPairs.forEach((pair) => {
      if (fetchedKecamatanRef.current.has(pair)) return
      fetchedKecamatanRef.current.add(pair)

      const [provinceCode, regencyCode] = pair.split('|||')
      fetchKecamatan(provinceCode, regencyCode)
        .then((res) => {
          const rows = Array.isArray(res.data?.data || res.data) ? (res.data?.data || res.data) : []
          const provinceKey = normalizeCode(provinceCode)
          const regencyKey = normalizeCode(regencyCode)
          setKecamatanLookup((prev) => {
            const next = { ...prev }
            rows.forEach((row: any) => {
              const codeKey = normalizeCode(row?.code || row?.id || row?.name)
              if (!codeKey) return
              next[`${provinceKey}|${regencyKey}|${codeKey}`] = String(row?.name || row?.code || '').trim()
            })
            return next
          })
        })
        .catch(() => {
          fetchedKecamatanRef.current.delete(pair)
        })
    })
  }, [list])

  useEffect(() => {
    if (isEdit || isDetail) {
      loadList({ page: 1, limit: 200 }).catch(() => setList([]))
    }
  }, [isDetail, isEdit])

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
      window.alert('Please select export date range first.')
      return
    }
    if (dayjs(fromDate).isAfter(dayjs(toDate), 'day')) {
      window.alert('Export from date cannot be after to date.')
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

  const selectedOrder = useMemo(() => {
    if (!selectedId) return null
    return list.find((order) => order.id === selectedId) || (stateOrder?.id === selectedId ? stateOrder : null)
  }, [list, selectedId, stateOrder])
  const selectedDealer = useMemo(() => {
    const rows = Array.isArray(lookups?.dealers) ? lookups.dealers : []
    return rows.find((dealer: any) => dealer.id === form.dealer_id) || null
  }, [form.dealer_id, lookups?.dealers])
  const detailProvinceCode = selectedOrder?.province || ''
  const detailRegencyCode = selectedOrder?.regency || ''

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
    if (!isDetail || !detailProvinceCode) {
      setDetailKabupaten([])
      setDetailKecamatan([])
      return
    }

    fetchKabupaten(detailProvinceCode)
      .then((res) => {
        setDetailKabupaten(res.data.data || res.data || [])
        if (!detailRegencyCode) {
          setDetailKecamatan([])
          return
        }
        return fetchKecamatan(detailProvinceCode, detailRegencyCode)
          .then((kecRes) => setDetailKecamatan(kecRes.data.data || kecRes.data || []))
          .catch(() => setDetailKecamatan([]))
      })
      .catch(() => {
        setDetailKabupaten([])
        setDetailKecamatan([])
      })
  }, [detailProvinceCode, detailRegencyCode, isDetail])

  useEffect(() => {
    if (form.province) {
      fetchKabupaten(form.province)
        .then((res) => setKabupaten(res.data.data || res.data || []))
        .catch(() => setKabupaten([]))
    } else {
      setKabupaten([])
      setKecamatan([])
    }
  }, [form.province])

  useEffect(() => {
    if (!provinces.length || !form.province) return
    const resolvedProvince = resolveOptionCode(provinces, form.province)
    if (!resolvedProvince || resolvedProvince === form.province) return
    setForm((prev) => ({ ...prev, province: resolvedProvince }))
  }, [form.province, provinces])

  useEffect(() => {
    if (form.province && form.regency) {
      fetchKecamatan(form.province, form.regency)
        .then((res) => setKecamatan(res.data.data || res.data || []))
        .catch(() => setKecamatan([]))
    } else {
      setKecamatan([])
    }
  }, [form.province, form.regency])

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
      window.alert('Pilih hasil untuk Finance Company 2.')
      return
    }
    if (!payload.finance_company2_id && payload.result_status2) {
      window.alert('Pilih Finance Company 2 sebelum mengisi hasil Finance 2.')
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
      const message = err?.response?.data?.error || err?.message || 'Gagal menyimpan order'
      setError(message)
      window.alert(message)
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
      await loadList({
        page,
        limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        from_date: filters.export_from || undefined,
        to_date: filters.export_to || undefined,
      })
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Gagal menghapus order'
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const selectedMotor = lookups?.motor_types?.find((m: any) => m.id === form.motor_type_id)
  const dpPct = selectedMotor?.otr ? ((form.dp_paid / selectedMotor.otr) * 100).toFixed(1) : '0'

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const parseNumber = (value: string) => Number(value.replace(/[^0-9]/g, '')) || 0
  const exportJobTone = exportJob?.status === 'failed' ? 'error' : exportJob?.status === 'downloaded' ? 'success' : 'info'
  const exportJobRunning = exportJob?.status === 'queued' || exportJob?.status === 'running' || exportDownloading
  const detailAttempts = useMemo(() => {
    if (!selectedOrder) return []

    const attempts = Array.isArray(selectedOrder?.attempts) ? [...selectedOrder.attempts] : []
    const hasAttempt1 = attempts.some((item: any) => Number(item?.attempt_no) === 1)
    if (!hasAttempt1) {
      attempts.push({
        attempt_no: 1,
        finance_company_id: selectedOrder.finance_company_id,
        status: selectedOrder.result_status,
        notes: selectedOrder.result_notes,
        created_at: selectedOrder.created_at,
      })
    }

    return attempts
      .filter((item: any) => {
        const attemptNo = Number(item?.attempt_no || 0)
        return attemptNo > 0 && attemptNo <= 2
      })
      .sort((a: any, b: any) => Number(a?.attempt_no || 0) - Number(b?.attempt_no || 0))
      .filter((item: any, index: number, rows: any[]) => {
        if (index === 0) return true
        const prev = rows[index - 1]
        return String(prev?.status || '').toLowerCase() === 'reject'
      })
  }, [selectedOrder])
  const detailMotor = selectedOrder?.motor_type || lookups?.motor_types?.find((m: any) => m.id === selectedOrder?.motor_type_id) || null
  const detailDpPct = Number.isFinite(Number(selectedOrder?.dp_pct))
    ? Number(selectedOrder?.dp_pct)
    : selectedOrder?.otr
      ? (Number(selectedOrder?.dp_paid || 0) / Number(selectedOrder.otr || 1)) * 100
      : 0
  const detailProvinceName = lookupOptionName(provinces, selectedOrder?.province)
  const detailRegencyName = lookupOptionName(detailKabupaten, selectedOrder?.regency)
  const detailDistrictName = lookupOptionName(detailKecamatan, selectedOrder?.district)
  const detailVillageName = selectedOrder?.village || '-'
  const orderLocationLabel = (order: any) => {
    const provinceCode = String(order?.province || '').trim()
    const regencyCode = String(order?.regency || '').trim()
    const districtCode = String(order?.district || '').trim()
    const village = String(order?.village || '').trim()
    const address = String(order?.address || '').trim()

    const provinceName = lookupOptionName(provinces, provinceCode)
    const provinceKey = normalizeCode(provinceCode)
    const regencyKey = normalizeCode(regencyCode)
    const districtKey = normalizeCode(districtCode)

    const regencyName = regencyCode
      ? kabupatenLookup[`${provinceKey}|${regencyKey}`] || regencyCode
      : '-'
    const districtName = districtCode
      ? kecamatanLookup[`${provinceKey}|${regencyKey}|${districtKey}`] || districtCode
      : '-'

    return (
      [districtName, regencyName, provinceName]
        .filter((item) => String(item || '').trim() && item !== '-')
        .join(', ') || '-'
    )
  }

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Order</div>
            <div style={{ color: '#64748b' }}>Lihat data lengkap order in</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button
                className="btn"
                onClick={() => navigate(`/orders/${selectedId}/edit`, { state: { order: selectedOrder, back_to: backTo } })}
              >
                Edit Order
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate(backTo)}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedOrder && <div className="alert">Order tidak ditemukan.</div>}
          {selectedOrder && (
            <div className="card">
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 12 }}>
                  <div className="card" style={{ background: '#f8fafc' }}>
                    <h4 style={{ marginTop: 0 }}>Informasi Utama</h4>
                    <DetailTable
                      rows={[
                        { label: 'Pooling Number', value: selectedOrder.pooling_number || '-' },
                        { label: 'Waktu Pooling', value: formatDate(selectedOrder.pooling_at) },
                        { label: 'Waktu Hasil', value: formatDate(selectedOrder.result_at) },
                        { label: 'Dealer', value: lookupName(lookups?.dealers, selectedOrder.dealer_id) },
                        {
                          label: 'Status Order',
                          value: <span className={`badge ${selectedOrder.result_status || 'pending'}`}>{selectedOrder.result_status || '-'}</span>,
                        },
                        { label: 'Catatan Order', value: selectedOrder.result_notes || '-' },
                        { label: 'Dibuat', value: formatDate(selectedOrder.created_at) },
                        { label: 'Update Terakhir', value: formatDate(selectedOrder.updated_at) },
                      ]}
                    />
                  </div>

                  <div className="card" style={{ background: '#f8fafc' }}>
                    <h4 style={{ marginTop: 0 }}>Data Konsumen</h4>
                    <DetailTable
                      rows={[
                        { label: 'Nama', value: selectedOrder.consumer_name || '-' },
                        { label: 'Phone', value: selectedOrder.consumer_phone || '-' },
                        { label: 'Provinsi', value: detailProvinceName },
                        { label: 'Kabupaten/Kota', value: detailRegencyName },
                        { label: 'Kecamatan', value: detailDistrictName },
                        { label: 'Kelurahan', value: detailVillageName },
                        { label: 'Alamat', value: selectedOrder.address || '-' },
                        { label: 'Pekerjaan', value: lookupName(lookups?.jobs, selectedOrder.job_id) },
                      ]}
                    />
                  </div>

                  <div className="card" style={{ background: '#f8fafc' }}>
                    <h4 style={{ marginTop: 0 }}>Kredit & Motor</h4>
                    <DetailTable
                      rows={[
                        { label: 'Tipe Motor', value: lookupName(lookups?.motor_types, selectedOrder.motor_type_id) },
                        { label: 'Brand/Model', value: [detailMotor?.brand, detailMotor?.model].filter(Boolean).join(' / ') || '-' },
                        { label: 'OTR', value: formatRupiah(selectedOrder.otr || 0) },
                        { label: 'Angsuran', value: formatRupiah(selectedOrder.installment || 0) },
                        { label: 'DP Gross', value: formatRupiah(selectedOrder.dp_gross || 0) },
                        { label: 'DP Setor', value: formatRupiah(selectedOrder.dp_paid || 0) },
                        { label: '%DP', value: `${Number.isFinite(detailDpPct) ? detailDpPct.toFixed(1) : '0.0'}%` },
                        { label: 'Tenor', value: `${selectedOrder.tenor || 0} bln` },
                      ]}
                    />
                  </div>
                </div>

                <div className="card" style={{ background: '#f8fafc' }}>
                  <h4 style={{ marginTop: 0 }}>Hasil Finance</h4>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 12 }}>
                    {detailAttempts.map((attempt: any) => (
                      <div
                        key={`attempt-${attempt.attempt_no}`}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#fff', minWidth: 0 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <strong>Finance Attempt {attempt.attempt_no}</strong>
                          <span className={`badge ${attempt?.status || 'pending'}`}>{attempt?.status || '-'}</span>
                        </div>
                        <DetailTable
                          rows={[
                            {
                              label: 'Finance Company',
                              value: lookupName(lookups?.finance_companies, attempt?.finance_company_id),
                            },
                            { label: 'Catatan', value: attempt?.notes || '-' },
                            { label: 'Waktu Attempt', value: formatDate(attempt?.created_at) },
                          ]}
                        />
                      </div>
                    ))}
                    {detailAttempts.length === 0 && (
                      <div style={{ color: '#64748b', fontSize: 13 }}>Belum ada data attempt finance.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isCreate || isEdit) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Order In' : 'Input Order In'}</div>
            <div style={{ color: '#64748b' }}>Form order dipisah dari tabel utama</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/orders')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card">
            {isCreate && !canCreate && <div className="alert">Anda tidak punya izin membuat order.</div>}
            {isEdit && !canUpdate && <div className="alert">Anda tidak punya izin mengubah order.</div>}
            {error && <div className="alert" style={{ marginBottom: 10 }}>{error}</div>}

            <form
              className="grid"
              style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', alignItems: 'start' }}
              onSubmit={submit}
            >
              <div>
                <label>Dealer</label>
                <select
                  value={form.dealer_id}
                  onChange={(e) => set('dealer_id', e.target.value)}
                  required
                  disabled={role === 'dealer' && lookups?.dealers?.length === 1}
                >
                  <option value="">Pilih</option>
                  {lookups?.dealers?.map((dealer: any) => (
                    <option key={dealer.id} value={dealer.id}>{dealer.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Nomor Pooling</label>
                <input value={form.pooling_number} onChange={(e) => set('pooling_number', e.target.value)} required />
              </div>

              <div>
                <label>Waktu Pooling</label>
                <input
                  type="datetime-local"
                  value={dayjs(form.pooling_at).format('YYYY-MM-DDTHH:mm')}
                  onChange={(e) => set('pooling_at', dayjs(e.target.value).toISOString())}
                  required
                />
              </div>

              <div>
                <label>Waktu Hasil</label>
                <input
                  type="datetime-local"
                  value={form.result_at ? dayjs(form.result_at).format('YYYY-MM-DDTHH:mm') : ''}
                  onChange={(e) => set('result_at', e.target.value ? dayjs(e.target.value).toISOString() : '')}
                />
              </div>

              <div>
                <label>Finance Company 1</label>
                <select value={form.finance_company_id} onChange={(e) => set('finance_company_id', e.target.value)} required>
                  <option value="">Pilih</option>
                  {lookups?.finance_companies?.map((finance: any) => (
                    <option key={finance.id} value={finance.id}>{finance.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Nama Konsumen</label>
                <input value={form.consumer_name} onChange={(e) => set('consumer_name', e.target.value)} required />
              </div>

              <div>
                <label>No HP</label>
                <input value={form.consumer_phone} onChange={(e) => set('consumer_phone', e.target.value)} required />
              </div>

              <div>
                <label>Provinsi</label>
                <select
                  value={form.province}
                  onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value, regency: '', district: '' }))}
                  required
                >
                  <option value="">Pilih</option>
                  {provinces.map((prov: any) => (
                    <option key={prov.code} value={prov.code}>{prov.name}</option>
                  ))}
                  {form.province && !resolveOptionCode(provinces, form.province) && (
                    <option value={form.province}>{lookupOptionName(provinces, form.province)}</option>
                  )}
                </select>
              </div>

              <div>
                <label>Kabupaten/Kota</label>
                <select
                  value={form.regency}
                  onChange={(e) => setForm((prev) => ({ ...prev, regency: e.target.value, district: '' }))}
                  disabled={!form.province}
                >
                  <option value="">Pilih</option>
                  {kabupaten.map((kab: any) => (
                    <option key={kab.code} value={kab.code}>{kab.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Kecamatan</label>
                <select value={form.district} onChange={(e) => set('district', e.target.value)} disabled={!form.regency}>
                  <option value="">Pilih</option>
                  {kecamatan.map((kec: any) => (
                    <option key={kec.code} value={kec.code}>{kec.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Kelurahan</label>
                <input value={form.village} onChange={(e) => set('village', e.target.value)} placeholder="Tulis kelurahan" />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Alamat</label>
                <input value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>

              <div>
                <label>Pekerjaan</label>
                <select value={form.job_id} onChange={(e) => set('job_id', e.target.value)}>
                  <option value="">Pilih</option>
                  {lookups?.jobs?.map((job: any) => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Tipe Motor</label>
                <select value={form.motor_type_id} onChange={(e) => set('motor_type_id', e.target.value)}>
                  <option value="">Pilih</option>
                  {filteredMotorTypes.map((motor: any) => (
                    <option key={motor.id} value={motor.id}>
                      {motor.name} - OTR {motor.otr?.toLocaleString?.('id-ID')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>OTR (auto)</label>
                <input value={selectedMotor?.otr ? formatRupiah(selectedMotor.otr) : ''} readOnly />
              </div>

              <div>
                <label>DP Gross</label>
                <input
                  type="text"
                  value={formatRupiah(form.dp_gross)}
                  onChange={(e) => set('dp_gross', parseNumber(e.target.value))}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label>DP Setor</label>
                <input
                  type="text"
                  value={formatRupiah(form.dp_paid)}
                  onChange={(e) => set('dp_paid', parseNumber(e.target.value))}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label>%DP (auto)</label>
                <input value={dpPct} readOnly />
              </div>

              <div>
                <label>Tenor</label>
                <input type="number" min={1} max={60} value={form.tenor} onChange={(e) => set('tenor', Number(e.target.value))} />
              </div>

              <div>
                <label>Angsuran</label>
                <input
                  type="text"
                  value={formatRupiah(form.installment)}
                  onChange={(e) => set('installment', parseNumber(e.target.value))}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label>Hasil</label>
                <select value={form.result_status} onChange={(e) => set('result_status', e.target.value)}>
                  <option value="approve">Approve</option>
                  <option value="pending">Pending</option>
                  <option value="reject">Reject</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Keterangan Hasil</label>
                <input value={form.result_notes} onChange={(e) => set('result_notes', e.target.value)} />
              </div>

              {form.result_status === 'reject' && !showAttempt2 && poolingRowsCount >= 2 && (
                <div style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: 12 }}>
                  Pooling number ini sudah memiliki 2 data, sehingga tidak bisa menambah finance attempt baru.
                </div>
              )}

              {showAttempt2 && (
                <>
                  <div style={{ gridColumn: '1 / -1', marginTop: 4, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Finance Attempt 2</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginBottom: 10 }}>
                      Attempt 2 akan tampil ketika hasil attempt 1 adalah reject.
                    </div>
                  </div>

                  <div>
                    <label>Finance Company 2</label>
                    <select value={form.finance_company2_id} onChange={(e) => set('finance_company2_id', e.target.value)}>
                      <option value="">Pilih</option>
                      {lookups?.finance_companies?.map((finance: any) => (
                        <option key={finance.id} value={finance.id}>{finance.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Hasil Finance 2</label>
                    <select value={form.result_status2} onChange={(e) => set('result_status2', e.target.value)}>
                      <option value="">--</option>
                      <option value="approve">Approve</option>
                      <option value="pending">Pending</option>
                      <option value="reject">Reject</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Keterangan Finance 2</label>
                    <input value={form.result_notes2} onChange={(e) => set('result_notes2', e.target.value)} />
                  </div>
                </>
              )}

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Order'}</button>
                <button
                  className="btn-ghost"
                  type="button"
                  onClick={() => {
                    setForm(defaultForm)
                    setError('')
                    navigate('/orders')
                  }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Form Order In</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/orders/create')}>Input Order</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <label>Search</label>
              <input placeholder={'Search ..'} value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} />
            </div>
            <div>
              <label>Status</label>
              <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="">Semua</option>
                <option value="approve">Approve</option>
                <option value="pending">Pending</option>
                <option value="reject">Reject</option>
              </select>
            </div>
            <div>
              <label>Export From</label>
              <input
                type="date"
                value={filters.export_from}
                onChange={(e) => setFilters((prev) => ({ ...prev, export_from: e.target.value }))}
              />
            </div>
            <div>
              <label>Export To</label>
              <input
                type="date"
                value={filters.export_to}
                onChange={(e) => setFilters((prev) => ({ ...prev, export_to: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button
                className="btn"
                type="button"
                onClick={() => void requestOrderExport()}
                disabled={exportJobRunning}
                style={{ width: '100%' }}
              >
                {exportJobRunning ? 'Exporting...' : 'Export to Excel'}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Order List</h3>
          {!showTable && <div className="alert">Anda tidak punya izin melihat order.</div>}
          {showTable && (
            <>
              <table className="table">
              <thead>
                <tr>
                  <th>Pooling</th>
                  <th>Konsumen</th>
                  <th>Lokasi</th>
                  <th>Finance</th>
                  <th>Status</th>
                  <th>Tenor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((order) => (
                  <tr key={order.id}>
                    <td>{order.pooling_number}</td>
                    <td>{order.consumer_name}</td>
                    <td>{orderLocationLabel(order)}</td>
                    <td>
                      <div>{lookupName(lookups?.finance_companies, getAttempt(order, 1)?.finance_company_id)}</div>
                      {getAttempt(order, 2)?.finance_company_id && (
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          F2: {lookupName(lookups?.finance_companies, getAttempt(order, 2)?.finance_company_id)}
                        </div>
                      )}
                    </td>
                    <td><span className={`badge ${order.result_status}`}>{order.result_status}</span></td>
                    <td>{order.tenor} bln</td>
                    <td className="action-cell">
                      <ActionMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`/orders/${order.id}`, { state: { order } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`/orders/${order.id}/edit`, { state: { order } }),
                            hidden: !canUpdate,
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            onClick: () => void removeOrder(order.id),
                            hidden: !canDelete,
                            danger: true,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={7}>Belum ada order.</td>
                  </tr>
                )}
              </tbody>
              </table>

              <Pagination
                page={page}
                totalPages={totalPages}
                totalData={totalData}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next)
                  setPage(1)
                }}
              />
            </>
          )}
        </div>
      </div>

      {exportJob && (
        <div className="toast-stack">
          <div className={`toast-card ${exportJobTone}`} role="status" aria-live="polite" style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div className="toast-message">{exportJob.message || 'Export in progress'}</div>
              {(exportJob.status === 'failed' || exportJob.status === 'downloaded') && (
                <button className="toast-close" onClick={() => setExportJob(null)} aria-label="Close export toast">x</button>
              )}
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(15, 23, 42, 0.12)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, Number(exportJob.progress || 0)))}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: exportJob.status === 'failed' ? '#ef4444' : '#2563eb',
                  transition: 'width 220ms ease',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#334155' }}>
              {Math.max(0, Math.min(100, Number(exportJob.progress || 0)))}%
              {exportJob.error ? ` · ${exportJob.error}` : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getAttempt(order: any, attemptNo: number) {
  const attempts = Array.isArray(order?.attempts) ? order.attempts : []
  return attempts.find((attempt: any) => Number(attempt?.attempt_no) === Number(attemptNo)) || null
}

function normalizeCode(value?: string) {
  return String(value || '').trim().toLowerCase()
}

function lookupName(list: any[] | undefined, id: string) {
  if (!id) return '-'
  return list?.find((item) => item.id === id)?.name || id
}

function lookupOptionName(list: any[] | undefined, code?: string) {
  if (!code) return '-'
  const rawCode = String(code).trim()
  const normalized = rawCode.toLowerCase()
  const found =
    list?.find((item: any) => String(item?.code || item?.id || '').trim().toLowerCase() === normalized) ||
    list?.find((item: any) => String(item?.name || '').trim().toLowerCase() === normalized)
  return found?.name || rawCode
}

function resolveOptionCode(list: any[] | undefined, value?: string) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  const normalized = rawValue.toLowerCase()
  const found =
    list?.find((item: any) => String(item?.code || item?.id || '').trim().toLowerCase() === normalized) ||
    list?.find((item: any) => String(item?.name || '').trim().toLowerCase() === normalized)
  return String(found?.code || found?.id || '').trim()
}

function formatDate(value?: string) {
  if (!value) return '-'
  return dayjs(value).format('DD MMM YYYY HH:mm')
}

function DetailTable({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <table className="table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: '44%', textTransform: 'none', letterSpacing: 'normal' }}>{row.label}</th>
            <td style={{ fontWeight: 600, wordBreak: 'break-word' }}>{row.value ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
