import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'

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
          <div style={{ marginBottom: 10 }}>
            <label>Search Source</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/url/category" />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Filter Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All</option>
              <option value="prices">Commodity Prices</option>
              <option value="news">News Portal</option>
            </select>
          </div>

          <h3>Source List</h3>
          {!canList && <div className="alert">No permission to view scrape sources.</div>}
          {canList && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>URL</th>
                    <th>Type</th>
                    <th>Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source: any) => (
                    <tr key={source.id}>
                      <td>{source.name}</td>
                      <td style={{ maxWidth: 300, wordBreak: 'break-word' }}>{source.url}</td>
                      <td>{source.type || '-'}</td>
                      <td>{source.is_active ? 'Yes' : 'No'}</td>
                      <td className="action-cell">
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
                      </td>
                    </tr>
                  ))}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan={5}>No sources yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>

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
