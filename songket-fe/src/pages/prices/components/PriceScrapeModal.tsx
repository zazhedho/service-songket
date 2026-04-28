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
      <div className="modal price-scrape-modal">
        <div className="price-modal-head">
          <div>
            <div className="price-modal-kicker">Scrape Source</div>
            <h3>Enter URLs to Scrape</h3>
            <div className="price-modal-note">Add one or more URLs, or leave empty to use active defaults.</div>
          </div>
        </div>
        <div className="price-url-list">
          {urls.map((url, idx) => (
            <div key={idx} className="modal-inline-field-row">
              <input
                className="price-url-input"
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
                  Remove
                </button>
              )}
            </div>
          ))}
          <button className="btn-ghost" onClick={() => setUrls((prev) => [...prev, ''])}>+ Add Row</button>
        </div>

        <div className="modal-action-row price-modal-actions">
          <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn" onClick={() => void startJob()} disabled={startingJob}>
            {startingJob ? 'Starting...' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  )
}
