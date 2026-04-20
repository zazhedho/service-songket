type ScrapeSourcePanelsProps = {
  canScrape: boolean
  customUrls: string
  formatRupiah: (value: number) => string
  loading: boolean
  prices: any[]
  runScrape: () => Promise<void>
  setCustomUrls: React.Dispatch<React.SetStateAction<string>>
}

export default function ScrapeSourcePanels({
  canScrape,
  customUrls,
  formatRupiah,
  loading,
  prices,
  runScrape,
  setCustomUrls,
}: ScrapeSourcePanelsProps) {
  if (!canScrape) return null

  return (
    <>
      <div className="card">
        <h3>Manual Scrape</h3>
        <label>URL list (comma-separated, empty uses active defaults)</label>
        <input value={customUrls} onChange={(e) => setCustomUrls(e.target.value)} placeholder="https://..." />
        <div style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => void runScrape()} disabled={loading || !canScrape}>
            {loading ? 'Scraping...' : 'Run Scrape'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Latest Prices Preview</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 10 }}>
          {prices.map((price) => (
            <div key={price.id} style={{ background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #dde4ee' }}>
              <div style={{ fontWeight: 700 }}>{price.commodity?.name || 'Commodity'}</div>
              <div style={{ color: '#64748b' }}>
                {formatRupiah(price.price || 0)} / {price.commodity?.unit}
              </div>
            </div>
          ))}
          {prices.length === 0 && <div className="muted">No price preview yet.</div>}
        </div>
      </div>
    </>
  )
}
