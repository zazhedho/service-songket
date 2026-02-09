import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  createDealer,
  createFinanceCompany,
  deleteDealer,
  deleteFinanceCompany,
  fetchDealerMetrics,
  fetchDealers,
  fetchFinanceCompanies,
  fetchKabupaten,
  fetchKecamatan,
  fetchLookups,
  fetchProvinces,
  updateDealer,
  updateFinanceCompany,
} from '../api'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type Option = { code: string; name: string }

type DealerForm = {
  name: string
  province: string
  regency: string
  district: string
  village: string
  phone: string
  address: string
  lat: string
  lng: string
}

type FinanceForm = {
  name: string
  province: string
  regency: string
  district: string
  village: string
  phone: string
  address: string
}

type CompanyDealerRow = {
  dealer_id: string
  dealer_name: string
  total_orders: number
  approval_rate: number
  lead_time_seconds_avg: number | null
  rescue_approved_fc2: number
}

type CompanySummary = {
  total_orders: number
  approval_rate: number
  lead_time_seconds_avg: number | null
  rescue_approved_fc2: number
  active_dealers: number
  dealer_rows: CompanyDealerRow[]
}

const initialDealerForm: DealerForm = {
  name: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  phone: '',
  address: '',
  lat: '',
  lng: '',
}

const initialFinanceForm: FinanceForm = {
  name: '',
  province: '',
  regency: '',
  district: '',
  village: '',
  phone: '',
  address: '',
}

function parseFinanceMode(pathname: string) {
  if (pathname.endsWith('/dealers/create')) return 'dealer_create'
  if (/\/finance\/dealers\/[^/]+\/edit$/.test(pathname)) return 'dealer_edit'
  if (/\/finance\/dealers\/[^/]+$/.test(pathname)) return 'dealer_detail'
  if (pathname.endsWith('/companies/create')) return 'company_create'
  if (/\/finance\/companies\/[^/]+\/edit$/.test(pathname)) return 'company_edit'
  if (/\/finance\/companies\/[^/]+$/.test(pathname)) return 'company_detail'
  return 'list'
}

function getListTab(searchParams: URLSearchParams): 'dealer' | 'finance' {
  return searchParams.get('tab') === 'finance' ? 'finance' : 'dealer'
}

