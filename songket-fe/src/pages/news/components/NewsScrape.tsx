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
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Scrape News Portal</div>
          <div style={{ color: '#64748b' }}>Dedicated page for news source URL scraping</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/news')}>Back to Table</button>
      </div>

      <div className="page">
        {!canScrape && <div className="alert">No permission to scrape news.</div>}

        {canScrape && (
          <div className="card">
            <div className="muted">Enter one or more news portal URLs and add rows if needed.</div>
            {sourceOptions.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                Registered sources: {sourceOptions.map((item) => `${item.name || 'source'} (${item.url})`).join(', ')}
              </div>
            )}
            <div className="grid" style={{ gap: 10, marginTop: 10 }}>
              {urls.map((url, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={url}
                    placeholder="https://"
                    onChange={(e) => {
                      const next = [...urls]
                      next[idx] = e.target.value
                      setUrls(next)
                    }}
                    style={{ flex: 1 }}
                  />
                  {urls.length > 1 && (
                    <button className="btn-ghost" onClick={() => setUrls((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                  )}
                </div>
              ))}
              <button className="btn-ghost" onClick={() => setUrls((prev) => [...prev, ''])}>+ Add row</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={onStartScrape} disabled={scraping}>
                {scraping ? 'Processing...' : 'Run Scrape'}
              </button>
            </div>
          </div>
        )}

        {canScrape && scrapedRows.length > 0 && (
          <div className="card">
            <h3>Scrape Results Preview</h3>
            <Table
              data={pagedScrapedRows}
              keyField="url"
              onRowClick={(row) => navigate(`/news/${encodeURIComponent(row.url)}`, { state: { detail: row } })}
              columns={[
                { header: 'Title', accessor: 'judul', style: { maxWidth: 320 } },
                { header: 'Content', accessor: (row) => shortText(row.isi, 180), style: { maxWidth: 360, wordBreak: 'break-word' } },
                { header: 'Created At', accessor: (row) => row.created_at ? dayjs(row.created_at).format('DD MMM YYYY HH:mm') : '-' },
                { header: 'Source', accessor: (row) => row.sumber || '-' },
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
