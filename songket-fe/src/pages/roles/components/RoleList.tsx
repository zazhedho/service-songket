import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

type RoleListProps = {
  canCreate: boolean
  canDelete: boolean
  canList: boolean
  canUpdate: boolean
  navigate: (path: string, options?: any) => void
  page: number
  remove: (id: string) => Promise<void>
  roles: any[]
  search: string
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  totalData: number
  totalPages: number
  limit: number
}

export default function RoleList({
  canCreate,
  canDelete,
  canList,
  canUpdate,
  navigate,
  page,
  remove,
  roles,
  search,
  setLimit,
  setPage,
  setSearch,
  totalData,
  totalPages,
  limit,
}: RoleListProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Roles & Access</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/roles/create')}>Create Role</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="filter-panel">
            <div className="filter-panel-head">
              <div>
                <div className="filter-panel-title">Search Role</div>
                <div className="filter-panel-subtitle">Cari role berdasarkan nama internal atau display name.</div>
              </div>
            </div>
            <div className="filter-grid">
              <div className="filter-field">
                <label>Keyword</label>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/display name" />
              </div>
            </div>
          </div>

          <h3>Role List</h3>
          {!canList && <div className="alert">You do not have permission to view roles.</div>}
          {canList && (
            <>
              <Table
                data={roles}
                keyField="id"
                onRowClick={(roleItem: any) => navigate(`/roles/${roleItem.id}`, { state: { role: roleItem } })}
                emptyMessage="No roles found."
                columns={[
                  { header: 'Name', accessor: 'name' },
                  { header: 'Display Name', accessor: 'display_name' },
                  {
                    header: 'Action',
                    accessor: (roleItem: any) => (
                      <ActionMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`/roles/${roleItem.id}`, { state: { role: roleItem } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`/roles/${roleItem.id}/edit`, { state: { role: roleItem } }),
                            hidden: !canUpdate,
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            onClick: () => void remove(roleItem.id),
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
