type PriceScrapeModalProps = {
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>
  setUrls: React.Dispatch<React.SetStateAction<string[]>>
  showModal: boolean
  startJob: () => Promise<void>
  startingJob: boolean
  urls: string[]
}

export default function PriceScrapeModal({
  setShowModal,
  setUrls,
  showModal,
  startJob,
  startingJob,
  urls,
}: PriceScrapeModalProps) {
  if (!showModal) return null

  return (
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
  )
}
