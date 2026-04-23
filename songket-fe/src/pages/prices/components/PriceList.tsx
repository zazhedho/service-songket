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
  const sourceHost = (value: string) => {
    const text = String(value || '').trim()
    if (!text) return '-'
    try {
      return new URL(text).hostname.replace(/^www\./, '') || text
    } catch {
      return text
    }
  }

  const commodityCount = new Set(prices.map((price) => String(price?.commodity?.name || '').trim()).filter(Boolean)).size
  const sourceCount = new Set(
    prices.map((price) => sourceHost(price?.source_url || '')).filter((value) => value && value !== '-'),
  ).size

  return (
    <>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Commodity Prices</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Review collected commodity prices and their source links.
          </div>
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
            <div className="entity-list-summary">
              <div className="entity-summary-card">
                <div className="entity-summary-label">Total Prices</div>
                <div className="entity-summary-value">{priceTotalData || prices.length}</div>
                <div className="entity-summary-note">Current result count for collected price data.</div>
              </div>
              <div className="entity-summary-card">
                <div className="entity-summary-label">Commodities</div>
                <div className="entity-summary-value">{commodityCount}</div>
                <div className="entity-summary-note">Distinct commodities in the current result set.</div>
              </div>
              <div className="entity-summary-card">
                <div className="entity-summary-label">Sources</div>
                <div className="entity-summary-value">{sourceCount}</div>
                <div className="entity-summary-note">Distinct source domains in the current result set.</div>
              </div>
            </div>

            <div className="compact-filter-toolbar">
              <div className="compact-filter-item grow-2">
                <input value={priceSearch} onChange={(e) => setPriceSearch(e.target.value)} placeholder="Search commodity or source" aria-label="Search prices" />
              </div>
              <div className="compact-filter-action">
                <button
                  className="btn-ghost"
                  onClick={() => setPriceSearch('')}
                  disabled={!priceSearch.trim()}
                  title="Clear all filters"
                  aria-label="Clear all filters"
                  style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
                >
                  ×
                </button>
              </div>
            </div>

            <h3>Price List</h3>

            {loadingPrices ? (
              <div>Loading...</div>
            ) : (
              <>
                <Table
                  className="price-list-table"
                  data={prices}
                  keyField="id"
                  onRowClick={(price) => navigate(`/prices/${price.id}`, { state: { price } })}
                  emptyMessage="No prices found."
                  columns={[
                    {
                      header: 'Commodity',
                      accessor: (price) => (
                        <div className="entity-list-cell">
                          <div className="entity-list-title table-text-ellipsis" title={price.commodity?.name || 'Commodity'}>
                            {price.commodity?.name || 'Commodity'}
                          </div>
                          <div className="entity-list-note">
                            {price.commodity?.unit ? `Unit: ${price.commodity.unit}` : 'Unit not available'}
                          </div>
                        </div>
                      ),
                      className: 'price-list-col-commodity',
                      headerClassName: 'price-list-col-commodity',
                    },
                    {
                      header: 'Price',
                      accessor: (price) => (
                        <div className="entity-list-cell">
                          <div className="entity-list-title">
                            {`${formatRupiah(price.price)}${price.commodity?.unit ? ` / ${price.commodity?.unit}` : ''}`}
                          </div>
                        </div>
                      ),
                      className: 'price-list-col-price',
                      headerClassName: 'price-list-col-price',
                    },
                    {
                      header: 'Source',
                      accessor: (price) => {
                        const url = String(price.source_url || '-')
                        const host = sourceHost(url)
                        return (
                          <div className="entity-list-cell">
                            <div className="entity-list-title table-text-ellipsis" title={host}>{host}</div>
                            <div className="entity-list-note table-text-ellipsis" title={url}>{url}</div>
                          </div>
                        )
                      },
                      className: 'price-list-col-source',
                      headerClassName: 'price-list-col-source',
                    },
                    {
                      header: 'Collected At',
                      accessor: (price) => (
                        <div className="entity-list-cell">
                          <div className="entity-list-title">
                            {price.collected_at ? new Date(price.collected_at).toLocaleString('en-GB') : '-'}
                          </div>
                        </div>
                      ),
                      className: 'price-list-col-collected',
                      headerClassName: 'price-list-col-collected',
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
                      headerClassName: 'price-list-col-action',
                      style: { width: '1%' },
                    },
                  ]}
                  emptyState={
                    <tr>
                      <td colSpan={5}>
                        <div className="entity-empty-state">
                          <div className="entity-empty-icon">
                            <i className="bi bi-tags"></i>
                          </div>
                          <div className="entity-empty-title">No prices found</div>
                          <div className="entity-empty-note">Try another keyword or add price data manually to get started.</div>
                        </div>
                      </td>
                    </tr>
                  }
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
