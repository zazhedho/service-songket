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
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Scrape Source Details</div>
          <div style={{ color: '#64748b' }}>Scraping URL configuration</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/scrape-sources/${selectedId}/edit`, { state: { source: selectedSource } })}>
              Edit Source
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedSource && <div className="alert">Source data not found.</div>}
        {selectedSource && (
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Source Information</h3>
            <table className="table responsive-detail polished-detail-table" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Name</th>
                  <td><span className="detail-value-strong">{selectedSource.name || '-'}</span></td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>URL</th>
                  <td>
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
                  </td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Type</th>
                  <td><span className="table-metric-pill total">{selectedSource.type || '-'}</span></td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Category</th>
                  <td><span className="detail-value-strong">{selectedSource.category || '-'}</span></td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Status</th>
                  <td>
                    <span className={`badge ${selectedSource.is_active ? 'success' : 'reject'}`}>
                      {selectedSource.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
