import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import SearchableSelect from '../../../components/common/SearchableSelect'
import Table from '../../../components/common/Table'

type ScrapeSourceListProps = {
  canCreate: boolean
  canDelete: boolean
  canList: boolean
  canUpdate: boolean
  limit: number
  navigate: (path: string, options?: any) => void
  page: number
  remove: (id: string) => Promise<void>
  search: string
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  setTypeFilter: React.Dispatch<React.SetStateAction<string>>
  sources: any[]
  totalData: number
  totalPages: number
  typeFilter: string
}

export default function ScrapeSourceList({
  canCreate,
  canDelete,
  canList,
  canUpdate,
  limit,
  navigate,
  page,
  remove,
  search,
  setLimit,
  setPage,
  setSearch,
  setTypeFilter,
  sources,
  totalData,
  totalPages,
  typeFilter,
}: ScrapeSourceListProps) {
  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'prices', label: 'Commodity Prices' },
    { value: 'news', label: 'News Portal' },
  ]
  const activeCount = sources.filter((source) => Boolean(source?.is_active)).length
  const typeCount = new Set(sources.map((source) => String(source?.type || '').trim()).filter(Boolean)).size
  const sourceTypeLabel = (value: string) => typeOptions.find((item) => item.value === value)?.label || value || '-'
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
    <div className="scrape-source-shell">
      <div className="header scrape-source-header">
        <div className="scrape-source-heading">
          <div className="scrape-source-eyebrow">Source Registry</div>
          <div className="scrape-source-title">Scrape URLs</div>
          <div className="scrape-source-subtitle">Manage scraping endpoints for commodity prices and news feeds.</div>
        </div>
        <div className="scrape-source-actions">
          {canCreate && <button className="btn" onClick={() => navigate('/scrape-sources/create')}>Create Source</button>}
        </div>
      </div>

      <div className="page scrape-source-page">
        <div className="card scrape-source-card">
          <div className="entity-list-summary">
            <div className="entity-summary-card scrape-summary-card tone-blue">
              <div className="entity-summary-label">Total Sources</div>
              <div className="entity-summary-value">{totalData || sources.length}</div>
              <div className="entity-summary-note">Current result count for scrape source data.</div>
            </div>
            <div className="entity-summary-card scrape-summary-card tone-emerald">
              <div className="entity-summary-label">Active Sources</div>
              <div className="entity-summary-value">{activeCount}</div>
              <div className="entity-summary-note">Sources currently enabled for use.</div>
            </div>
            <div className="entity-summary-card scrape-summary-card tone-cyan">
              <div className="entity-summary-label">Type Groups</div>
              <div className="entity-summary-value">{typeCount}</div>
              <div className="entity-summary-note">Distinct source types in the current result set.</div>
            </div>
          </div>

          <div className="compact-filter-toolbar scrape-source-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, URL, or category" aria-label="Search scrape source" />
            </div>

            <div className="compact-filter-item narrow">
              <SearchableSelect
                value={typeFilter}
                onChange={setTypeFilter}
                options={typeOptions}
                placeholder="All Types"
                searchPlaceholder="Search source type..."
              />
            </div>

            <div className="compact-filter-action">
              <button
                className="btn-ghost scrape-source-clear-btn"
                onClick={() => {
                  setSearch('')
                  setTypeFilter('')
                }}
                disabled={!search.trim() && !typeFilter}
                title="Clear all filters"
                aria-label="Clear all filters"
              >
                ×
              </button>
            </div>
          </div>

          <div className="scrape-source-section-head">
            <h3>Source List</h3>
            <span>{sourceTypeLabel(typeFilter) || 'All Types'}</span>
          </div>
          {!canList && <div className="alert">No permission to view scrape sources.</div>}
          {canList && (
            <>
              <Table
                className="scrape-source-list-table metric-table"
                data={sources}
                keyField="id"
                onRowClick={(source: any) => navigate(`/scrape-sources/${source.id}`, { state: { source } })}
                emptyMessage="No sources yet."
                columns={[
                  {
                    header: 'Source',
                    accessor: (source: any) => (
                      <div className="table-stack-cell">
                        <div className="table-stack-primary" title={source.name || '-'}>
                          {source.name || '-'}
                        </div>
                        <div className="table-stack-secondary" title={source.category || '-'}>
                          {source.category || 'No category'}
                        </div>
                      </div>
                    ),
                    className: 'scrape-source-col-source',
                    headerClassName: 'scrape-source-col-source',
                  },
                  {
                    header: 'URL',
                    accessor: (source: any) => {
                      const url = String(source.url || '').trim()
                      const host = sourceHost(url)
                      return (
                        <div className="table-stack-cell">
                          {url ? (
                            <a className="table-url-link table-text-ellipsis" href={url} target="_blank" rel="noreferrer" title={url}>
                              {host}
                            </a>
                          ) : (
                            <div className="table-stack-primary">-</div>
                          )}
                          <div className="table-stack-tertiary" title={url || '-'}>
                            {url || 'URL not available'}
                          </div>
                        </div>
                      )
                    },
                    className: 'scrape-source-col-url',
                    headerClassName: 'scrape-source-col-url',
                  },
                  {
                    header: 'Type',
                    accessor: (source: any) => (
                      <div className="table-metric-cell">
                        <span className="table-metric-pill total" title={sourceTypeLabel(source.type)}>
                          {sourceTypeLabel(source.type)}
                        </span>
                      </div>
                    ),
                    className: 'scrape-source-col-type',
                    headerClassName: 'scrape-source-col-type',
                  },
                  {
                    header: 'Status',
                    accessor: (source: any) => (
                      <div className="entity-list-cell">
                        <div>
                          <span className={`badge ${source.is_active ? 'success' : 'reject'}`}>
                            {source.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ),
                    className: 'scrape-source-col-status',
                    headerClassName: 'scrape-source-col-status',
                  },
                  {
                    header: 'Action',
                    accessor: (source: any) => (
                      <ActionMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`/scrape-sources/${source.id}`, { state: { source } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`/scrape-sources/${source.id}/edit`, { state: { source } }),
                            hidden: !canUpdate,
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            onClick: () => void remove(source.id),
                            hidden: !canDelete,
                            danger: true,
                          },
                        ]}
                      />
                    ),
                    className: 'action-cell',
                    ignoreRowClick: true,
                    headerClassName: 'scrape-source-col-action',
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={5}>
                      <div className="entity-empty-state">
                        <div className="entity-empty-icon">
                          <i className="bi bi-link-45deg"></i>
                        </div>
                        <div className="entity-empty-title">No scrape sources found</div>
                        <div className="entity-empty-note">Try another keyword or create a new source entry to get started.</div>
                      </div>
                    </td>
                  </tr>
                }
              />

              <Pagination
                page={page}
                totalPages={totalPages}
                totalData={totalData}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next)
                  setPage(1)
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
