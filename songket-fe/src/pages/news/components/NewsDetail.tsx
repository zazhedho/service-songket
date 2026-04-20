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
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>News Details</div>
          <div style={{ color: '#64748b' }}>Complete news information</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/news')}>Back</button>
      </div>

      <div className="page">
        {!selectedDetail && <div className="alert">News details not found.</div>}
        {selectedDetail && (
          <div className="card" style={{ maxWidth: 980 }}>
            <h3>{selectedDetail.judul || '-'}</h3>
            <div style={{ color: '#64748b', marginTop: 6 }}>
              {selectedDetail.created_at ? dayjs(selectedDetail.created_at).format('DD MMM YYYY HH:mm') : '-'} | {selectedDetail.sumber || '-'}
            </div>

            <div style={{ marginTop: 10 }}>
              <a href={selectedDetail.url} target="_blank" rel="noreferrer">{selectedDetail.url}</a>
            </div>

            {detailImages.length > 0 && (
              <div
                className="grid"
                style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginTop: 12, marginBottom: 12 }}
              >
                {detailImages.map((img) => (
                  <a key={img} href={img} target="_blank" rel="noreferrer">
                    <img
                      src={img}
                      alt={selectedDetail.judul}
                      style={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #dbe3ef',
                      }}
                    />
                  </a>
                ))}
              </div>
            )}

            <div
              style={{
                maxHeight: '50vh',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.45,
                border: '1px solid #dbe3ef',
                borderRadius: 10,
                padding: 12,
                background: '#f8fafc',
              }}
            >
              {selectedDetail.isi || '-'}
            </div>

            {canScrape && !selectedDetail.from_db && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
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
