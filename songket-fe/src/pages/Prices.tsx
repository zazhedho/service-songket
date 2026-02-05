import { useEffect, useMemo, useState } from 'react'
import {
  fetchPriceList,
  createScrapeJob,
  listScrapeJobs,
  fetchScrapeResults,
  commitScrapeResults,
  deletePrice,
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

export default function PricesPage() {
  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_prices')
  const canScrape = perms.includes('scrape_prices')
  const canImport = perms.includes('add_price') || canScrape

  const [prices, setPrices] = useState<any[]>([])
  const [loadingPrices, setLoadingPrices] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [urls, setUrls] = useState<string[]>([''])
  const [startingJob, setStartingJob] = useState(false)

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsOpen, setJobsOpen] = useState(true)
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [results, setResults] = useState<ScrapeResult[]>([])
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([])
  const [loadingResults, setLoadingResults] = useState(false)

  const loadPrices = () => {
    if (!canList) return
    setLoadingPrices(true)
    fetchPriceList({ limit: 200 })
      .then((r) => setPrices(r.data.data || r.data || []))
      .finally(() => setLoadingPrices(false))
  }

  const loadJobs = () => {
    if (!canScrape) return
    listScrapeJobs()
      .then((r) => setJobs(r.data.data || r.data || []))
      .catch(() => {})
  }

  const loadResults = (jobId: string) => {
    setSelectedJob(jobId)
    setLoadingResults(true)
    fetchScrapeResults(jobId)
      .then((r) => {
        const data: ScrapeResult[] = r.data.data || r.data || []
        setResults(data)
        setSelectedResultIds(data.map((d) => d.id))
      })
      .finally(() => setLoadingResults(false))
  }

  useEffect(() => {
    loadPrices()
  }, [canList])

  useEffect(() => {
    if (!canScrape) return
    loadJobs()
    const t = setInterval(loadJobs, 3000)
    return () => clearInterval(t)
  }, [canScrape])

  const startJob = async () => {
    const payload = urls.map((u) => u.trim()).filter(Boolean)
    if (payload.length === 0) {
      window.alert('Minimal 1 URL')
      return
    }
    setStartingJob(true)
    try {
      await createScrapeJob({ urls: payload })
      setShowModal(false)
      setUrls([''])
      loadJobs()
    } catch (e: any) {
      window.alert(e?.response?.data?.error || 'Gagal membuat job')
    } finally {
      setStartingJob(false)
    }
  }

  const toggleResult = (id: string) => {
    setSelectedResultIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
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
    } catch (e: any) {
      window.alert(e?.response?.data?.error || 'Gagal mengimport')
    }
  }

  const removePrice = async (id: string) => {
    if (!canScrape) return
    if (!window.confirm('Hapus harga ini?')) return
    try {
      await deletePrice(id)
      loadPrices()
    } catch (e: any) {
      window.alert(e?.response?.data?.error || 'Gagal menghapus')
    }
  }

  const statusColor = useMemo(
    () =>
      ({
        pending: '#fbbf24',
        running: '#60a5fa',
        success: '#22c55e',
        error: '#f87171',
      } as Record<string, string>),
    [],
  )

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Harga Pangan</div>
          <div style={{ color: '#9ca3af' }}>Scrape harga kemudian pilih data yang mau disimpan</div>
        </div>
        {canScrape && (
          <button className="btn" onClick={() => setShowModal(true)}>
            Jalankan Scrape
          </button>
        )}
      </div>

      {!canList && <div className="page"><div className="alert">Tidak ada izin melihat harga.</div></div>}

      {canList && (
        <div className="page">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Daftar Harga</h3>
              <small style={{ color: '#9ca3af' }}>Tampilkan maksimal 200 terbaru</small>
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
                    {canScrape && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p) => (
                    <tr key={p.id}>
                      <td>{p.commodity?.name || 'Komoditas'}</td>
                      <td>{formatRupiah(p.price)} {p.commodity?.unit ? `/ ${p.commodity?.unit}` : ''}</td>
                      <td style={{ maxWidth: 220, wordBreak: 'break-word' }}>{p.source_url || '-'}</td>
                      <td>{new Date(p.collected_at).toLocaleString('id-ID')}</td>
                      {canScrape && (
                        <td>
                          <button className="btn-ghost" onClick={() => removePrice(p.id)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedJob && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Hasil Scrape (Job {selectedJob.slice(0, 6)})</h3>
                {canImport && (
                  <button className="btn" onClick={importSelected} disabled={selectedResultIds.length === 0}>
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
                    {results.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <input type="checkbox" checked={selectedResultIds.includes(r.id)} onChange={() => toggleResult(r.id)} />
                        </td>
                        <td>{r.commodity_name}</td>
                        <td>{formatRupiah(r.price)} {r.unit ? `/ ${r.unit}` : ''}</td>
                        <td style={{ maxWidth: 220, wordBreak: 'break-word' }}>{r.source_url}</td>
                        <td>{new Date(r.scraped_at).toLocaleString('id-ID')}</td>
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
        <JobDock
          open={jobsOpen}
          onToggle={() => setJobsOpen((o) => !o)}
          jobs={jobs}
          onSelect={loadResults}
          statusColor={statusColor}
        />
      )}

      {showModal && canScrape && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Input URL untuk di-scrape</h3>
            <div className="muted" style={{ marginBottom: 8 }}>
              Tambahkan 1 atau lebih URL. Bisa tambah baris.
            </div>
            <div className="grid" style={{ gap: 10 }}>
              {urls.map((u, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    style={{ flex: 1 }}
                    value={u}
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
              <button className="btn" onClick={startJob} disabled={startingJob}>
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
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
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
          {jobs.map((j) => (
            <button
              key={j.id}
              className="btn-ghost"
              style={{ justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 10 }}
              onClick={() => onSelect(j.id)}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>{j.id.slice(0, 8)}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(j.created_at).toLocaleTimeString('id-ID')}</div>
              </div>
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: 999,
                  background: `${statusColor[j.status] || '#e5e7eb'}22`,
                  color: statusColor[j.status] || '#e5e7eb',
                  fontSize: 12,
                  textTransform: 'capitalize',
                }}
              >
                {j.status}
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
