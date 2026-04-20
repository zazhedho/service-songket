import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'

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
          <div style={{ marginBottom: 10 }}>
            <label>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job name" />
          </div>

          <h3>Data List</h3>
          {!canList && <div className="alert">No permission to view data.</div>}
          {canList && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Job Name</th>
                    <th>Net Income</th>
                    <th>Area Coverage</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.job_id}>
                      <td>{item.name || '-'}</td>
                      <td>{formatRupiah(Number(item.net_income || 0))}</td>
                      <td>{item.area_net_income.length ? item.area_net_income.map((area: any) => areaLabel(area)).join(', ') : '-'}</td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td className="action-cell">
                        <ActionMenu
                          items={[
                            { key: 'view', label: 'View', onClick: () => navigate(`/jobs/${item.job_id}`, { state: { item } }) },
                            { key: 'edit', label: 'Edit', onClick: () => navigate(`/jobs/${item.job_id}/edit`, { state: { item } }), hidden: !canUpdate },
                            { key: 'delete', label: 'Delete', onClick: () => void remove(item), hidden: !canDelete, danger: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5}>No data available.</td>
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
