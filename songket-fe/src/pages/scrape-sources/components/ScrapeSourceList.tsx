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

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Scrape URLs</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Manage source endpoints used for scraping prices and news.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCreate && <button className="btn" onClick={() => navigate('/scrape-sources/create')}>Create Source</button>}
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div className="entity-list-summary">
            <div className="entity-summary-card">
              <div className="entity-summary-label">Total Sources</div>
              <div className="entity-summary-value">{totalData || sources.length}</div>
              <div className="entity-summary-note">Current result count for scrape source data.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Active Sources</div>
              <div className="entity-summary-value">{activeCount}</div>
              <div className="entity-summary-note">Sources currently enabled for use.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Type Groups</div>
              <div className="entity-summary-value">{typeCount}</div>
              <div className="entity-summary-note">Distinct source types in the current result set.</div>
            </div>
          </div>

          <div className="compact-filter-toolbar">
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
                className="btn-ghost"
                onClick={() => {
                  setSearch('')
                  setTypeFilter('')
                }}
                disabled={!search.trim() && !typeFilter}
                title="Clear all filters"
                aria-label="Clear all filters"
                style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
              >
                ×
              </button>
            </div>
          </div>

          <h3>Source List</h3>
          {!canList && <div className="alert">No permission to view scrape sources.</div>}
          {canList && (
            <>
              <Table
                className="scrape-source-list-table"
                data={sources}
                keyField="id"
                onRowClick={(source: any) => navigate(`/scrape-sources/${source.id}`, { state: { source } })}
                emptyMessage="No sources yet."
                columns={[
                  {
                    header: 'Source',
                    accessor: (source: any) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={source.name || '-'}>
                          {source.name || '-'}
                        </div>
                        <div className="entity-list-note table-text-ellipsis" title={source.category || '-'}>
                          {source.category || 'No category'}
                        </div>
                      </div>
                    ),
                    className: 'scrape-source-col-source',
                    headerClassName: 'scrape-source-col-source',
                  },
                  {
                    header: 'URL',
                    accessor: (source: any) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={source.url || '-'}>
                          {source.url || '-'}
                        </div>
                      </div>
                    ),
                    className: 'scrape-source-col-url',
                    headerClassName: 'scrape-source-col-url',
                  },
                  {
                    header: 'Type',
                    accessor: (source: any) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={sourceTypeLabel(source.type)}>
                          {sourceTypeLabel(source.type)}
                        </div>
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
