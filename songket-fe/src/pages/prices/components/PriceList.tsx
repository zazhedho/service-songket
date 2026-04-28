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
  const collectedParts = (value?: string) => {
    if (!value) return { date: '-', time: 'No timestamp' }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return { date: '-', time: 'No timestamp' }
    return {
      date: parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  const commodityCount = new Set(prices.map((price) => String(price?.commodity?.name || '').trim()).filter(Boolean)).size
  const sourceCount = new Set(
    prices.map((price) => sourceHost(price?.source_url || '')).filter((value) => value && value !== '-'),
  ).size

  return (
    <div className="price-list-shell">
      <div className="header price-header">
        <div className="price-heading">
          <div className="price-eyebrow">Commodity Intelligence</div>
          <div className="price-title">Commodity Prices</div>
          <div className="price-subtitle">Review collected commodity prices and their source links.</div>
        </div>

        <div className="price-actions">
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
        <div className="page price-page">
          <div className="card price-card">
            <div className="entity-list-summary">
              <div className="entity-summary-card price-summary-card tone-blue">
                <div className="entity-summary-label">Total Prices</div>
                <div className="entity-summary-value">{priceTotalData || prices.length}</div>
                <div className="entity-summary-note">Current result count for collected price data.</div>
              </div>
              <div className="entity-summary-card price-summary-card tone-emerald">
                <div className="entity-summary-label">Commodities</div>
                <div className="entity-summary-value">{commodityCount}</div>
                <div className="entity-summary-note">Distinct commodities in the current result set.</div>
              </div>
              <div className="entity-summary-card price-summary-card tone-cyan">
                <div className="entity-summary-label">Sources</div>
                <div className="entity-summary-value">{sourceCount}</div>
                <div className="entity-summary-note">Distinct source domains in the current result set.</div>
              </div>
            </div>

            <div className="compact-filter-toolbar price-filter-toolbar">
              <div className="compact-filter-item grow-2">
                <input value={priceSearch} onChange={(e) => setPriceSearch(e.target.value)} placeholder="Search commodity or source" aria-label="Search prices" />
              </div>
              <div className="compact-filter-action">
                <button
                  className="btn-ghost price-clear-btn"
                  onClick={() => setPriceSearch('')}
                  disabled={!priceSearch.trim()}
                  title="Clear all filters"
                  aria-label="Clear all filters"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="price-section-head">
              <h3>Price List</h3>
              <span>{priceSearch.trim() ? 'Filtered' : 'All Prices'}</span>
            </div>

            {loadingPrices ? (
              <div className="table-state-panel loading">
                <div className="table-state-icon">...</div>
                <div>
                  <div className="table-state-title">Loading prices</div>
                  <div className="table-state-note">Fetching latest commodity price rows.</div>
                </div>
              </div>
            ) : (
              <>
                <Table
                  className="price-list-table metric-table"
                  data={prices}
                  keyField="id"
                  onRowClick={(price) => navigate(`/prices/${price.id}`, { state: { price } })}
                  emptyMessage="No prices found."
                  columns={[
                    {
                      header: 'Commodity',
                      accessor: (price) => (
                        <div className="table-stack-cell">
                          <div className="table-stack-primary" title={price.commodity?.name || 'Commodity'}>
                            {price.commodity?.name || 'Commodity'}
                          </div>
                          <div className="table-stack-secondary">
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
                        <div className="table-metric-cell">
                          <span className="table-metric-pill total">{formatRupiah(price.price)}</span>
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
                          <div className="table-stack-cell">
                            {url && url !== '-' ? (
                              <a className="table-url-link table-text-ellipsis" href={url} target="_blank" rel="noreferrer" title={url}>
                                {host}
                              </a>
                            ) : (
                              <div className="table-stack-primary">-</div>
                            )}
                            <div className="table-stack-tertiary" title={url}>{url && url !== '-' ? url : 'Source URL not available'}</div>
                          </div>
                        )
                      },
                      className: 'price-list-col-source',
                      headerClassName: 'price-list-col-source',
                    },
                    {
                      header: 'Collected At',
                      accessor: (price) => {
                        const collected = collectedParts(price.collected_at)
                        return (
                          <div className="table-stack-cell">
                            <div className="table-stack-primary">{collected.date}</div>
                            <div className="table-stack-tertiary">{collected.time}</div>
                          </div>
                        )
                      },
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
    </div>
  )
}
