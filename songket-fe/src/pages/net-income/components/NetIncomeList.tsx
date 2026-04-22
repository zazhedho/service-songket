import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

type NetIncomeListProps = {
  areaLabel: (area: any) => string
  canCreate: boolean
  canDelete: boolean
  canList: boolean
  canUpdate: boolean
  formatDate: (value?: string) => string
  formatRupiah: (value: number) => string
  items: any[]
  jobName: (id: string, fallback?: string) => string
  limit: number
  navigate: (path: string, options?: any) => void
  page: number
  remove: (id: string) => Promise<void>
  search: string
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  totalData: number
  totalPages: number
}

export default function NetIncomeList({
  areaLabel,
  canCreate,
  canDelete,
  canList,
  canUpdate,
  formatDate,
  formatRupiah,
  items,
  jobName,
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
}: NetIncomeListProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Net Income</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/net-income/create')}>Create Net Income</button>}
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search Net Income</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job name" />
          </div>

          <h3>Net Income List</h3>
          {!canList && <div className="alert">No permission to view net income data.</div>}
          {canList && (
            <>
              <Table
                data={items}
                keyField="id"
                onRowClick={(item) => navigate(`/net-income/${item.id}`, { state: { item } })}
                emptyMessage="No net income data yet."
                columns={[
                  { header: 'Job', accessor: (item) => jobName(item.job_id, item.job_name) },
                  { header: 'Net Income', accessor: (item) => formatRupiah(Number(item.net_income || 0)) },
                  {
                    header: 'Area',
                    accessor: (item) => item.area_net_income.length ? item.area_net_income.map((area: any) => areaLabel(area)).join(', ') : '-',
                  },
                  { header: 'Updated', accessor: (item) => formatDate(item.updated_at) },
                  {
                    header: 'Action',
                    accessor: (item) => (
                      <ActionMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`/net-income/${item.id}`, { state: { item } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`/net-income/${item.id}/edit`, { state: { item } }),
                            hidden: !canUpdate,
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            onClick: () => void remove(item.id),
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
