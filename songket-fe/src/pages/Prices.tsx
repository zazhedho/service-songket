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
import { useAuth } from '../store'

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

  const [prices, setPrices] = useState<any[]>([])
  const [loadingPrices, setLoadingPrices] = useState(false)

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
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [results, setResults] = useState<ScrapeResult[]>([])
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([])
  const [loadingResults, setLoadingResults] = useState(false)

  const statePrice = (location.state as any)?.price || null

  const selectedPrice = useMemo(() => {
    if (!selectedId) return null
    return prices.find((price) => price.id === selectedId) || (statePrice?.id === selectedId ? statePrice : null)
  }, [prices, selectedId, statePrice])

  const loadPrices = () => {
    if (!canList) return
    setLoadingPrices(true)
    fetchPriceList({ limit: 200 })
      .then((res) => setPrices(res.data.data || res.data || []))
      .finally(() => setLoadingPrices(false))
  }

  const loadJobs = () => {
    if (!canScrape) return
    listScrapeJobs()
      .then((res) => setJobs(res.data.data || res.data || []))
      .catch(() => {})
  }

  const loadResults = (jobId: string) => {
    setSelectedJob(jobId)
    setLoadingResults(true)
    fetchScrapeResults(jobId)
      .then((res) => {
        const data: ScrapeResult[] = res.data.data || res.data || []
        setResults(data)
        setSelectedResultIds(data.map((item) => item.id))
      })
      .finally(() => setLoadingResults(false))
  }

  useEffect(() => {
    loadPrices()
  }, [canList])

  useEffect(() => {
    if (!canScrape) return
    loadJobs()
    const timer = setInterval(loadJobs, 3000)
    return () => clearInterval(timer)
  }, [canScrape])

  const submitManual = async () => {
    if (!canImport) return
    if (!manual.name) {
      window.alert('Nama komoditas wajib diisi')
      return
    }

    try {
      const numeric = toNumber(manual.price)
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
    if (!window.confirm('Hapus harga ini?')) return
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Harga Pangan</div>
            <div style={{ color: '#64748b' }}>Informasi lengkap data harga</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/prices')}>Kembali</button>
        </div>

        <div className="page">
          {!selectedPrice && <div className="alert">Data harga tidak ditemukan.</div>}
          {selectedPrice && (
            <div className="card" style={{ maxWidth: 820 }}>
              <DetailRow label="Komoditas" value={selectedPrice.commodity?.name || '-'} />
              <DetailRow label="Harga" value={formatRupiah(selectedPrice.price)} />
              <DetailRow label="Satuan" value={selectedPrice.commodity?.unit || '-'} />
              <DetailRow label="Sumber URL" value={selectedPrice.source_url || '-'} />
              <DetailRow label="Waktu" value={selectedPrice.collected_at ? new Date(selectedPrice.collected_at).toLocaleString('id-ID') : '-'} />
              <DetailRow label="Price ID" value={selectedPrice.id} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Daftar Harga</h3>
              <small style={{ color: '#64748b' }}>Menampilkan maksimal 200 data terbaru</small>
            </div>

            {loadingPrices ? (
              <div>Memuat...</div>
            ) : (
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
                      <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn-ghost" onClick={() => navigate(`/prices/${price.id}`, { state: { price } })}>View</button>
                        {canScrape && <button className="btn-ghost" onClick={() => void removePrice(price.id)}>Delete</button>}
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

              {loadingResults ? (
                <div>Memuat hasil...</div>
              ) : results.length === 0 ? (
                <div className="muted">Belum ada hasil untuk job ini.</div>
              ) : (
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
              )}
            </div>
          )}
        </div>
      )}

      {canScrape && (
        <JobDock open={jobsOpen} onToggle={() => setJobsOpen((value) => !value)} jobs={jobs} onSelect={loadResults} statusColor={statusColor} />
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
}: {
  open: boolean
  onToggle: () => void
  jobs: Job[]
  onSelect: (id: string) => void
  statusColor: Record<string, string>
}) {
  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: open ? 320 : 140,
        background: '#ffffff',
        border: '1px solid #dbe3ef',
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(15, 23, 42, 0.2)',
        zIndex: 30,
      }}
    >
      <div style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Job Scrape</div>
        <button className="btn-ghost" onClick={onToggle}>{open ? 'Minimize' : 'Buka'}</button>
      </div>

      {open && (
        <div style={{ maxHeight: 260, overflow: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
      )}
    </div>
  )
}

function formatRupiah(value: number) {
  if (!value && value !== 0) return '-'
  return value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
}

function formatRupiahInput(raw: string) {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''
  const numeric = Number(digits)
  return numeric.toLocaleString('id-ID')
}

function toNumber(raw: string) {
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, padding: '6px 0' }}>
      <div style={{ color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value || '-'}</div>
    </div>
  )
}
