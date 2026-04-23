import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
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
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Scrape URLs</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCreate && <button className="btn" onClick={() => navigate('/scrape-sources/create')}>Create Source</button>}
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div className="compact-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, URL, or category" aria-label="Search scrape source" />
            </div>

            <div className="compact-filter-item narrow">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by source type">
                <option value="">All Types</option>
                <option value="prices">Commodity Prices</option>
                <option value="news">News Portal</option>
              </select>
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
                data={sources}
                keyField="id"
                onRowClick={(source: any) => navigate(`/scrape-sources/${source.id}`, { state: { source } })}
                emptyMessage="No sources yet."
                columns={[
                  { header: 'Name', accessor: 'name' },
                  { header: 'URL', accessor: 'url', style: { maxWidth: 300, wordBreak: 'break-word' } },
                  { header: 'Type', accessor: (source: any) => source.type || '-' },
                  { header: 'Active', accessor: (source: any) => source.is_active ? 'Yes' : 'No' },
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
                  },
                ]}
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
