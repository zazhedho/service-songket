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
  const rolesCount = new Set(users.map((user) => String(user?.role || '').trim()).filter(Boolean)).size
  const usersWithPhone = users.filter((user) => String(user?.phone || '').trim()).length

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>User Management</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Manage user accounts and their access roles.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCreate && <button className="btn" onClick={() => navigate('/users/create')}>Create User</button>}
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div className="user-list-summary">
            <div className="user-summary-card">
              <div className="user-summary-label">Total Users</div>
              <div className="user-summary-value">{totalData || users.length}</div>
              <div className="user-summary-note">Current result count for user accounts.</div>
            </div>
            <div className="user-summary-card">
              <div className="user-summary-label">Role Groups</div>
              <div className="user-summary-value">{rolesCount}</div>
              <div className="user-summary-note">Distinct role assignments in this result set.</div>
            </div>
            <div className="user-summary-card">
              <div className="user-summary-label">Phone Ready</div>
              <div className="user-summary-value">{usersWithPhone}</div>
              <div className="user-summary-note">Users with phone numbers filled in.</div>
            </div>
          </div>

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
                className="user-list-table"
                data={users}
                keyField="id"
                onRowClick={(user) => navigate(`/users/${user.id}`, { state: { user } })}
                emptyMessage="No users found."
                columns={[
                  {
                    header: 'User',
                    accessor: (user) => (
                      <div className="user-list-cell">
                        <div className="user-list-title table-text-ellipsis" title={user.name || '-'}>
                          {user.name || '-'}
                        </div>
                      </div>
                    ),
                    className: 'user-list-col-user',
                    headerClassName: 'user-list-col-user',
                  },
                  {
                    header: 'Phone',
                    accessor: (user) => (
                      <div className="user-list-cell">
                        <div className="user-list-title table-text-ellipsis" title={user.phone || '-'}>
                          {user.phone || '-'}
                        </div>
                      </div>
                    ),
                    className: 'user-list-col-phone',
                    headerClassName: 'user-list-col-phone',
                  },
                  {
                    header: 'Email',
                    accessor: (user) => (
                      <div className="user-list-cell">
                        <div className="user-list-title table-text-ellipsis" title={user.email || '-'}>
                          {user.email || '-'}
                        </div>
                      </div>
                    ),
                    className: 'user-list-col-email',
                    headerClassName: 'user-list-col-email',
                  },
                  {
                    header: 'Role',
                    accessor: (user) => (
                      <div className="user-list-cell">
                        <div className="user-list-role-row">
                          <span className="badge pending">{user.role || '-'}</span>
                        </div>
                      </div>
                    ),
                    className: 'user-list-col-role',
                    headerClassName: 'user-list-col-role',
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
                    headerClassName: 'user-list-col-action',
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={5}>
                      <div className="user-empty-state">
                        <div className="user-empty-icon">
                          <i className="bi bi-people"></i>
                        </div>
                        <div className="user-empty-title">No users found</div>
                        <div className="user-empty-note">Try another keyword or create a new user account to get started.</div>
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
