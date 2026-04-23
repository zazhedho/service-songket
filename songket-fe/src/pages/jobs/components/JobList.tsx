import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

type JobListProps = {
  areaLabel: (area: any) => string
  canCreate: boolean
  canDelete: boolean
  canList: boolean
  canUpdate: boolean
  formatDate: (value?: string) => string
  formatRupiah: (value: number) => string
  items: any[]
  limit: number
  navigate: (path: string, options?: any) => void
  page: number
  remove: (item: any) => Promise<void>
  search: string
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  totalData: number
  totalPages: number
}

export default function JobList({
  areaLabel,
  canCreate,
  canDelete,
  canList,
  canUpdate,
  formatDate,
  formatRupiah,
  items,
  limit,
  navigate,
  page,
  remove,
  search,
  setLimit,
  setPage,
  setSearch,
  totalData,
  totalPages,
}: JobListProps) {
  const itemsWithArea = items.filter((item) => Array.isArray(item?.area_net_income) && item.area_net_income.length > 0).length
  const uniqueAreas = new Set(
    items.flatMap((item) =>
      Array.isArray(item?.area_net_income)
        ? item.area_net_income.map((area: any) => areaLabel(area)).filter(Boolean)
        : [],
    ),
  ).size

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Jobs & Net Income</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Manage job profiles and their net income area coverage.
          </div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/jobs/create')}>Create Job & Net Income</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="entity-list-summary">
            <div className="entity-summary-card">
              <div className="entity-summary-label">Total Jobs</div>
              <div className="entity-summary-value">{totalData || items.length}</div>
              <div className="entity-summary-note">Current result count for job data.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Area Coverage</div>
              <div className="entity-summary-value">{itemsWithArea}</div>
              <div className="entity-summary-note">Jobs with at least one configured area.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Unique Areas</div>
              <div className="entity-summary-value">{uniqueAreas}</div>
              <div className="entity-summary-note">Distinct area labels in the current result set.</div>
            </div>
          </div>

          <div className="compact-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job name" aria-label="Search job name" />
            </div>
            <div className="compact-filter-action">
              <button
                className="btn-ghost"
                onClick={() => setSearch('')}
                disabled={!search.trim()}
                title="Clear all filters"
                aria-label="Clear all filters"
                style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
              >
                ×
              </button>
            </div>
          </div>

          <h3>Data List</h3>
          {!canList && <div className="alert">No permission to view data.</div>}
          {canList && (
            <>
              <Table
                className="job-list-table"
                data={items}
                keyField="id"
                onRowClick={(item) => navigate(`/jobs/${item.id}`, { state: { item } })}
                emptyMessage="No data available."
                columns={[
                  {
                    header: 'Job',
                    accessor: (item) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={item.name || '-'}>
                          {item.name || '-'}
                        </div>
                        <div className="entity-list-note">
                          {Array.isArray(item.area_net_income) && item.area_net_income.length > 0
                            ? `${item.area_net_income.length} configured area${item.area_net_income.length > 1 ? 's' : ''}`
                            : 'No configured areas'}
                        </div>
                      </div>
                    ),
                    className: 'job-list-col-job',
                    headerClassName: 'job-list-col-job',
                  },
                  {
                    header: 'Net Income',
                    accessor: (item) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title">{formatRupiah(Number(item.net_income || 0))}</div>
                      </div>
                    ),
                    className: 'job-list-col-income',
                    headerClassName: 'job-list-col-income',
                  },
                  {
                    header: 'Area Coverage',
                    accessor: (item) => {
                      const coverage = item.area_net_income.length
                        ? item.area_net_income.map((area: any) => areaLabel(area)).join(', ')
                        : '-'
                      return (
                        <div className="entity-list-cell">
                          <div className="entity-list-title table-text-ellipsis" title={coverage}>{coverage}</div>
                        </div>
                      )
                    },
                    className: 'job-list-col-area',
                    headerClassName: 'job-list-col-area',
                  },
                  {
                    header: 'Updated',
                    accessor: (item) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title">{formatDate(item.updated_at)}</div>
                      </div>
                    ),
                    className: 'job-list-col-updated',
                    headerClassName: 'job-list-col-updated',
                  },
                  {
                    header: 'Action',
                    accessor: (item) => (
                      <ActionMenu
                        items={[
                          { key: 'view', label: 'View', onClick: () => navigate(`/jobs/${item.id}`, { state: { item } }) },
                          { key: 'edit', label: 'Edit', onClick: () => navigate(`/jobs/${item.id}/edit`, { state: { item } }), hidden: !canUpdate },
                          { key: 'delete', label: 'Delete', onClick: () => void remove(item), hidden: !canDelete, danger: true },
                        ]}
                      />
                    ),
                    className: 'action-cell',
                    ignoreRowClick: true,
                    headerClassName: 'job-list-col-action',
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={5}>
                      <div className="entity-empty-state">
                        <div className="entity-empty-icon">
                          <i className="bi bi-briefcase"></i>
                        </div>
                        <div className="entity-empty-title">No jobs found</div>
                        <div className="entity-empty-note">Try another keyword or create a new job entry to get started.</div>
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
