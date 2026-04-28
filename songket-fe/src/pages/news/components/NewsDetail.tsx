import dayjs from 'dayjs'
import type { ScrapedNews } from './newsHelpers'

type NewsDetailProps = {
  added: Record<string, boolean>
  adding: Record<string, boolean>
  canScrape: boolean
  detailImages: string[]
  navigate: (path: string) => void
  onAddToNews: (row: ScrapedNews) => Promise<void>
  selectedDetail: ScrapedNews | null
}

export default function NewsDetail({
  added,
  adding,
  canScrape,
  detailImages,
  navigate,
  onAddToNews,
  selectedDetail,
}: NewsDetailProps) {
  const hostLabel = (value: string) => {
    const text = String(value || '').trim()
    if (!text) return '-'
    try {
      return new URL(text).hostname.replace(/^www\./, '') || text
    } catch {
      return text
    }
  }

  return (
    <div className="news-shell">
      <div className="header news-header">
        <div className="news-heading">
          <div className="news-eyebrow">Article Detail</div>
          <div className="news-title">News Details</div>
          <div className="news-subtitle">Source identity, article images, and readable content preview.</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/news')}>Back to News</button>
      </div>

      <div className="page news-page">
        {!selectedDetail && <div className="alert">News details not found.</div>}
        {selectedDetail && (
          <div className="card news-detail-card">
            <div className="news-detail-hero">
              <div>
                <div className="news-detail-kicker">{selectedDetail.sumber || 'Source not available'}</div>
                <div className="news-detail-title">{selectedDetail.judul || '-'}</div>
                <div className="news-detail-meta">
                  <span>{selectedDetail.created_at ? dayjs(selectedDetail.created_at).format('DD MMM YYYY HH:mm') : '-'}</span>
                  <span>{hostLabel(selectedDetail.url)}</span>
                </div>
              </div>
              {selectedDetail.url && (
                <a className="btn-ghost news-detail-open-link" href={selectedDetail.url} target="_blank" rel="noreferrer">
                  Open Source
                </a>
              )}
            </div>

            {selectedDetail.url && (
              <div className="news-detail-url-card">
                <div>Original URL</div>
                <a className="detail-link" href={selectedDetail.url} target="_blank" rel="noreferrer">{selectedDetail.url}</a>
              </div>
            )}

            {detailImages.length > 0 && (
              <div className="news-image-grid">
                {detailImages.map((img) => (
                  <a key={img} href={img} target="_blank" rel="noreferrer">
                    <img src={img} alt={selectedDetail.judul} />
                  </a>
                ))}
              </div>
            )}

            <div className="news-content-panel">
              <div className="news-content-title">Article Content</div>
              <div className="news-content-body">{selectedDetail.isi || '-'}</div>
            </div>

            {canScrape && !selectedDetail.from_db && (
              <div className="news-detail-actions">
                <button className="btn" onClick={() => void onAddToNews(selectedDetail)} disabled={!!adding[selectedDetail.url] || !!added[selectedDetail.url]}>
                  {added[selectedDetail.url] ? 'Added' : adding[selectedDetail.url] ? 'Adding...' : 'Add to News'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
