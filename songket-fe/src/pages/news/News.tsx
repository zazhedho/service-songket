import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { deleteNewsItem, importNews, listNewsItems, scrapeNews } from '../../services/newsService'
import { listScrapeSources } from '../../services/scrapeSourceService'
import { usePermissions } from '../../hooks/usePermissions'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useToast } from '../../components/common/ToastProvider'
import { resolveErrorMessage } from '../../utils/errorMessage'
import NewsDetail from './components/NewsDetail'
import { normalizeNewsUrl, type ScrapedNews, toDetailRow } from './components/newsHelpers'
import NewsList from './components/NewsList'
import NewsScrape from './components/NewsScrape'

function parseMode(pathname: string) {
  if (pathname.endsWith('/scrape')) return 'scrape'
  if (/\/news\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function NewsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isScrape = mode === 'scrape'
  const isDetail = mode === 'detail'

  const [category, setCategory] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const [scrapedRows, setScrapedRows] = useState<ScrapedNews[]>([])
  const [scrapedPage, setScrapedPage] = useState(1)
  const [scrapedLimit, setScrapedLimit] = useState(20)
  const [scraping, setScraping] = useState(false)
  const [adding, setAdding] = useState<Record<string, boolean>>({})
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [urls, setUrls] = useState<string[]>([''])
  const [sourceOptions, setSourceOptions] = useState<{ url: string; name: string }[]>([])

  const { hasPermission } = usePermissions()
  const confirm = useConfirm()
  const showToast = useToast()
  const canView = hasPermission('news', 'list')
  const canScrape = hasPermission('news', 'scrape')
  const canDelete = hasPermission('news', 'delete')

  const stateDetail = (location.state as any)?.detail || null

  const load = () =>
    listNewsItems({ category: category || undefined, page, limit }).then((res) => {
      setItems(res.data.data || res.data || [])
      setTotalPages(res.data.total_pages || 1)
      setTotalData(res.data.total_data || 0)
      setPage(res.data.current_page || page)
    })

  useEffect(() => {
    if (canView) {
      load().catch(() => setItems([]))
    }
  }, [category, canView, limit, page])

  useEffect(() => {
    if (!canScrape) return
    listScrapeSources({ page: 1, limit: 500, filters: { type: 'news', category: category || undefined } })
      .then((res) => {
        const data = res.data.data || res.data || []
        const mapped = Array.isArray(data)
          ? data
              .map((item: any) => ({ url: String(item.url || '').trim(), name: String(item.name || '').trim() }))
              .filter((item) => item.url)
          : []
        setSourceOptions(mapped)
      })
      .catch(() => setSourceOptions([]))
  }, [canScrape, category])

  useEffect(() => {
    setPage(1)
  }, [category])

  const doScrape = async (customUrls?: string[]) => {
    if (!canScrape) return
    setScraping(true)
    try {
      const clean = (customUrls || []).map((url) => url.trim()).filter(Boolean)
      const res = await scrapeNews(clean.length ? { urls: clean } : undefined)
      const data: ScrapedNews[] = res.data.data || res.data || []
      setScrapedRows(data)
      setAdded({})
    } finally {
      setScraping(false)
      setUrls([''])
    }
  }

  const addToNews = async (row: ScrapedNews) => {
    if (!canScrape || !row?.url) return
    const normalizedRowURL = normalizeNewsUrl(row.url)
    if (normalizedRowURL && existingNewsUrls.has(normalizedRowURL)) {
      showToast('news already added', { tone: 'warning' })
      setAdded((prev) => ({ ...prev, [row.url]: true }))
      return
    }
    if (row.from_db) {
      showToast('news already added', { tone: 'warning' })
      setAdded((prev) => ({ ...prev, [row.url]: true }))
      return
    }
    setAdding((prev) => ({ ...prev, [row.url]: true }))
    try {
      await importNews({ items: [row] })
      setAdded((prev) => ({ ...prev, [row.url]: true }))
      showToast('News item added successfully.', { tone: 'success' })
      await load()
    } catch (err: any) {
      const message = resolveErrorMessage(err, 'Failed to add news item.')
      const lower = message.toLowerCase()
      if (lower.includes('duplicate') || lower.includes('already exists') || lower.includes('already exist') || lower.includes('unique')) {
        showToast('news already added', { tone: 'warning' })
        setAdded((prev) => ({ ...prev, [row.url]: true }))
      } else {
        showToast(message, { tone: 'error' })
      }
    } finally {
      setAdding((prev) => ({ ...prev, [row.url]: false }))
    }
  }

  const startScrape = () => {
    const clean = urls.map((url) => url.trim()).filter(Boolean)
    doScrape(clean.length ? clean : undefined)
  }

  const removeNews = async () => {
    if (!canDelete) return
    const id = pendingDeleteIdRef.current
    if (!id) return
    setDeleting((prev) => ({ ...prev, [id]: true }))
    try {
      await deleteNewsItem(id)
      showToast('News item deleted successfully.', { tone: 'success' })
      await load()
    } catch (err: any) {
      showToast(resolveErrorMessage(err, 'Failed to delete news item.'), { tone: 'error' })
    } finally {
      setDeleting((prev) => ({ ...prev, [id]: false }))
    }
  }

  const pendingDeleteIdRef = useRef<string | null>(null)

  const requestDeleteNews = async (id: string) => {
    if (!canDelete) return
    pendingDeleteIdRef.current = id
    const ok = await confirm({
      title: 'Delete Confirmation',
      description: 'Delete this news item?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) {
      pendingDeleteIdRef.current = null
      return
    }
    await removeNews()
    pendingDeleteIdRef.current = null
  }

  const pagedScrapedRows = useMemo(() => {
    const from = (scrapedPage - 1) * scrapedLimit
    const to = from + scrapedLimit
    return scrapedRows.slice(from, to)
  }, [scrapedLimit, scrapedPage, scrapedRows])

  const scrapedTotalPages = useMemo(() => {
    if (!scrapedRows.length) return 1
    return Math.ceil(scrapedRows.length / scrapedLimit)
  }, [scrapedLimit, scrapedRows.length])

  useEffect(() => {
    if (scrapedPage > scrapedTotalPages) {
      setScrapedPage(1)
    }
  }, [scrapedPage, scrapedTotalPages])

  const selectedDetail = useMemo(() => {
    if (stateDetail) return stateDetail as ScrapedNews
    if (!selectedId) return null

    const fromDb = items.find((item) => String(item.id) === selectedId)
    if (fromDb) return toDetailRow(fromDb)

    return null
  }, [items, selectedId, stateDetail])

  const detailImages = useMemo(() => {
    if (!selectedDetail) return []
    const raw = [selectedDetail.images?.foto_utama, ...(selectedDetail.images?.dalam_berita || [])].filter(Boolean) as string[]
    return Array.from(new Set(raw))
  }, [selectedDetail])

  const existingNewsUrls = useMemo(() => {
    const mapped = (items || []).map((item) => normalizeNewsUrl(String(item?.url || '')))
    return new Set(mapped.filter(Boolean))
  }, [items])

  if (isDetail) {
    return (
      <div>
        <NewsDetail
          added={added}
          adding={adding}
          canScrape={canScrape}
          detailImages={detailImages}
          navigate={navigate}
          onAddToNews={addToNews}
          selectedDetail={selectedDetail}
        />
      </div>
    )
  }

  if (isScrape) {
    return (
      <div>
        <NewsScrape
          added={added}
          adding={adding}
          canScrape={canScrape}
          navigate={navigate}
          onAddToNews={addToNews}
          onStartScrape={startScrape}
          pagedScrapedRows={pagedScrapedRows}
          scrapedLimit={scrapedLimit}
          scrapedPage={scrapedPage}
          scrapedRows={scrapedRows}
          scrapedTotalPages={scrapedTotalPages}
          scraping={scraping}
          setScrapedLimit={setScrapedLimit}
          setScrapedPage={setScrapedPage}
          setUrls={setUrls}
          sourceOptions={sourceOptions}
          urls={urls}
        />
      </div>
    )
  }

  return (
    <div>
      <NewsList
        canDelete={canDelete}
        canScrape={canScrape}
        canView={canView}
        category={category}
        deleting={deleting}
        items={items}
        limit={limit}
        navigate={navigate}
        page={page}
        setCategory={setCategory}
        setConfirmDeleteId={requestDeleteNews}
        setLimit={setLimit}
        setPage={setPage}
        totalData={totalData}
        totalPages={totalPages}
      />
    </div>
  )
}