export default function FinancePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const mode = parseFinanceMode(location.pathname)
  const selectedId = params.id || ''

  const isList = mode === 'list'
  const isDealerCreate = mode === 'dealer_create'
  const isDealerEdit = mode === 'dealer_edit'
  const isDealerDetail = mode === 'dealer_detail'
  const isCompanyCreate = mode === 'company_create'
  const isCompanyEdit = mode === 'company_edit'
  const isCompanyDetail = mode === 'company_detail'

  const listTab = getListTab(searchParams)

  const perms = useAuth((s) => s.permissions)
  const canView = perms.includes('list_finance_dealers')
  const canManage = canView

  const [dealers, setDealers] = useState<any[]>([])
  const [financeCompanies, setFinanceCompanies] = useState<any[]>([])
  const [dealerPage, setDealerPage] = useState(1)
  const [dealerLimit, setDealerLimit] = useState(20)
  const [dealerTotalPages, setDealerTotalPages] = useState(1)
  const [dealerTotalData, setDealerTotalData] = useState(0)
  const [financePage, setFinancePage] = useState(1)
  const [financeLimit, setFinanceLimit] = useState(20)
  const [financeTotalPages, setFinanceTotalPages] = useState(1)
  const [financeTotalData, setFinanceTotalData] = useState(0)

  const [selectedDealerId, setSelectedDealerId] = useState<string>('')
  const [metrics, setMetrics] = useState<any>(null)
  const [fcFilter, setFcFilter] = useState('')
  const [dealerSearch, setDealerSearch] = useState('')
  const [financeSearch, setFinanceSearch] = useState('')
  const [dealerProvinceFilter, setDealerProvinceFilter] = useState('')
  const [financeProvinceFilter, setFinanceProvinceFilter] = useState('')

  const [provinces, setProvinces] = useState<Option[]>([])
  const [dealerKabupaten, setDealerKabupaten] = useState<Option[]>([])
  const [dealerKecamatan, setDealerKecamatan] = useState<Option[]>([])
  const [financeKabupaten, setFinanceKabupaten] = useState<Option[]>([])
  const [financeKecamatan, setFinanceKecamatan] = useState<Option[]>([])

  const [dealerForm, setDealerForm] = useState<DealerForm>(initialDealerForm)
  const [financeForm, setFinanceForm] = useState<FinanceForm>(initialFinanceForm)
  const [savingDealer, setSavingDealer] = useState(false)
  const [savingFinance, setSavingFinance] = useState(false)

  const [companySummary, setCompanySummary] = useState<CompanySummary | null>(null)
  const [companySummaryLoading, setCompanySummaryLoading] = useState(false)

  const stateDealer = (location.state as any)?.dealer || null
  const stateCompany = (location.state as any)?.company || null

  const loadDealers = async () => {
    const dealerRes = await fetchDealers({
      page: dealerPage,
      limit: dealerLimit,
      search: dealerSearch || undefined,
      filters: { province: dealerProvinceFilter || undefined },
    })
    const dealerData = dealerRes.data.data || dealerRes.data || []

    setDealers(dealerData)
    setDealerTotalPages(dealerRes.data.total_pages || 1)
    setDealerTotalData(dealerRes.data.total_data || 0)
    setDealerPage(dealerRes.data.current_page || dealerPage)

    if (!selectedDealerId && dealerData.length > 0) {
      setSelectedDealerId(dealerData[0].id)
    }
  }

  const loadFinanceCompanies = async () => {
    const [companyRes, lookupRes] = await Promise.all([
      fetchFinanceCompanies({
        page: financePage,
        limit: financeLimit,
        search: financeSearch || undefined,
        filters: { province: financeProvinceFilter || undefined },
      }),
      fetchLookups(),
    ])

    const companyData = companyRes.data.data || companyRes.data || []
    setFinanceCompanies(companyData)
    setFinanceTotalPages(companyRes.data.total_pages || 1)
    setFinanceTotalData(companyRes.data.total_data || 0)
    setFinancePage(companyRes.data.current_page || financePage)

    if (!Array.isArray(companyData) || companyData.length === 0) {
      const fallback = lookupRes.data.data?.finance_companies || lookupRes.data?.finance_companies || []
      setFinanceCompanies(Array.isArray(fallback) ? fallback : [])
    }
  }

  useEffect(() => {
    if (!canView) return
    Promise.all([fetchProvinces(), loadDealers(), loadFinanceCompanies()])
      .then(([provRes]) => setProvinces(provRes.data.data || provRes.data || []))
      .catch(() => {
        setProvinces([])
        setDealers([])
        setFinanceCompanies([])
      })
  }, [
    canView,
    dealerLimit,
    dealerPage,
    dealerProvinceFilter,
    dealerSearch,
    financeLimit,
    financePage,
    financeProvinceFilter,
    financeSearch,
  ])

  useEffect(() => {
    setDealerPage(1)
  }, [dealerSearch])

  useEffect(() => {
    setDealerPage(1)
  }, [dealerProvinceFilter])

  useEffect(() => {
    setFinancePage(1)
  }, [financeSearch])

  useEffect(() => {
    setFinancePage(1)
  }, [financeProvinceFilter])

  useEffect(() => {
    if (!selectedDealerId || !(isList && listTab === 'dealer')) {
      setMetrics(null)
      return
    }
    fetchDealerMetrics(selectedDealerId, fcFilter ? { finance_company_id: fcFilter } : undefined)
      .then((res) => setMetrics(res.data.data || res.data || null))
      .catch(() => setMetrics(null))
  }, [fcFilter, isList, listTab, selectedDealerId])

  useEffect(() => {
    if (dealers.length === 0) {
      setSelectedDealerId('')
      return
    }
    if (!selectedDealerId || !dealers.some((item) => item.id === selectedDealerId)) {
      setSelectedDealerId(dealers[0].id)
    }
  }, [dealers, selectedDealerId])

  const selectedDealer = useMemo(() => {
    if (!selectedId) return null
    return dealers.find((dealer) => dealer.id === selectedId) || (stateDealer?.id === selectedId ? stateDealer : null)
  }, [dealers, selectedId, stateDealer])

  const selectedCompany = useMemo(() => {
    if (!selectedId) return null
    return financeCompanies.find((company) => company.id === selectedId) || (stateCompany?.id === selectedId ? stateCompany : null)
  }, [financeCompanies, selectedId, stateCompany])

  useEffect(() => {
    if (!isCompanyDetail || !selectedCompany?.id || dealers.length === 0) {
      setCompanySummary(null)
      return
    }

    setCompanySummaryLoading(true)
    Promise.all(
      dealers.map(async (dealer) => {
        try {
          const res = await fetchDealerMetrics(dealer.id)
          const data = res.data.data || res.data || {}
          const rows = Array.isArray(data.finance_companies) ? data.finance_companies : []
          const row = rows.find((fc: any) => fc.finance_company_id === selectedCompany.id)
          if (!row) return null

          return {
            dealer_id: dealer.id,
            dealer_name: dealer.name || '-',
            total_orders: Number(row.total_orders || 0),
            approval_rate: Number(row.approval_rate || 0),
            lead_time_seconds_avg:
              row.lead_time_seconds_avg == null ? null : Number(row.lead_time_seconds_avg),
            rescue_approved_fc2: Number(row.rescue_approved_fc2 || 0),
          } as CompanyDealerRow
        } catch {
          return null
        }
      }),
    )
      .then((results) => {
        const rows = results.filter((item): item is CompanyDealerRow => item !== null)

        const totalOrders = rows.reduce((sum, item) => sum + item.total_orders, 0)
        const approvedCount = rows.reduce((sum, item) => sum + item.approval_rate * item.total_orders, 0)
        const rescueCount = rows.reduce((sum, item) => sum + item.rescue_approved_fc2, 0)

        let leadWeight = 0
        let leadTotal = 0
        rows.forEach((item) => {
          if (item.lead_time_seconds_avg != null && item.total_orders > 0) {
            leadWeight += item.lead_time_seconds_avg * item.total_orders
            leadTotal += item.total_orders
          }
        })

        const summary: CompanySummary = {
          total_orders: totalOrders,
          approval_rate: totalOrders > 0 ? approvedCount / totalOrders : 0,
          lead_time_seconds_avg: leadTotal > 0 ? leadWeight / leadTotal : null,
          rescue_approved_fc2: rescueCount,
          active_dealers: rows.filter((item) => item.total_orders > 0).length,
          dealer_rows: rows.sort((a, b) => b.total_orders - a.total_orders),
        }

        setCompanySummary(summary)
      })
      .finally(() => setCompanySummaryLoading(false))
  }, [dealers, isCompanyDetail, selectedCompany?.id])

  const dealerPoints = useMemo(() => {
    return dealers
      .map((dealer) => ({ ...dealer, _lat: Number(dealer.lat ?? dealer.latitude), _lng: Number(dealer.lng ?? dealer.longitude) }))
      .filter((dealer) => Number.isFinite(dealer._lat) && Number.isFinite(dealer._lng))
  }, [dealers])

  const currentDealer = dealers.find((dealer) => dealer.id === selectedDealerId)
  const currentLat = Number(currentDealer?.lat ?? currentDealer?.latitude)
  const currentLng = Number(currentDealer?.lng ?? currentDealer?.longitude)

  const center: [number, number] =
    Number.isFinite(currentLat) && Number.isFinite(currentLng)
      ? [currentLat, currentLng]
      : dealerPoints.length > 0
        ? [dealerPoints[0]._lat, dealerPoints[0]._lng]
        : [-8.58, 116.12]

  const setTab = (tab: 'dealer' | 'finance') => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'finance') next.set('tab', 'finance')
    else next.delete('tab')
    setSearchParams(next, { replace: true })
  }

  const handleDealerProvince = async (code: string) => {
    setDealerForm((prev) => ({ ...prev, province: code, regency: '', district: '' }))
    setDealerKecamatan([])

    if (!code) {
      setDealerKabupaten([])
      return
    }

    try {
      const res = await fetchKabupaten(code)
      setDealerKabupaten(res.data.data || res.data || [])
    } catch {
      setDealerKabupaten([])
    }
  }

  const handleDealerRegency = async (code: string) => {
    setDealerForm((prev) => ({ ...prev, regency: code, district: '' }))

    if (!dealerForm.province || !code) {
      setDealerKecamatan([])
      return
    }

    try {
      const res = await fetchKecamatan(dealerForm.province, code)
      setDealerKecamatan(res.data.data || res.data || [])
    } catch {
      setDealerKecamatan([])
    }
  }

  const handleFinanceProvince = async (code: string) => {
    setFinanceForm((prev) => ({ ...prev, province: code, regency: '', district: '' }))
    setFinanceKecamatan([])

    if (!code) {
      setFinanceKabupaten([])
      return
    }

    try {
      const res = await fetchKabupaten(code)
      setFinanceKabupaten(res.data.data || res.data || [])
    } catch {
      setFinanceKabupaten([])
    }
  }

  const handleFinanceRegency = async (code: string) => {
    setFinanceForm((prev) => ({ ...prev, regency: code, district: '' }))

    if (!financeForm.province || !code) {
      setFinanceKecamatan([])
      return
    }

    try {
      const res = await fetchKecamatan(financeForm.province, code)
      setFinanceKecamatan(res.data.data || res.data || [])
    } catch {
      setFinanceKecamatan([])
    }
  }

  useEffect(() => {
    if (isDealerCreate) {
      setDealerForm(initialDealerForm)
      setDealerKabupaten([])
      setDealerKecamatan([])
      return
    }

    if (isDealerEdit && selectedDealer) {
      const next: DealerForm = {
        name: selectedDealer.name || '',
        province: selectedDealer.province || '',
        regency: selectedDealer.regency || '',
        district: selectedDealer.district || '',
        village: selectedDealer.village || '',
        phone: selectedDealer.phone || '',
        address: selectedDealer.address || '',
        lat: String(selectedDealer.lat ?? selectedDealer.latitude ?? ''),
        lng: String(selectedDealer.lng ?? selectedDealer.longitude ?? ''),
      }

      setDealerForm(next)

      if (next.province) {
        fetchKabupaten(next.province)
          .then((kab) => {
            const kabData = kab.data.data || kab.data || []
            setDealerKabupaten(kabData)
            if (next.regency) {
              fetchKecamatan(next.province, next.regency)
                .then((kec) => setDealerKecamatan(kec.data.data || kec.data || []))
                .catch(() => setDealerKecamatan([]))
            }
          })
          .catch(() => {
            setDealerKabupaten([])
            setDealerKecamatan([])
          })
      }
    }
  }, [isDealerCreate, isDealerEdit, selectedDealer])

  useEffect(() => {
    if (isCompanyCreate) {
      setFinanceForm(initialFinanceForm)
      setFinanceKabupaten([])
      setFinanceKecamatan([])
      return
    }

    if (isCompanyEdit && selectedCompany) {
      const next: FinanceForm = {
        name: selectedCompany.name || '',
        province: selectedCompany.province || '',
        regency: selectedCompany.regency || '',
        district: selectedCompany.district || '',
        village: selectedCompany.village || '',
        phone: selectedCompany.phone || '',
        address: selectedCompany.address || '',
      }

      setFinanceForm(next)

      if (next.province) {
        fetchKabupaten(next.province)
          .then((kab) => {
            const kabData = kab.data.data || kab.data || []
            setFinanceKabupaten(kabData)
            if (next.regency) {
              fetchKecamatan(next.province, next.regency)
                .then((kec) => setFinanceKecamatan(kec.data.data || kec.data || []))
                .catch(() => setFinanceKecamatan([]))
            }
          })
          .catch(() => {
            setFinanceKabupaten([])
            setFinanceKecamatan([])
          })
      }
    }
  }, [isCompanyCreate, isCompanyEdit, selectedCompany])

  const submitDealer = async (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return

    const lat = Number(dealerForm.lat)
    const lng = Number(dealerForm.lng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      window.alert('Latitude/Longitude tidak valid')
      return
    }

    const payload = {
      name: dealerForm.name.trim(),
      province: dealerForm.province.trim(),
      regency: dealerForm.regency.trim(),
      district: dealerForm.district.trim(),
      village: dealerForm.village.trim(),
      phone: dealerForm.phone.trim(),
      address: dealerForm.address.trim(),
      lat,
      lng,
    }

    setSavingDealer(true)
    try {
      if (isDealerEdit && selectedId) await updateDealer(selectedId, payload)
      else await createDealer(payload)
      await loadBaseData()
      navigate('/finance?tab=dealer')
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menyimpan dealer')
    } finally {
      setSavingDealer(false)
    }
  }

  const submitFinance = async (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return

    const payload = {
      name: financeForm.name.trim(),
      province: financeForm.province.trim(),
      regency: financeForm.regency.trim(),
      district: financeForm.district.trim(),
      village: financeForm.village.trim(),
      phone: financeForm.phone.trim(),
      address: financeForm.address.trim(),
    }

    setSavingFinance(true)
    try {
      if (isCompanyEdit && selectedId) await updateFinanceCompany(selectedId, payload)
      else await createFinanceCompany(payload)
      await loadBaseData()
      navigate('/finance?tab=finance')
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menyimpan finance company')
    } finally {
      setSavingFinance(false)
    }
  }

  const removeDealer = async (id: string) => {
    if (!canManage) return
    if (!window.confirm('Hapus dealer ini?')) return
    try {
      await deleteDealer(id)
      await loadBaseData()
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menghapus dealer')
    }
  }

  const removeFinance = async (id: string) => {
    if (!canManage) return
    if (!window.confirm('Hapus finance company ini?')) return
    try {
      await deleteFinanceCompany(id)
      await loadBaseData()
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menghapus finance company')
    }
  }

  if (!canView) {
    return (
      <div className="page">
        <div className="card">
          <h3>Peta & Finance</h3>
          <div className="alert">Tidak ada izin melihat finance.</div>
        </div>
      </div>
    )
  }

  if (isDealerDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Dealer</div>
            <div style={{ color: '#64748b' }}>Informasi dealer dan peta lokasi</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canManage && selectedId && (
              <button className="btn" onClick={() => navigate(`/finance/dealers/${selectedId}/edit`, { state: { dealer: selectedDealer } })}>
                Edit Dealer
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/finance?tab=dealer')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedDealer && <div className="alert">Dealer tidak ditemukan.</div>}
          {selectedDealer && (
            <>
              <div className="card" style={{ maxWidth: 860 }}>
                <DetailRow label="Nama" value={selectedDealer.name} />
                <DetailRow label="Telepon" value={selectedDealer.phone || '-'} />
                <DetailRow label="Provinsi" value={selectedDealer.province || '-'} />
                <DetailRow label="Kab/Kota" value={selectedDealer.regency || '-'} />
                <DetailRow label="Kecamatan" value={selectedDealer.district || '-'} />
                <DetailRow label="Kelurahan" value={selectedDealer.village || '-'} />
                <DetailRow label="Alamat" value={selectedDealer.address || '-'} />
                <DetailRow label="Latitude" value={String(selectedDealer.lat ?? selectedDealer.latitude ?? '-')} />
                <DetailRow label="Longitude" value={String(selectedDealer.lng ?? selectedDealer.longitude ?? '-')} />
              </div>

              <div className="card" style={{ minHeight: 360 }}>
                <h3>Peta Dealer</h3>
                <div style={{ marginTop: 10 }}>
                  <MapContainer
                    center={[Number(selectedDealer.lat ?? selectedDealer.latitude ?? -8.58), Number(selectedDealer.lng ?? selectedDealer.longitude ?? 116.12)]}
                    zoom={11}
                    style={{ height: 300, borderRadius: 12 }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    <Marker
                      position={[Number(selectedDealer.lat ?? selectedDealer.latitude ?? -8.58), Number(selectedDealer.lng ?? selectedDealer.longitude ?? 116.12)]}
                      icon={markerIcon}
                    >
                      <Popup>{selectedDealer.name}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (isCompanyDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Finance Company</div>
            <div style={{ color: '#64748b' }}>Data company dan ringkasan performa</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canManage && selectedId && (
              <button className="btn" onClick={() => navigate(`/finance/companies/${selectedId}/edit`, { state: { company: selectedCompany } })}>
                Edit Finance Company
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/finance?tab=finance')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedCompany && <div className="alert">Finance company tidak ditemukan.</div>}
          {selectedCompany && (
            <>
              <div className="card" style={{ maxWidth: 860 }}>
                <DetailRow label="Nama" value={selectedCompany.name} />
                <DetailRow label="Telepon" value={selectedCompany.phone || '-'} />
                <DetailRow label="Provinsi" value={selectedCompany.province || '-'} />
                <DetailRow label="Kab/Kota" value={selectedCompany.regency || '-'} />
                <DetailRow label="Kecamatan" value={selectedCompany.district || '-'} />
                <DetailRow label="Kelurahan" value={selectedCompany.village || '-'} />
                <DetailRow label="Alamat" value={selectedCompany.address || '-'} />
                <DetailRow label="Company ID" value={selectedCompany.id || '-'} />
              </div>

              <div className="card">
                <h3>Summary Performa Finance</h3>
                {companySummaryLoading && <div className="muted">Memuat summary performa...</div>}
                {!companySummaryLoading && !companySummary && <div className="muted">Belum ada data performa.</div>}

                {!companySummaryLoading && companySummary && (
                  <>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
                      <Metric label="Total Order" value={companySummary.total_orders} />
                      <Metric label="Approval Rate" value={`${(companySummary.approval_rate * 100).toFixed(1)}%`} />
                      <Metric label="Lead Avg (s)" value={companySummary.lead_time_seconds_avg != null ? companySummary.lead_time_seconds_avg.toFixed(1) : '-'} />
                      <Metric label="Rescue FC2" value={companySummary.rescue_approved_fc2} />
                    </div>

                    <div style={{ marginTop: 10, color: '#64748b', fontSize: 12 }}>
                      Dealer aktif: {companySummary.active_dealers} dari {dealers.length} dealer
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Dealer</th>
                            <th>Total Order</th>
                            <th>Approval Rate</th>
                            <th>Lead Avg (s)</th>
                            <th>Rescue FC2</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companySummary.dealer_rows.map((row) => (
                            <tr key={row.dealer_id}>
                              <td>{row.dealer_name}</td>
                              <td>{row.total_orders}</td>
                              <td>{(row.approval_rate * 100).toFixed(1)}%</td>
                              <td>{row.lead_time_seconds_avg != null ? row.lead_time_seconds_avg.toFixed(1) : '-'}</td>
                              <td>{row.rescue_approved_fc2}</td>
                            </tr>
                          ))}
                          {companySummary.dealer_rows.length === 0 && (
                            <tr>
                              <td colSpan={5}>Belum ada data performa per dealer.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (isDealerCreate || isDealerEdit) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isDealerEdit ? 'Edit Dealer' : 'Input Dealer Baru'}</div>
            <div style={{ color: '#64748b' }}>Form dealer terpisah dari tabel</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/finance?tab=dealer')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 920 }}>
            <form onSubmit={submitDealer} className="grid" style={{ gap: 10 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label>Nama Dealer</label>
                  <input value={dealerForm.name} onChange={(e) => setDealerForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div>
                  <label>No Telepon</label>
                  <input value={dealerForm.phone} onChange={(e) => setDealerForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                </div>

                <div>
                  <label>Provinsi</label>
                  <select value={dealerForm.province} onChange={(e) => void handleDealerProvince(e.target.value)} required>
                    <option value="">Pilih</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>{province.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kab/Kota</label>
                  <select
                    value={dealerForm.regency}
                    onChange={(e) => void handleDealerRegency(e.target.value)}
                    disabled={!dealerForm.province}
                    required
                  >
                    <option value="">Pilih</option>
                    {dealerKabupaten.map((kab) => (
                      <option key={kab.code} value={kab.code}>{kab.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kecamatan</label>
                  <select
                    value={dealerForm.district}
                    onChange={(e) => setDealerForm((prev) => ({ ...prev, district: e.target.value }))}
                    disabled={!dealerForm.regency}
                    required
                  >
                    <option value="">Pilih</option>
                    {dealerKecamatan.map((kec) => (
                      <option key={kec.code} value={kec.code}>{kec.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kelurahan</label>
                  <input value={dealerForm.village} onChange={(e) => setDealerForm((prev) => ({ ...prev, village: e.target.value }))} />
                </div>

                <div>
                  <label>Latitude</label>
                  <input type="number" step="any" value={dealerForm.lat} onChange={(e) => setDealerForm((prev) => ({ ...prev, lat: e.target.value }))} required />
                </div>

                <div>
                  <label>Longitude</label>
                  <input type="number" step="any" value={dealerForm.lng} onChange={(e) => setDealerForm((prev) => ({ ...prev, lng: e.target.value }))} required />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Alamat</label>
                  <input value={dealerForm.address} onChange={(e) => setDealerForm((prev) => ({ ...prev, address: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn-ghost" type="button" onClick={() => navigate('/finance?tab=dealer')}>Batal</button>
                <button className="btn" type="submit" disabled={savingDealer}>
                  {savingDealer ? 'Menyimpan...' : isDealerEdit ? 'Update Dealer' : 'Tambah Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (isCompanyCreate || isCompanyEdit) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isCompanyEdit ? 'Edit Finance Company' : 'Input Finance Company Baru'}</div>
            <div style={{ color: '#64748b' }}>Form finance company terpisah dari tabel</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/finance?tab=finance')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          <div className="card" style={{ maxWidth: 920 }}>
            <form onSubmit={submitFinance} className="grid" style={{ gap: 10 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label>Nama Finance Company</label>
                  <input value={financeForm.name} onChange={(e) => setFinanceForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div>
                  <label>No Telepon</label>
                  <input value={financeForm.phone} onChange={(e) => setFinanceForm((prev) => ({ ...prev, phone: e.target.value }))} required />
                </div>

                <div>
                  <label>Provinsi</label>
                  <select value={financeForm.province} onChange={(e) => void handleFinanceProvince(e.target.value)} required>
                    <option value="">Pilih</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>{province.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kab/Kota</label>
                  <select
                    value={financeForm.regency}
                    onChange={(e) => void handleFinanceRegency(e.target.value)}
                    disabled={!financeForm.province}
                    required
                  >
                    <option value="">Pilih</option>
                    {financeKabupaten.map((kab) => (
                      <option key={kab.code} value={kab.code}>{kab.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kecamatan</label>
                  <select
                    value={financeForm.district}
                    onChange={(e) => setFinanceForm((prev) => ({ ...prev, district: e.target.value }))}
                    disabled={!financeForm.regency}
                    required
                  >
                    <option value="">Pilih</option>
                    {financeKecamatan.map((kec) => (
                      <option key={kec.code} value={kec.code}>{kec.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Kelurahan</label>
                  <input value={financeForm.village} onChange={(e) => setFinanceForm((prev) => ({ ...prev, village: e.target.value }))} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Alamat</label>
                  <input value={financeForm.address} onChange={(e) => setFinanceForm((prev) => ({ ...prev, address: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn-ghost" type="button" onClick={() => navigate('/finance?tab=finance')}>Batal</button>
                <button className="btn" type="submit" disabled={savingFinance}>
                  {savingFinance ? 'Menyimpan...' : isCompanyEdit ? 'Update Finance' : 'Tambah Finance'}
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Peta & Finance</div>
          <div style={{ color: '#64748b' }}>Gunakan tab untuk kelola Dealer dan Finance Company</div>
        </div>
      </div>

      <div className="page" style={{ display: 'grid', gap: 14 }}>
        <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={listTab === 'dealer' ? 'btn' : 'btn-ghost'} onClick={() => setTab('dealer')}>Dealer</button>
          <button className={listTab === 'finance' ? 'btn' : 'btn-ghost'} onClick={() => setTab('finance')}>Finance</button>
        </div>

        {listTab === 'dealer' && (
          <>
            <div className="card">
              <div style={{ marginBottom: 10 }}>
                <label>Search Dealer</label>
                <input value={dealerSearch} onChange={(e) => setDealerSearch(e.target.value)} placeholder="Cari nama/regency/phone" />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label>Filter Provinsi Dealer</label>
                <select value={dealerProvinceFilter} onChange={(e) => setDealerProvinceFilter(e.target.value)}>
                  <option value="">Semua</option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3>Dealer</h3>
                {canManage && <button className="btn" onClick={() => navigate('/finance/dealers/create')}>Input Dealer</button>}
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Regency</th>
                    <th>Phone</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dealers.map((dealer) => (
                    <tr key={dealer.id}>
                      <td>{dealer.name}</td>
                      <td>{dealer.regency || '-'}</td>
                      <td>{dealer.phone || '-'}</td>
                      <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn-ghost" onClick={() => setSelectedDealerId(dealer.id)}>Preview</button>
                        <button className="btn-ghost" onClick={() => navigate(`/finance/dealers/${dealer.id}`, { state: { dealer } })}>View</button>
                        {canManage && (
                          <button className="btn-ghost" onClick={() => navigate(`/finance/dealers/${dealer.id}/edit`, { state: { dealer } })}>Edit</button>
                        )}
                        {canManage && <button className="btn-ghost" onClick={() => void removeDealer(dealer.id)}>Delete</button>}
                      </td>
                    </tr>
                  ))}
                  {dealers.length === 0 && (
                    <tr>
                      <td colSpan={4}>Belum ada dealer.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Pagination
                page={dealerPage}
                totalPages={dealerTotalPages}
                totalData={dealerTotalData}
                limit={dealerLimit}
                onPageChange={setDealerPage}
                onLimitChange={(next) => {
                  setDealerLimit(next)
                  setDealerPage(1)
                }}
              />
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 14 }}>
              <div className="card" style={{ minHeight: 430 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Peta Dealer</h3>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{dealerPoints.length} titik dealer</div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <MapContainer center={center as any} zoom={8} style={{ height: 360, borderRadius: 12 }} scrollWheelZoom={false}>
                    <MapFly center={center as any} />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    {dealerPoints.map((dealer) => (
                      <Marker
                        key={dealer.id}
                        position={[dealer._lat, dealer._lng]}
                        icon={markerIcon}
                        eventHandlers={{ click: () => setSelectedDealerId(dealer.id) }}
                      >
                        <Popup>
                          <strong>{dealer.name}</strong>
                          <div>{dealer.regency}</div>
                          <div>{dealer.phone || '-'}</div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Performa Dealer</h3>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{currentDealer?.name || 'Pilih dealer'}</div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label>Filter Finance Company</label>
                  <select value={fcFilter} onChange={(e) => setFcFilter(e.target.value)}>
                    <option value="">Semua</option>
                    {financeCompanies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>

                {!metrics && <div style={{ marginTop: 12, color: '#64748b' }}>Pilih dealer untuk melihat metrik.</div>}

                {metrics && (
                  <>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
                      <Metric label="Total Order" value={metrics.total_orders} />
                      <Metric label="Approval Rate" value={`${((metrics.approval_rate || 0) * 100).toFixed(1)}%`} />
                      <Metric label="Lead Time Avg (s)" value={metrics.lead_time_seconds_avg ? metrics.lead_time_seconds_avg.toFixed(1) : '-'} />
                      <Metric label="Rescue FC2" value={metrics.rescue_approved_fc2} />
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <h4 style={{ margin: '0 0 6px 0' }}>Per Finance Company</h4>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Finance</th>
                            <th>Total</th>
                            <th>Approve</th>
                            <th>Lead Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(metrics.finance_companies || []).map((fc: any) => (
                            <tr key={fc.finance_company_id}>
                              <td>{fc.finance_company_name}</td>
                              <td>{fc.total_orders}</td>
                              <td>{((fc.approval_rate || 0) * 100).toFixed(1)}%</td>
                              <td>{fc.lead_time_seconds_avg ? fc.lead_time_seconds_avg.toFixed(1) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {listTab === 'finance' && (
          <div className="card">
            <div style={{ marginBottom: 10 }}>
              <label>Search Finance Company</label>
              <input value={financeSearch} onChange={(e) => setFinanceSearch(e.target.value)} placeholder="Cari nama/regency/phone" />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label>Filter Provinsi Finance</label>
              <select value={financeProvinceFilter} onChange={(e) => setFinanceProvinceFilter(e.target.value)}>
                <option value="">Semua</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>{province.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3>Finance Company</h3>
              {canManage && <button className="btn" onClick={() => navigate('/finance/companies/create')}>Input Finance</button>}
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Regency</th>
                  <th>Phone</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {financeCompanies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.regency || '-'}</td>
                    <td>{company.phone || '-'}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-ghost" onClick={() => navigate(`/finance/companies/${company.id}`, { state: { company } })}>View</button>
                      {canManage && (
                        <button className="btn-ghost" onClick={() => navigate(`/finance/companies/${company.id}/edit`, { state: { company } })}>Edit</button>
                      )}
                      {canManage && <button className="btn-ghost" onClick={() => void removeFinance(company.id)}>Delete</button>}
                    </td>
                  </tr>
                ))}
                {financeCompanies.length === 0 && (
                  <tr>
                    <td colSpan={4}>Belum ada finance company.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <Pagination
              page={financePage}
              totalPages={financeTotalPages}
              totalData={financeTotalData}
              limit={financeLimit}
              onPageChange={setFinancePage}
              onLimitChange={(next) => {
                setFinanceLimit(next)
                setFinancePage(1)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function MapFly({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center?.length === 2) map.flyTo(center, map.getZoom(), { duration: 0.5 })
  }, [center, map])
  return null
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #dbe3ef' }}>
      <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 19 }}>{value}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, padding: '6px 0' }}>
      <div style={{ color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value || '-'}</div>
    </div>
  )
}
