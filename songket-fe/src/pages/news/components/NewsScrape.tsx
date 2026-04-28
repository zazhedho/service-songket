import dayjs from 'dayjs'
import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'
import type { ScrapedNews } from './newsHelpers'
import { shortText } from './newsHelpers'

type NewsScrapeProps = {
  added: Record<string, boolean>
  adding: Record<string, boolean>
  canScrape: boolean
  navigate: (path: string, options?: any) => void
  onAddToNews: (row: ScrapedNews) => Promise<void>
  onStartScrape: () => void
  pagedScrapedRows: ScrapedNews[]
  scrapedLimit: number
  scrapedPage: number
  scrapedRows: ScrapedNews[]
  scrapedTotalPages: number
  scraping: boolean
  setScrapedLimit: React.Dispatch<React.SetStateAction<number>>
  setScrapedPage: React.Dispatch<React.SetStateAction<number>>
  setUrls: React.Dispatch<React.SetStateAction<string[]>>
  sourceOptions: { url: string; name: string }[]
  urls: string[]
}

export default function NewsScrape({
  added,
  adding,
  canScrape,
  navigate,
  onAddToNews,
  onStartScrape,
  pagedScrapedRows,
  scrapedLimit,
  scrapedPage,
  scrapedRows,
  scrapedTotalPages,
  scraping,
  setScrapedLimit,
  setScrapedPage,
  setUrls,
  sourceOptions,
  urls,
}: NewsScrapeProps) {
  const sourceHost = (value: string) => {
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
          <div className="news-eyebrow">News Intake</div>
          <div className="news-title">Scrape News Portal</div>
          <div className="news-subtitle">Collect articles from registered sources or add specific URLs for one-time scraping.</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/news')}>Back to Table</button>
      </div>

      <div className="page news-page">
        {!canScrape && <div className="alert">No permission to scrape news.</div>}

        {canScrape && (
          <div className="card news-scrape-card">
            <div className="news-scrape-head">
              <div>
                <h3>Scrape Sources</h3>
                <span>Add URLs only when you need to target a specific news page.</span>
              </div>
              <button className="btn" onClick={onStartScrape} disabled={scraping}>
                {scraping ? 'Processing...' : 'Run Scrape'}
              </button>
            </div>

            {sourceOptions.length > 0 && (
              <div className="news-source-strip">
                <div className="news-source-strip-label">Registered sources</div>
                <div className="news-source-list">
                  {sourceOptions.map((item) => (
                    <span key={`${item.name}-${item.url}`} title={item.url}>
                      {item.name || sourceHost(item.url)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="news-url-list">
              {urls.map((url, idx) => (
                <div key={idx} className="news-url-row">
                  <input
                    value={url}
                    placeholder="https://example.com/article"
                    onChange={(e) => {
                      const next = [...urls]
                      next[idx] = e.target.value
                      setUrls(next)
                    }}
                    className="news-url-input"
                  />
                  {urls.length > 1 && (
                    <button className="btn-ghost" onClick={() => setUrls((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                  )}
                </div>
              ))}
              <button className="btn-ghost" onClick={() => setUrls((prev) => [...prev, ''])}>+ Add row</button>
            </div>
          </div>
        )}

        {canScrape && scrapedRows.length > 0 && (
          <div className="card news-results-card">
            <div className="news-section-head">
              <div>
                <h3>Scrape Results Preview</h3>
                <span>{scrapedRows.length} article{scrapedRows.length === 1 ? '' : 's'} ready for review.</span>
              </div>
            </div>
            <Table
              className="news-scrape-preview-table metric-table"
              data={pagedScrapedRows}
              keyField="url"
              onRowClick={(row) => navigate(`/news/${encodeURIComponent(row.url)}`, { state: { detail: row } })}
              columns={[
                {
                  header: 'Article',
                  accessor: (row) => (
                    <div className="table-stack-cell">
                      <div className="table-stack-primary" title={row.judul || '-'}>
                        {row.judul || '-'}
                      </div>
                      <div className="table-stack-tertiary" title={row.url || '-'}>
                        {sourceHost(row.url)}
                      </div>
                    </div>
                  ),
                  className: 'news-scrape-col-article',
                  headerClassName: 'news-scrape-col-article',
                },
                {
                  header: 'Preview',
                  accessor: (row) => (
                    <div className="table-preview-text" title={row.isi || '-'}>
                      {shortText(row.isi, 180) || '-'}
                    </div>
                  ),
                  className: 'news-scrape-col-preview',
                  headerClassName: 'news-scrape-col-preview',
                },
                {
                  header: 'Source',
                  accessor: (row) => (
                    <div className="table-stack-cell">
                      <div className="table-stack-primary" title={row.sumber || '-'}>
                        {row.sumber || '-'}
                      </div>
                      {row.url ? (
                        <a className="table-url-link table-stack-tertiary" href={row.url} target="_blank" rel="noreferrer" title={row.url}>
                          {sourceHost(row.url)}
                        </a>
                      ) : (
                        <div className="table-stack-tertiary">URL not available</div>
                      )}
                    </div>
                  ),
                  className: 'news-scrape-col-source',
                  headerClassName: 'news-scrape-col-source',
                },
                {
                  header: 'Created At',
                  accessor: (row) => (
                    <div className="table-stack-cell">
                      <div className="table-stack-primary">{row.created_at ? dayjs(row.created_at).format('DD MMM YYYY') : '-'}</div>
                      <div className="table-stack-tertiary">{row.created_at ? dayjs(row.created_at).format('HH:mm') : 'No timestamp'}</div>
                    </div>
                  ),
                  className: 'news-scrape-col-created',
                  headerClassName: 'news-scrape-col-created',
                },
                {
                  header: 'Action',
                  accessor: (row) => (
                    <ActionMenu
                      items={[
                        {
                          key: 'view',
                          label: 'View',
                          onClick: () => navigate(`/news/${encodeURIComponent(row.url)}`, { state: { detail: row } }),
                        },
                        {
                          key: 'add',
                          label: added[row.url] ? 'Added' : adding[row.url] ? 'Adding...' : 'Add to News',
                          onClick: () => void onAddToNews(row),
                          disabled: !!adding[row.url] || !!added[row.url],
                        },
                      ]}
                    />
                  ),
                  className: 'action-cell',
                  headerClassName: 'news-scrape-col-action',
                  ignoreRowClick: true,
                },
              ]}
            />

            <Pagination
              page={scrapedPage}
              totalPages={scrapedTotalPages}
              totalData={scrapedRows.length}
              limit={scrapedLimit}
              onPageChange={setScrapedPage}
              onLimitChange={(next) => {
                setScrapedLimit(next)
                setScrapedPage(1)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
