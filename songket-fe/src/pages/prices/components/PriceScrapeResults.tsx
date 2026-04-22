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
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Scrape Results (Job {selectedJob.slice(0, 6)})</h3>
        {canImport && (
          <button className="btn" onClick={() => void importSelected()} disabled={selectedResultIds.length === 0}>
            Import Selected ({selectedResultIds.length})
          </button>
        )}
      </div>

      <div className="filter-panel" style={{ marginTop: 10, marginBottom: 10 }}>
        <div className="filter-panel-head">
          <div>
            <div className="filter-panel-title">Search Scrape Results</div>
            <div className="filter-panel-subtitle">Cari hasil scrape berdasarkan komoditas atau sumber sebelum import.</div>
          </div>
        </div>
        <div className="filter-grid">
          <div className="filter-field">
            <label>Keyword</label>
            <input value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} placeholder="Search commodity/source" />
          </div>
        </div>
      </div>

      {loadingResults ? (
        <div>Loading results...</div>
      ) : results.length === 0 ? (
        <div className="muted">No results found for this job.</div>
      ) : (
        <>
          <Table
            data={results}
            keyField="id"
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
              },
              { header: 'Commodity', accessor: 'commodity_name' },
              { header: 'Price', accessor: (result) => `${formatRupiah(result.price)}${result.unit ? ` / ${result.unit}` : ''}` },
              { header: 'Source', accessor: 'source_url', style: { maxWidth: 220, wordBreak: 'break-word' } },
              { header: 'Scraped At', accessor: (result) => new Date(result.scraped_at).toLocaleString('en-GB') },
            ]}
          />

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
