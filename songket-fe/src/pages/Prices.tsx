import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  addCommodityPrice,
  commitScrapeResults,
  createScrapeJob,
  deletePrice,
  fetchPriceList,
  fetchScrapeResults,
  listScrapeJobs,
} from '../api'
import ActionMenu from '../components/ActionMenu'
import { useConfirm } from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../utils/currency'

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

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Commodity Price Details</div>
            <div style={{ color: '#64748b' }}>Complete commodity price information</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/prices')}>Back</button>
        </div>

        <div className="page">
          {!selectedPrice && <div className="alert">Price data not found.</div>}
          {selectedPrice && (
            <div className="card" style={{ maxWidth: 820 }}>
              <h3 style={{ marginTop: 0 }}>Price Information</h3>
              <table className="table" style={{ marginTop: 10 }}>
                <tbody>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Commodity</th>
                    <td style={{ fontWeight: 600 }}>{selectedPrice.commodity?.name || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Price</th>
                    <td style={{ fontWeight: 600 }}>{formatRupiah(selectedPrice.price)}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Unit</th>
                    <td style={{ fontWeight: 600 }}>{selectedPrice.commodity?.unit || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Source URL</th>
                    <td style={{ fontWeight: 600 }}>{selectedPrice.source_url || '-'}</td>
                  </tr>
                  <tr>
                    <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Collected At</th>
                    <td style={{ fontWeight: 600 }}>{selectedPrice.collected_at ? new Date(selectedPrice.collected_at).toLocaleString('en-US') : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isCreate) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Input Manual Harga Pangan</div>
            <div style={{ color: '#64748b' }}>Halaman form terpisah dari tabel harga</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/prices')}>Kembali ke Tabel</button>
        </div>

        <div className="page">
          {!canImport && <div className="alert">Tidak ada izin input harga manual.</div>}

          <div className="card" style={{ maxWidth: 820 }}>
            <div className="grid" style={{ gap: 10 }}>
              <div>
                <label>Nama komoditas</label>
                <input value={manual.name} onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))} placeholder="Contoh: Beras Medium" />
              </div>
              <div>
                <label>Satuan</label>
                <input value={manual.unit} onChange={(e) => setManual((m) => ({ ...m, unit: e.target.value }))} placeholder="kg/liter/ikat" />
              </div>
              <div>
                <label>Harga (Rp)</label>
                <input
                  value={manual.price}
                  onChange={(e) => setManual((m) => ({ ...m, price: formatRupiahInput(e.target.value) }))}
                  placeholder="Rp 10.000"
                />
              </div>
              <div>
                <label>Sumber URL</label>
                <input value={manual.source_url} onChange={(e) => setManual((m) => ({ ...m, source_url: e.target.value }))} placeholder="https://..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => void submitManual()}>Simpan</button>
              <button className="btn-ghost" onClick={() => navigate('/prices')}>Batal</button>
            </div>
          </div>
        </div>
      </div>
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

      {!canList && <div className="page"><div className="alert">Tidak ada izin melihat harga.</div></div>}

      {canList && (
        <div className="page">
          <div className="card">
            <div style={{ marginBottom: 10 }}>
              <label>Search Harga</label>
              <input value={priceSearch} onChange={(e) => setPriceSearch(e.target.value)} placeholder="Cari komoditas/sumber" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Daftar Harga</h3>
              <small style={{ color: '#64748b' }}>Data harga dengan pagination</small>
            </div>

            {loadingPrices ? (
              <div>Memuat...</div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Komoditas</th>
                      <th>Harga</th>
                      <th>Sumber</th>
                      <th>Waktu</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((price) => (
                      <tr key={price.id}>
                        <td>{price.commodity?.name || 'Komoditas'}</td>
                        <td>{formatRupiah(price.price)} {price.commodity?.unit ? `/ ${price.commodity?.unit}` : ''}</td>
                        <td style={{ maxWidth: 220, wordBreak: 'break-word' }}>{price.source_url || '-'}</td>
                        <td>{price.collected_at ? new Date(price.collected_at).toLocaleString('id-ID') : '-'}</td>
                        <td className="action-cell">
                          <ActionMenu
                            items={[
                              {
                                key: 'view',
                                label: 'View',
                                onClick: () => navigate(`/prices/${price.id}`, { state: { price } }),
                              },
                              {
                                key: 'delete',
                                label: 'Delete',
                                onClick: () => void removePrice(price.id),
                                hidden: !canScrape,
                                danger: true,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                    {prices.length === 0 && (
                      <tr>
                        <td colSpan={5}>Belum ada harga.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <Pagination
                  page={pricePage}
                  totalPages={priceTotalPages}
                  totalData={priceTotalData}
                  limit={priceLimit}
                  onPageChange={setPricePage}
                  onLimitChange={(next) => {
                    setPriceLimit(next)
                    setPricePage(1)
                  }}
                  disabled={loadingPrices}
                />
              </>
            )}
          </div>

          {selectedJob && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Hasil Scrape (Job {selectedJob.slice(0, 6)})</h3>
                {canImport && (
                  <button className="btn" onClick={() => void importSelected()} disabled={selectedResultIds.length === 0}>
                    Import pilihan ({selectedResultIds.length})
                  </button>
                )}
              </div>

              <div style={{ marginTop: 10, marginBottom: 10 }}>
                <label>Search Hasil Scrape</label>
                <input value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} placeholder="Cari komoditas/sumber" />
              </div>

              {loadingResults ? (
                <div>Memuat hasil...</div>
              ) : results.length === 0 ? (
                <div className="muted">Belum ada hasil untuk job ini.</div>
              ) : (
                <>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Pilih</th>
                        <th>Komoditas</th>
                        <th>Harga</th>
                        <th>Sumber</th>
                        <th>Waktu Scrape</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result) => (
                        <tr key={result.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedResultIds.includes(result.id)}
                              onChange={() => toggleResult(result.id)}
                            />
                          </td>
                          <td>{result.commodity_name}</td>
                          <td>{formatRupiah(result.price)} {result.unit ? `/ ${result.unit}` : ''}</td>
                          <td style={{ maxWidth: 220, wordBreak: 'break-word' }}>{result.source_url}</td>
                          <td>{new Date(result.scraped_at).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <Pagination
                    page={resultPage}
                    totalPages={resultTotalPages}
                    totalData={resultTotalData}
                    limit={resultLimit}
                    onPageChange={setResultPage}
                    onLimitChange={(next) => {
                      setResultLimit(next)
                      setResultPage(1)
                    }}
                    disabled={loadingResults}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {canScrape && (
        <div className="page" style={{ paddingTop: 0 }}>
          <JobDock
            open={jobsOpen}
            onToggle={() => setJobsOpen((value) => !value)}
            jobs={jobs}
            onSelect={(id) => {
              setResultPage(1)
              loadResults(id)
            }}
            statusColor={statusColor}
            page={jobsPage}
            totalPages={jobsTotalPages}
            totalData={jobsTotalData}
            limit={jobsLimit}
            onPageChange={setJobsPage}
            onLimitChange={(next) => {
              setJobsLimit(next)
              setJobsPage(1)
            }}
            search={jobSearch}
            onSearchChange={setJobSearch}
          />
        </div>
      )}

      {showModal && canScrape && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Input URL untuk di-scrape</h3>
            <div className="muted" style={{ marginBottom: 8 }}>Tambahkan 1 atau lebih URL. Bisa tambah baris.</div>
            <div className="grid" style={{ gap: 10 }}>
              {urls.map((url, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    style={{ flex: 1 }}
                    value={url}
                    placeholder="https://..."
                    onChange={(e) => {
                      const next = [...urls]
                      next[idx] = e.target.value
                      setUrls(next)
                    }}
                  />
                  {urls.length > 1 && (
                    <button className="btn-ghost" onClick={() => setUrls((prev) => prev.filter((_, i) => i !== idx))}>
                      Hapus
                    </button>
                  )}
                </div>
              ))}
              <button className="btn-ghost" onClick={() => setUrls((prev) => [...prev, ''])}>+ Tambah baris</button>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn" onClick={() => void startJob()} disabled={startingJob}>
                {startingJob ? 'Memulai...' : 'Proses'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function JobDock({
  open,
  onToggle,
  jobs,
  onSelect,
  statusColor,
  page,
  totalPages,
  totalData,
  limit,
  onPageChange,
  onLimitChange,
  search,
  onSearchChange,
}: {
  open: boolean
  onToggle: () => void
  jobs: Job[]
  onSelect: (id: string) => void
  statusColor: Record<string, string>
  page: number
  totalPages: number
  totalData: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  search: string
  onSearchChange: (value: string) => void
}) {
  const safeTotalPages = totalPages > 0 ? totalPages : 1

  return (
    <div
      style={{
        width: '100%',
        background: '#ffffff',
        border: '1px solid #dbe3ef',
        borderRadius: 12,
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Job Scrape</div>
        <button className="btn-ghost" onClick={onToggle}>{open ? 'Tutup' : 'Buka'}</button>
      </div>

      {open && (
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Cari status/message" />

          <div style={{ maxHeight: 260, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {jobs.length === 0 && <div className="muted">Belum ada job.</div>}
            {jobs.map((job) => (
              <button
                key={job.id}
                className="btn-ghost"
                style={{ justifyContent: 'space-between', borderRadius: 10, padding: 10 }}
                onClick={() => onSelect(job.id)}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>{job.id.slice(0, 8)}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(job.created_at).toLocaleTimeString('id-ID')}</div>
                </div>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: `${statusColor[job.status] || '#334155'}22`,
                    color: statusColor[job.status] || '#334155',
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {job.status}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ color: '#64748b', fontSize: 12 }}>
              Total {totalData} • Halaman {page} / {safeTotalPages}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} style={{ width: 90 }}>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>

              <button className="btn-ghost" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Prev</button>
              <button className="btn-ghost" onClick={() => onPageChange(page + 1)} disabled={page >= safeTotalPages}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
