import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

type PriceListProps = {
  canImport: boolean
  canList: boolean
  canScrape: boolean
  formatRupiah: (value: number) => string
  loadingPrices: boolean
  navigate: (path: string, options?: any) => void
  onRemovePrice: (id: string) => Promise<void>
  priceLimit: number
  pricePage: number
  priceSearch: string
  priceTotalData: number
  priceTotalPages: number
  prices: any[]
  setPriceLimit: React.Dispatch<React.SetStateAction<number>>
  setPricePage: React.Dispatch<React.SetStateAction<number>>
  setPriceSearch: React.Dispatch<React.SetStateAction<string>>
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>
}

export default function PriceList({
  canImport,
  canList,
  canScrape,
  formatRupiah,
  loadingPrices,
  navigate,
  onRemovePrice,
  priceLimit,
  pricePage,
  priceSearch,
  priceTotalData,
  priceTotalPages,
  prices,
  setPriceLimit,
  setPricePage,
  setPriceSearch,
  setShowModal,
}: PriceListProps) {
  return (
    <>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Commodity Prices</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canScrape && (
            <button className="btn" onClick={() => setShowModal(true)}>
              Run Scrape
            </button>
          )}
          {canImport && (
            <button className="btn-ghost" onClick={() => navigate('/prices/create')}>
              Manual Entry
            </button>
          )}
        </div>
      </div>

      {!canList && <div className="page"><div className="alert">You do not have permission to view prices.</div></div>}

      {canList && (
        <div className="page">
          <div className="card">
            <div className="filter-panel">
              <div className="filter-panel-head">
                <div>
                  <div className="filter-panel-title">Search Prices</div>
                  <div className="filter-panel-subtitle">Cari harga komoditas berdasarkan nama komoditas atau sumber data.</div>
                </div>
              </div>
              <div className="filter-grid">
                <div className="filter-field">
                  <label>Keyword</label>
                  <input value={priceSearch} onChange={(e) => setPriceSearch(e.target.value)} placeholder="Search commodity/source" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Price List</h3>
              <small style={{ color: '#64748b' }}>Price data with pagination</small>
            </div>

            {loadingPrices ? (
              <div>Loading...</div>
            ) : (
              <>
                <Table
                  data={prices}
                  keyField="id"
                  onRowClick={(price) => navigate(`/prices/${price.id}`, { state: { price } })}
                  emptyMessage="No prices found."
                  columns={[
                    {
                      header: 'Commodity',
                      accessor: (price) => price.commodity?.name || 'Commodity',
                    },
                    {
                      header: 'Price',
                      accessor: (price) => `${formatRupiah(price.price)}${price.commodity?.unit ? ` / ${price.commodity?.unit}` : ''}`,
                    },
                    {
                      header: 'Source',
                      accessor: (price) => price.source_url || '-',
                      style: { maxWidth: 220, wordBreak: 'break-word' },
                    },
                    {
                      header: 'Collected At',
                      accessor: (price) => price.collected_at ? new Date(price.collected_at).toLocaleString('en-GB') : '-',
                    },
                    {
                      header: 'Action',
                      accessor: (price) => (
                        <ActionMenu
                          items={[
                            {
                              key: 'view',
                              label: 'View',
                              onClick: () => navigate(`/prices/${price.id}`, { state: { price } }),
                            },
                            {
                              key: 'delete',
                              label: 'Delete',
                              onClick: () => void onRemovePrice(price.id),
                              hidden: !canScrape,
                              danger: true,
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
                  page={pricePage}
                  totalPages={priceTotalPages}
                  totalData={priceTotalData}
                  limit={priceLimit}
                  onPageChange={setPricePage}
                  onLimitChange={(next) => {
                    setPriceLimit(next)
                    setPricePage(1)
                  }}
                  disabled={loadingPrices}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
