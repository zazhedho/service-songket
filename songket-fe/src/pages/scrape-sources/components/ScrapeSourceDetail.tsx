type ScrapeSourceDetailProps = {
  canUpdate: boolean
  navigate: (path: string, options?: any) => void
  selectedId: string
  selectedSource: any
}

export default function ScrapeSourceDetail({
  canUpdate,
  navigate,
  selectedId,
  selectedSource,
}: ScrapeSourceDetailProps) {
  const sourceUrl = String(selectedSource?.url || '').trim()
  const sourceHost = (() => {
    if (!sourceUrl) return '-'
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, '') || sourceUrl
    } catch {
      return sourceUrl
    }
  })()

  return (
    <div className="scrape-source-shell">
      <div className="header scrape-source-header">
        <div className="scrape-source-heading">
          <div className="scrape-source-eyebrow">Source Profile</div>
          <div className="scrape-source-title">Scrape Source Details</div>
          <div className="scrape-source-subtitle">Review source identity, target URL, and current availability.</div>
        </div>
        <div className="scrape-source-actions">
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/scrape-sources/${selectedId}/edit`, { state: { source: selectedSource } })}>
              Edit Source
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Back</button>
        </div>
      </div>

      <div className="page scrape-source-page">
        {!selectedSource && <div className="alert">Source data not found.</div>}
        {selectedSource && (
          <div className="card scrape-source-detail-card">
            <div className="scrape-source-detail-hero">
              <div>
                <div className="scrape-source-detail-kicker">Source</div>
                <div className="scrape-source-detail-name">{selectedSource.name || '-'}</div>
                <div className="scrape-source-detail-url" title={sourceUrl || '-'}>
                  {sourceHost}
                </div>
              </div>
              <span className={`badge ${selectedSource.is_active ? 'success' : 'reject'}`}>
                {selectedSource.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="scrape-source-detail-grid">
              <div className="scrape-source-detail-item">
                <div className="scrape-source-detail-label">Name</div>
                <div className="scrape-source-detail-value">{selectedSource.name || '-'}</div>
              </div>
              <div className="scrape-source-detail-item">
                <div className="scrape-source-detail-label">Type</div>
                <div className="scrape-source-detail-value">{selectedSource.type || '-'}</div>
              </div>
              <div className="scrape-source-detail-item">
                <div className="scrape-source-detail-label">Category</div>
                <div className="scrape-source-detail-value">{selectedSource.category || '-'}</div>
              </div>
              <div className="scrape-source-detail-item">
                <div className="scrape-source-detail-label">URL</div>
                <div className="scrape-source-detail-value">
                  {sourceUrl ? (
                    <div className="table-stack-cell">
                      <a className="detail-link table-url-link" href={sourceUrl} target="_blank" rel="noreferrer">
                        {sourceHost}
                      </a>
                      <div className="table-stack-secondary table-url-wrap" title={sourceUrl}>
                        {sourceUrl}
                      </div>
                    </div>
                  ) : '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
