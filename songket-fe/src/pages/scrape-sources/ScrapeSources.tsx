import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createScrapeSource,
  deleteScrapeSource,
  listScrapeSources,
  updateScrapeSource,
} from '../../services/scrapeSourceService'
import {
  fetchPriceList,
  scrapePrices,
} from '../../services/commodityService'
import { useAlert, useConfirm } from '../../components/common/ConfirmDialog'
import { usePermissions } from '../../hooks/usePermissions'
import { formatRupiah } from '../../utils/currency'
import ScrapeSourceDetail from './components/ScrapeSourceDetail'
import ScrapeSourceForm from './components/ScrapeSourceForm'
import ScrapeSourceList from './components/ScrapeSourceList'
import ScrapeSourcePanels from './components/ScrapeSourcePanels'

const empty = { name: '', url: '', category: '', type: 'prices', is_active: true }

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/scrape-sources\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function ScrapeSourcesPage() {
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

  const [sources, setSources] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [form, setForm] = useState(empty)
  const [customUrls, setCustomUrls] = useState('')
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const { hasPermission } = usePermissions()
  const canList = hasPermission('scrape_sources', 'list')
  const canCreate = hasPermission('scrape_sources', 'create')
  const canUpdate = hasPermission('scrape_sources', 'update')
  const canDelete = hasPermission('scrape_sources', 'delete')
  const canScrape = hasPermission('commodities', 'scrape')
  const confirm = useConfirm()

  const stateSource = (location.state as any)?.source || null

  const load = async () => {
    const res = await listScrapeSources({ page, limit, search: search || undefined, filters: { type: typeFilter || undefined } })
    setSources(res.data.data || res.data || [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || page)
  }

  const loadPrices = async () => {
    const res = await fetchPriceList({ limit: 10 })
    setPrices(res.data.data || res.data || [])
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setSources([]))
    }
    if (canScrape) {
      loadPrices().catch(() => setPrices([]))
    }
  }, [canList, canScrape, isDetail, isEdit, isList, limit, page, search, typeFilter])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [typeFilter])

  const selectedSource = useMemo(() => {
    if (!selectedId) return null
    return sources.find((source) => source.id === selectedId) || (stateSource?.id === selectedId ? stateSource : null)
  }, [selectedId, sources, stateSource])

  useEffect(() => {
    if (isCreate) {
      setForm(empty)
      return
    }

    if (isEdit && selectedSource) {
      setForm({
        name: selectedSource.name || '',
        url: selectedSource.url || '',
        category: selectedSource.category || '',
        type: selectedSource.type || 'prices',
        is_active: Boolean(selectedSource.is_active),
      })
    }
  }, [isCreate, isEdit, selectedSource])

  const save = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setMessage(null)
    try {
      if (isEdit && selectedId) await updateScrapeSource(selectedId, form)
      else await createScrapeSource(form)
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(empty)
      navigate('/scrape-sources')
    } catch (err: any) {
      const text = err?.response?.data?.error || 'Gagal menyimpan sumber'
      setMessage({ text, ok: false })
      await showAlert(text)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    const ok = await confirm({
      title: 'Delete Scrape Source',
      description: 'Are you sure you want to delete this scrape source URL?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return
    await deleteScrapeSource(id)
    await load()
  }

  const runScrape = async () => {
    if (!canScrape) return

    setLoading(true)
    setMessage(null)

    const urls = customUrls
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)

    try {
      await scrapePrices(urls.length ? { urls } : {})
      setMessage({ text: 'Scrape berhasil dijalankan', ok: true })
      await loadPrices()
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.error || 'Scrape gagal', ok: false })
    } finally {
      setLoading(false)
    }
  }

  const set = (key: keyof typeof empty, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  if (isDetail) {
    return (
      <ScrapeSourceDetail
        canUpdate={canUpdate}
        navigate={navigate}
        selectedId={selectedId}
        selectedSource={selectedSource}
      />
    )
  }

  if (isCreate || isEdit) {
    return (
      <ScrapeSourceForm
        canCreate={canCreate}
        canUpdate={canUpdate}
        form={form}
        isCreate={isCreate}
        isEdit={isEdit}
        loading={loading}
        message={message}
        navigate={navigate}
        save={save}
        set={set}
      />
    )
  }

  return (
    <div>
      <ScrapeSourceList
        canCreate={canCreate}
        canDelete={canDelete}
        canList={canList}
        canUpdate={canUpdate}
        limit={limit}
        navigate={navigate}
        page={page}
        remove={remove}
        search={search}
        setLimit={setLimit}
        setPage={setPage}
        setSearch={setSearch}
        setTypeFilter={setTypeFilter}
        sources={sources}
        totalData={totalData}
        totalPages={totalPages}
        typeFilter={typeFilter}
      />

      <div className="page">
        <ScrapeSourcePanels
          canScrape={canScrape}
          customUrls={customUrls}
          formatRupiah={formatRupiah}
          loading={loading}
          message={message}
          prices={prices}
          runScrape={runScrape}
          setCustomUrls={setCustomUrls}
        />
      </div>
    </div>
  )
}
