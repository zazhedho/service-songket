import Pagination from '../../../components/common/Pagination'

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
        <h3>Hasil Scrape (Job {selectedJob.slice(0, 6)})</h3>
        {canImport && (
          <button className="btn" onClick={() => void importSelected()} disabled={selectedResultIds.length === 0}>
            Import pilihan ({selectedResultIds.length})
          </button>
        )}
      </div>

      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <label>Search Hasil Scrape</label>
        <input value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} placeholder="Cari komoditas/sumber" />
      </div>

      {loadingResults ? (
        <div>Memuat hasil...</div>
      ) : results.length === 0 ? (
        <div className="muted">Belum ada hasil untuk job ini.</div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Pilih</th>
                <th>Komoditas</th>
                <th>Harga</th>
                <th>Sumber</th>
                <th>Waktu Scrape</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedResultIds.includes(result.id)}
                      onChange={() => toggleResult(result.id)}
                    />
                  </td>
                  <td>{result.commodity_name}</td>
                  <td>{formatRupiah(result.price)} {result.unit ? `/ ${result.unit}` : ''}</td>
                  <td style={{ maxWidth: 220, wordBreak: 'break-word' }}>{result.source_url}</td>
                  <td>{new Date(result.scraped_at).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>

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
