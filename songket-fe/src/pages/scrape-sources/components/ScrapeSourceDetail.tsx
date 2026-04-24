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
            <table className="table responsive-detail" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Name</th>
                  <td style={{ fontWeight: 600 }}>{selectedSource.name || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>URL</th>
                  <td style={{ fontWeight: 600 }}>
                    {selectedSource.url ? (
                      <a className="detail-link" href={selectedSource.url} target="_blank" rel="noreferrer">
                        {selectedSource.url}
                      </a>
                    ) : '-'}
                  </td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Type</th>
                  <td style={{ fontWeight: 600 }}>{selectedSource.type || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Category</th>
                  <td style={{ fontWeight: 600 }}>{selectedSource.category || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Status</th>
                  <td style={{ fontWeight: 600 }}>{selectedSource.is_active ? 'Active' : 'Inactive'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
