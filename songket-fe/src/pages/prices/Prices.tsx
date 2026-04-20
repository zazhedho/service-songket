import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { addCommodityPrice, commitScrapeResults, createScrapeJob, deletePrice, fetchPriceList, fetchScrapeResults, listScrapeJobs } from '../../services/commodityService'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuth } from '../../store'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../../utils/currency'
import PriceDetail from './components/PriceDetail'
import PriceForm from './components/PriceForm'
import PriceJobDock from './components/PriceJobDock'
import PriceList from './components/PriceList'
import PriceScrapeModal from './components/PriceScrapeModal'
import PriceScrapeResults from './components/PriceScrapeResults'

type Job = {
  id: string
  status: string
  message: string
  created_at: string
}

type ScrapeResult = {
  id: string
  commodity_name: string
  price: number
  unit: string
  source_url: string
  scraped_at: string
}

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (/\/prices\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function PricesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isDetail = mode === 'detail'

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_prices')
  const canScrape = perms.includes('scrape_prices')
  const canImport = perms.includes('add_price') || canScrape
  const confirm = useConfirm()

  const [prices, setPrices] = useState<any[]>([])
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [pricePage, setPricePage] = useState(1)
  const [priceLimit, setPriceLimit] = useState(20)
  const [priceTotalPages, setPriceTotalPages] = useState(1)
  const [priceTotalData, setPriceTotalData] = useState(0)

  const [showModal, setShowModal] = useState(false)
  const [urls, setUrls] = useState<string[]>([''])
  const [startingJob, setStartingJob] = useState(false)

  const [manual, setManual] = useState<{ name: string; unit: string; price: string; source_url: string }>({
    name: '',
    unit: '',
    price: '',
    source_url: '',
  })

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsOpen, setJobsOpen] = useState(false)
  const [jobsPage, setJobsPage] = useState(1)
  const [jobsLimit, setJobsLimit] = useState(20)
  const [jobsTotalPages, setJobsTotalPages] = useState(1)
  const [jobsTotalData, setJobsTotalData] = useState(0)
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [results, setResults] = useState<ScrapeResult[]>([])
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [resultPage, setResultPage] = useState(1)
  const [resultLimit, setResultLimit] = useState(20)
  const [resultTotalPages, setResultTotalPages] = useState(1)
  const [resultTotalData, setResultTotalData] = useState(0)
  const [priceSearch, setPriceSearch] = useState('')
  const [jobSearch, setJobSearch] = useState('')
  const [resultSearch, setResultSearch] = useState('')

  const statePrice = (location.state as any)?.price || null

  const selectedPrice = useMemo(() => {
    if (!selectedId) return null
    return prices.find((price) => price.id === selectedId) || (statePrice?.id === selectedId ? statePrice : null)
  }, [prices, selectedId, statePrice])

  const loadPrices = () => {
    if (!canList) return
    setLoadingPrices(true)
    fetchPriceList({ page: pricePage, limit: priceLimit, search: priceSearch || undefined })
      .then((res) => {
        setPrices(res.data.data || res.data || [])
        setPriceTotalPages(res.data.total_pages || 1)
        setPriceTotalData(res.data.total_data || 0)
        setPricePage(res.data.current_page || pricePage)
      })
      .finally(() => setLoadingPrices(false))
  }

  const loadJobs = () => {
    if (!canScrape) return
    listScrapeJobs({ page: jobsPage, limit: jobsLimit, search: jobSearch || undefined })
      .then((res) => {
        setJobs(res.data.data || res.data || [])
        setJobsTotalPages(res.data.total_pages || 1)
        setJobsTotalData(res.data.total_data || 0)
        setJobsPage(res.data.current_page || jobsPage)
      })
      .catch(() => {})
  }

  const loadResults = (jobId: string) => {
    setSelectedJob(jobId)
    setLoadingResults(true)
    fetchScrapeResults(jobId, { page: resultPage, limit: resultLimit, search: resultSearch || undefined })
      .then((res) => {
        const data: ScrapeResult[] = res.data.data || res.data || []
        setResults(data)
        setSelectedResultIds(data.map((item) => item.id))
        setResultTotalPages(res.data.total_pages || 1)
        setResultTotalData(res.data.total_data || 0)
        setResultPage(res.data.current_page || resultPage)
      })
      .finally(() => setLoadingResults(false))
  }

  useEffect(() => {
    loadPrices()
  }, [canList, isList, priceLimit, pricePage, priceSearch])

  useEffect(() => {
    if (!canScrape) return
    loadJobs()
    const timer = setInterval(loadJobs, 3000)
    return () => clearInterval(timer)
  }, [canScrape, jobsLimit, jobsPage, jobSearch])

  useEffect(() => {
    if (!selectedJob) return
    loadResults(selectedJob)
  }, [resultLimit, resultPage, resultSearch, selectedJob])

  useEffect(() => {
    setPricePage(1)
  }, [priceSearch])

  useEffect(() => {
    setJobsPage(1)
  }, [jobSearch])

  useEffect(() => {
    setResultPage(1)
  }, [resultSearch])

  const submitManual = async () => {
    if (!canImport) return
    if (!manual.name) {
      window.alert('Nama komoditas wajib diisi')
      return
    }

    try {
      const numeric = parseRupiahInput(manual.price)
      await addCommodityPrice({
        commodity_name: manual.name,
        unit: manual.unit,
        price: numeric,
        source_url: manual.source_url,
      })
      setManual({ name: '', unit: '', price: '', source_url: '' })
      loadPrices()
      navigate('/prices')
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menyimpan harga')
    }
  }

  const startJob = async () => {
    const payload = urls.map((url) => url.trim()).filter(Boolean)
    setStartingJob(true)
    try {
      await createScrapeJob(payload.length ? { urls: payload } : {})
      setShowModal(false)
      setUrls([''])
      loadJobs()
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal membuat job')
    } finally {
      setStartingJob(false)
    }
  }

  const toggleResult = (id: string) => {
    setSelectedResultIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]))
  }

  const importSelected = async () => {
    if (!selectedJob || selectedResultIds.length === 0) {
      window.alert('Pilih minimal satu hasil untuk diimport')
      return
    }
    try {
      await commitScrapeResults(selectedJob, selectedResultIds)
      window.alert('Data berhasil dimasukkan')
      loadPrices()
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal mengimport')
    }
  }

  const removePrice = async (id: string) => {
    if (!canScrape) return
    const ok = await confirm({
      title: 'Delete Price',
      description: 'Are you sure you want to delete this price?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await deletePrice(id)
      loadPrices()
    } catch (err: any) {
      window.alert(err?.response?.data?.error || 'Gagal menghapus')
    }
  }

  const statusColor = useMemo(
    () =>
      ({
        pending: '#ca8a04',
        running: '#2563eb',
        success: '#16a34a',
        error: '#dc2626',
      } as Record<string, string>),
    [],
  )

  if (isDetail) return <PriceDetail formatRupiah={formatRupiah} navigate={navigate} selectedPrice={selectedPrice} />

  if (isCreate) {
    return (
      <PriceForm
        canImport={canImport}
        manual={manual}
        navigate={navigate}
        setManual={setManual}
        submitManual={submitManual}
        formatRupiahInput={formatRupiahInput}
      />
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Harga Pangan</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canScrape && (
            <button className="btn" onClick={() => setShowModal(true)}>
              Jalankan Scrape
            </button>
          )}
          {canImport && (
            <button className="btn-ghost" onClick={() => navigate('/prices/create')}>
              Input Manual
            </button>
          )}
        </div>
      </div>

      {canScrape && (
        <div className="page" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <PriceJobDock
            jobs={jobs}
            jobsLimit={jobsLimit}
            jobsOpen={jobsOpen}
            jobsPage={jobsPage}
            jobsSearch={jobSearch}
            jobsTotalData={jobsTotalData}
            jobsTotalPages={jobsTotalPages}
            onSearchChange={setJobSearch}
            onSelect={(id) => {
              setResultPage(1)
              loadResults(id)
            }}
            onToggle={() => setJobsOpen((value) => !value)}
            setJobsLimit={setJobsLimit}
            setJobsPage={setJobsPage}
            statusColor={statusColor}
          />
        </div>
      )}

      <PriceList
        canImport={canImport}
        canList={canList}
        canScrape={canScrape}
        formatRupiah={formatRupiah}
        loadingPrices={loadingPrices}
        navigate={navigate}
        onRemovePrice={removePrice}
        priceLimit={priceLimit}
        pricePage={pricePage}
        priceSearch={priceSearch}
        priceTotalData={priceTotalData}
        priceTotalPages={priceTotalPages}
        prices={prices}
        setPriceLimit={setPriceLimit}
        setPricePage={setPricePage}
        setPriceSearch={setPriceSearch}
        setShowModal={setShowModal}
      />

      {canList && selectedJob && (
        <div className="page">
          <PriceScrapeResults
            canImport={canImport}
            formatRupiah={formatRupiah}
            importSelected={importSelected}
            loadingResults={loadingResults}
            resultLimit={resultLimit}
            resultPage={resultPage}
            resultSearch={resultSearch}
            resultTotalData={resultTotalData}
            resultTotalPages={resultTotalPages}
            results={results}
            selectedJob={selectedJob}
            selectedResultIds={selectedResultIds}
            setResultLimit={setResultLimit}
            setResultPage={setResultPage}
            setResultSearch={setResultSearch}
            toggleResult={toggleResult}
          />
        </div>
      )}

      {canScrape && (
        <PriceScrapeModal
          setShowModal={setShowModal}
          setUrls={setUrls}
          showModal={showModal}
          startJob={startJob}
          startingJob={startingJob}
          urls={urls}
        />
      )}
    </div>
  )
}
