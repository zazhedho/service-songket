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
  const initials = (name: string) => {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return '?'
    return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('')
  }

  return (
    <div className="user-shell">
      <div className="header user-header">
        <div className="user-heading">
          <div className="user-eyebrow">Account Access</div>
          <div className="user-title">User Management</div>
          <div className="user-subtitle">Manage user accounts and assigned access roles.</div>
        </div>
        <div className="user-actions">
          {canCreate && <button className="btn" onClick={() => navigate('/users/create')}>Create User</button>}
        </div>
      </div>

      <div className="page user-page">
        <div className="card user-card">
          <div className="user-list-summary">
            <div className="user-summary-card tone-blue">
              <div className="user-summary-label">Total Users</div>
              <div className="user-summary-value">{totalData || users.length}</div>
              <div className="user-summary-note">Current result count for user accounts.</div>
            </div>
            <div className="user-summary-card tone-emerald">
              <div className="user-summary-label">Role Groups</div>
              <div className="user-summary-value">{rolesCount}</div>
              <div className="user-summary-note">Distinct role assignments in this result set.</div>
            </div>
            <div className="user-summary-card tone-amber">
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
                className="btn-ghost user-clear-btn"
                onClick={() => setSearch('')}
                disabled={!search.trim()}
                title="Clear all filters"
                aria-label="Clear all filters"
              >
                ×
              </button>
            </div>
          </div>

          <div className="user-section-head">
            <div>
              <h3>User List</h3>
              <span>Click a row to edit the selected account.</span>
            </div>
          </div>
          {!canList && <div className="alert">You do not have permission to view data.</div>}
          {canList && (
            <>
              <Table
                className="user-list-table metric-table"
                data={users}
                keyField="id"
                onRowClick={canUpdate ? (user) => navigate(`/users/${user.id}/edit`, { state: { user } }) : undefined}
                emptyMessage="No users found."
                columns={[
                  {
                    header: 'No',
                    accessor: (_user, index) => (
                      <span className="table-metric-pill total">{(page - 1) * limit + index + 1}</span>
                    ),
                    className: 'user-list-col-number table-metric-cell',
                    headerClassName: 'user-list-col-number',
                  },
                  {
                    header: 'User',
                    accessor: (user) => (
                      <div className="user-identity-cell">
                        <span className="user-identity-avatar">{initials(user.name)}</span>
                        <div className="table-stack-cell">
                          <div className="table-stack-primary" title={user.name || '-'}>
                            {user.name || '-'}
                          </div>
                        </div>
                      </div>
                    ),
                    className: 'user-list-col-user',
                    headerClassName: 'user-list-col-user',
                  },
                  {
                    header: 'Phone',
                    accessor: (user) => (
                      <div className="table-stack-cell">
                        <div className="table-stack-primary" title={user.phone || '-'}>
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
                      <div className="table-stack-cell">
                        {user.email ? (
                          <a className="table-url-link table-text-ellipsis" href={`mailto:${user.email}`} title={user.email}>
                            {user.email}
                          </a>
                        ) : (
                          <div className="table-stack-primary">-</div>
                        )}
                      </div>
                    ),
                    className: 'user-list-col-email',
                    headerClassName: 'user-list-col-email',
                  },
                  {
                    header: 'Role',
                    accessor: (user) => (
                      <div className="table-stack-cell">
                        <span className="table-role-pill" title={user.role || '-'}>
                          {user.role || '-'}
                        </span>
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
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={6}>
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
