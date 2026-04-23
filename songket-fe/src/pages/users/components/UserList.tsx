import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

type UserListProps = {
  canCreate: boolean
  canDelete: boolean
  canList: boolean
  canUpdate: boolean
  limit: number
  navigate: (path: string, options?: any) => void
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
  onRemove: (id: string) => Promise<void>
  page: number
  search: string
  setSearch: React.Dispatch<React.SetStateAction<string>>
  totalData: number
  totalPages: number
  users: any[]
}

export default function UserList({
  canCreate,
  canDelete,
  canList,
  canUpdate,
  limit,
  navigate,
  onLimitChange,
  onPageChange,
  onRemove,
  page,
  search,
  setSearch,
  totalData,
  totalPages,
  users,
}: UserListProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>User Management</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCreate && <button className="btn" onClick={() => navigate('/users/create')}>Create User</button>}
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div className="compact-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, or phone" aria-label="Search user" />
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

          <h3>User List</h3>
          {!canList && <div className="alert">You do not have permission to view data.</div>}
          {canList && (
            <>
              <Table
                data={users}
                keyField="id"
                onRowClick={(user) => navigate(`/users/${user.id}`, { state: { user } })}
                emptyMessage="No users found."
                columns={[
                  { header: 'Name', accessor: 'name' },
                  { header: 'Email', accessor: 'email' },
                  {
                    header: 'Role',
                    accessor: (user) => <span className="badge pending">{user.role}</span>,
                  },
                  {
                    header: 'Action',
                    accessor: (user) => (
                      <ActionMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`/users/${user.id}`, { state: { user } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`/users/${user.id}/edit`, { state: { user } }),
                            hidden: !canUpdate,
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            onClick: () => void onRemove(user.id),
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
                onPageChange={onPageChange}
                onLimitChange={(next) => {
                  onLimitChange(next)
                  onPageChange(1)
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
