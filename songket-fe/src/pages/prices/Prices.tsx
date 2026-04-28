import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { addCommodityPrice, commitScrapeResults, createScrapeJob, deletePrice, fetchPriceList, fetchScrapeResults, listScrapeJobs } from '../../services/commodityService'
import { useAlert, useConfirm } from '../../components/common/ConfirmDialog'
import { usePermissions } from '../../hooks/usePermissions'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../../utils/currency'
import { focusFirstInvalidField } from '../../utils/formFocus'
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
  const showAlert = useAlert()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isDetail = mode === 'detail'

  const { hasAnyPermission, hasPermission } = usePermissions()
  const canList = hasPermission('commodities', 'list')
  const canScrape = hasPermission('commodities', 'scrape')
  const canImport = hasAnyPermission([
    { resource: 'commodities', action: 'create' },
    { resource: 'commodities', action: 'scrape' },
  ])
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
  const [isPageVisible, setIsPageVisible] = useState(() => {
    if (typeof document === 'undefined') return true
    return document.visibilityState === 'visible'
  })

  const statePrice = (location.state as any)?.price || null

  const selectedPrice = useMemo(() => {
    if (!selectedId) return null
    return prices.find((price) => price.id === selectedId) || (statePrice?.id === selectedId ? statePrice : null)
  }, [prices, selectedId, statePrice])

  const hasActiveJobs = useMemo(
    () => jobs.some((job) => ['pending', 'running', 'queued'].includes(String(job.status || '').toLowerCase())),
    [jobs],
  )

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
    if (typeof document === 'undefined') return
    const onVisibilityChange = () => setIsPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    if (!canScrape) return
    loadJobs()
  }, [canScrape, jobsLimit, jobsPage, jobSearch])

  useEffect(() => {
    if (!canScrape || !isPageVisible || !hasActiveJobs) return
    const timer = setInterval(loadJobs, 5000)
    return () => clearInterval(timer)
  }, [canScrape, hasActiveJobs, isPageVisible, jobsLimit, jobsPage, jobSearch])

  useEffect(() => {
    if (!selectedJob) return
    loadResults(selectedJob)
  }, [resultLimit, resultPage, resultSearch, selectedJob])

  useEffect(() => {
    if (!selectedJob || !isPageVisible) return
    const activeSelectedJob = jobs.find((job) => job.id === selectedJob)
    const status = String(activeSelectedJob?.status || '').toLowerCase()
    if (!['pending', 'running', 'queued'].includes(status)) return

    const timer = setInterval(() => {
      loadResults(selectedJob)
    }, 5000)
    return () => clearInterval(timer)
  }, [isPageVisible, jobs, selectedJob, resultLimit, resultPage, resultSearch])

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
    const commodityName = manual.name.trim()
    const unit = manual.unit.trim()
    const sourceUrl = manual.source_url.trim()
    const numeric = parseRupiahInput(manual.price)

    if (!commodityName) {
      focusFirstInvalidField('name')
      await showAlert('Commodity name is required.')
      return
    }
    if (!unit) {
      focusFirstInvalidField('unit')
      await showAlert('Unit is required.')
      return
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      focusFirstInvalidField('price')
      await showAlert('Price must be a number greater than 0.')
      return
    }
    if (sourceUrl) {
      try {
        new URL(sourceUrl)
      } catch {
        focusFirstInvalidField('source_url')
        await showAlert('Source URL must be a valid URL.')
        return
      }
    }

    try {
      await addCommodityPrice({
        commodity_name: commodityName,
        unit,
        price: numeric,
        source_url: sourceUrl,
      })
      setManual({ name: '', unit: '', price: '', source_url: '' })
      loadPrices()
      navigate('/prices')
    } catch (err: any) {
      await showAlert(err?.response?.data?.error || 'Failed to save price.')
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
      await showAlert(err?.response?.data?.error || 'Failed to create scrape job.')
    } finally {
      setStartingJob(false)
    }
  }

  const toggleResult = (id: string) => {
    setSelectedResultIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]))
  }

  const importSelected = async () => {
    if (!selectedJob || selectedResultIds.length === 0) {
      await showAlert('Select at least one result to import.')
      return
    }
    try {
      await commitScrapeResults(selectedJob, selectedResultIds)
      await showAlert('Data imported successfully.', { title: 'Success', confirmText: 'OK' })
      loadPrices()
    } catch (err: any) {
      await showAlert(err?.response?.data?.error || 'Failed to import data.')
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
      await showAlert(err?.response?.data?.error || 'Failed to delete price.')
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
    <div className="price-shell">
      {canScrape && (
        <div className="page price-dock-page">
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
        <div className="page price-results-page">
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
