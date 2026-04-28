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
      <div className="card scrape-run-card">
        <div className="scrape-run-head">
          <div>
            <h3>Run Scrape</h3>
            <div className="scrape-run-note">Use active defaults or paste comma-separated URLs for a manual run.</div>
          </div>
        </div>

        <div className="compact-filter-toolbar scrape-run-toolbar">
          <div className="compact-filter-item grow-2">
            <input
              value={customUrls}
              onChange={(e) => setCustomUrls(e.target.value)}
              placeholder="Manual scrape URLs, comma-separated (leave empty to use active defaults)"
              aria-label="Manual scrape URLs"
            />
          </div>

          <div className="compact-filter-action">
            <button className="btn" onClick={() => void runScrape()} disabled={loading || !canScrape}>
              {loading ? 'Scraping...' : 'Run Scrape'}
            </button>
          </div>
        </div>
      </div>

      <div className="card scrape-price-preview-card">
        <div className="scrape-run-head">
          <div>
            <h3>Latest Prices Preview</h3>
            <div className="scrape-run-note">Quick preview from the newest commodity price rows.</div>
          </div>
        </div>
        <div className="scrape-price-preview-grid">
          {prices.map((price) => (
            <div key={price.id} className="scrape-price-preview-item">
              <div className="scrape-price-preview-name">{price.commodity?.name || 'Commodity'}</div>
              <div className="scrape-price-preview-value">
                {formatRupiah(price.price || 0)} / {price.commodity?.unit}
              </div>
            </div>
          ))}
          {prices.length === 0 && (
            <div className="scrape-price-empty">
              <div className="entity-empty-title">No price preview yet</div>
              <div className="entity-empty-note">Run a scrape or wait for commodity data to populate this preview.</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
