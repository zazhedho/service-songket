import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

type ScrapeResult = {
  id: string
  commodity_name: string
  price: number
  unit: string
  source_url: string
  scraped_at: string
}

type PriceScrapeResultsProps = {
  canImport: boolean
  formatRupiah: (value: number) => string
  importSelected: () => Promise<void>
  loadingResults: boolean
  resultLimit: number
  resultPage: number
  resultSearch: string
  resultTotalData: number
  resultTotalPages: number
  results: ScrapeResult[]
  selectedJob: string
  selectedResultIds: string[]
  setResultLimit: React.Dispatch<React.SetStateAction<number>>
  setResultPage: React.Dispatch<React.SetStateAction<number>>
  setResultSearch: React.Dispatch<React.SetStateAction<string>>
  toggleResult: (id: string) => void
}

export default function PriceScrapeResults({
  canImport,
  formatRupiah,
  importSelected,
  loadingResults,
  resultLimit,
  resultPage,
  resultSearch,
  resultTotalData,
  resultTotalPages,
  results,
  selectedJob,
  selectedResultIds,
  setResultLimit,
  setResultPage,
  setResultSearch,
  toggleResult,
}: PriceScrapeResultsProps) {
  const renderSource = (url: string) => {
    if (!url) return '-'
    let host = url
    try {
      host = new URL(url).host
    } catch {
      host = url
    }

    return (
      <a className="detail-link" href={url} target="_blank" rel="noreferrer" title={url}>
        {host}
      </a>
    )
  }

  return (
    <div className="card price-results-card">
      <div className="price-section-head">
        <div>
          <h3>Scrape Results</h3>
          <div className="price-section-note">Job {selectedJob.slice(0, 6)}</div>
        </div>
        {canImport && (
          <button className="btn" onClick={() => void importSelected()} disabled={selectedResultIds.length === 0}>
            Import Selected ({selectedResultIds.length})
          </button>
        )}
      </div>

      <div className="compact-filter-toolbar price-filter-toolbar">
        <div className="compact-filter-item grow-2">
          <input value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} placeholder="Search commodity or source" aria-label="Search scrape results" />
        </div>
        <div className="compact-filter-action">
          <button
            className="btn-ghost price-clear-btn"
            onClick={() => setResultSearch('')}
            disabled={!resultSearch.trim()}
            title="Clear all filters"
            aria-label="Clear all filters"
          >
            ×
          </button>
        </div>
      </div>

      {loadingResults ? (
        <div className="table-state-panel loading price-results-state">
          <div className="table-state-icon">...</div>
          <div>
            <div className="table-state-title">Loading scrape results</div>
            <div className="table-state-note">Fetching the latest rows for this scrape job.</div>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="table-state-panel price-results-state">
          <div className="table-state-icon">i</div>
          <div>
            <div className="table-state-title">No results found</div>
            <div className="table-state-note">Try another scrape job or adjust the search keyword.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <Table
              data={results}
              keyField="id"
              className="metric-table price-results-table"
              onRowClick={(result) => toggleResult(result.id)}
              columns={[
                {
                  header: 'Select',
                  accessor: (result) => (
                    <input
                      type="checkbox"
                      checked={selectedResultIds.includes(result.id)}
                      onChange={() => toggleResult(result.id)}
                    />
                  ),
                  ignoreRowClick: true,
                  headerStyle: { width: 80 },
                  style: { width: 80 },
                },
                {
                  header: 'Commodity',
                  accessor: (result) => (
                    <div className="table-stack-cell">
                      <div className="table-stack-primary">{result.commodity_name || '-'}</div>
                      <div className="table-stack-secondary">{result.unit || '-'}</div>
                    </div>
                  ),
                },
                {
                  header: 'Price',
                  accessor: (result) => <span className="table-metric-pill total">{formatRupiah(result.price)}</span>,
                  className: 'table-metric-cell',
                },
                { header: 'Source', accessor: (result) => renderSource(result.source_url), className: 'wrap-text' },
                {
                  header: 'Scraped At',
                  accessor: (result) => (
                    <div className="table-stack-cell">
                      <div className="table-stack-primary">{new Date(result.scraped_at).toLocaleDateString('en-GB')}</div>
                      <div className="table-stack-secondary">{new Date(result.scraped_at).toLocaleTimeString('en-GB')}</div>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          <Pagination
            page={resultPage}
            totalPages={resultTotalPages}
            totalData={resultTotalData}
            limit={resultLimit}
            onPageChange={setResultPage}
            onLimitChange={(next) => {
              setResultLimit(next)
              setResultPage(1)
            }}
            disabled={loadingResults}
          />
        </>
      )}
    </div>
  )
}
