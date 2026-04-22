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
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Jobs & Net Income</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/jobs/create')}>Create Job & Net Income</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="filter-panel">
            <div className="filter-panel-head">
              <div>
                <div className="filter-panel-title">Search Job</div>
                <div className="filter-panel-subtitle">Cari data pekerjaan dan net income berdasarkan nama job.</div>
              </div>
            </div>
            <div className="filter-grid">
              <div className="filter-field">
                <label>Keyword</label>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job name" />
              </div>
            </div>
          </div>

          <h3>Data List</h3>
          {!canList && <div className="alert">No permission to view data.</div>}
          {canList && (
            <>
              <Table
                data={items}
                keyField="job_id"
                onRowClick={(item) => navigate(`/jobs/${item.job_id}`, { state: { item } })}
                emptyMessage="No data available."
                columns={[
                  { header: 'Job Name', accessor: (item) => item.name || '-' },
                  { header: 'Net Income', accessor: (item) => formatRupiah(Number(item.net_income || 0)) },
                  {
                    header: 'Area Coverage',
                    accessor: (item) => item.area_net_income.length ? item.area_net_income.map((area: any) => areaLabel(area)).join(', ') : '-',
                  },
                  { header: 'Updated', accessor: (item) => formatDate(item.updated_at) },
                  {
                    header: 'Action',
                    accessor: (item) => (
                      <ActionMenu
                        items={[
                          { key: 'view', label: 'View', onClick: () => navigate(`/jobs/${item.job_id}`, { state: { item } }) },
                          { key: 'edit', label: 'Edit', onClick: () => navigate(`/jobs/${item.job_id}/edit`, { state: { item } }), hidden: !canUpdate },
                          { key: 'delete', label: 'Delete', onClick: () => void remove(item), hidden: !canDelete, danger: true },
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
