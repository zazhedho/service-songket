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
  const systemCount = roles.filter((role) => Boolean(role?.is_system)).length
  const customCount = roles.filter((role) => !role?.is_system).length

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Roles & Access</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Manage access groups and permission templates for each user type.
          </div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/roles/create')}>Create Role</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="role-list-summary">
            <div className="role-summary-card">
              <div className="role-summary-label">Total Roles</div>
              <div className="role-summary-value">{totalData || roles.length}</div>
              <div className="role-summary-note">Available access groups in the current workspace.</div>
            </div>
            <div className="role-summary-card">
              <div className="role-summary-label">System Roles</div>
              <div className="role-summary-value">{systemCount}</div>
              <div className="role-summary-note">Protected roles managed by the application.</div>
            </div>
            <div className="role-summary-card">
              <div className="role-summary-label">Custom Roles</div>
              <div className="role-summary-value">{customCount}</div>
              <div className="role-summary-note">Editable roles created for your own access setup.</div>
            </div>
          </div>

          <div className="compact-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or display name" aria-label="Search role" />
            </div>
            <div className="role-list-toolbar-meta">
              {canList && <span>{totalData || roles.length} roles</span>}
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
                  {
                    header: 'Name',
                    accessor: (roleItem: any) => (
                      <div className="role-name-cell">
                        <div className="role-name-title">{roleItem.name || '-'}</div>
                      </div>
                    ),
                    style: { width: '20%' },
                  },
                  {
                    header: 'Display Name',
                    accessor: (roleItem: any) => (
                      <div className="role-name-cell">
                        <div className="role-name-title">{roleItem.display_name || '-'}</div>
                      </div>
                    ),
                    style: { width: '22%' },
                  },
                  {
                    header: 'Description',
                    accessor: (roleItem: any) => (
                      <div className="role-description-cell">
                        <div className="role-description-text">
                          {roleItem.description?.trim() || 'No description has been added for this role yet.'}
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Access Type',
                    accessor: (roleItem: any) => (
                      <div className="role-type-cell">
                        <span className={`badge ${roleItem.is_system ? 'pending' : 'success'}`}>
                          {roleItem.is_system ? 'System Role' : 'Custom Role'}
                        </span>
                        <div className="role-type-note">
                          {roleItem.is_system ? 'Protected from deletion' : 'Can be updated and assigned freely'}
                        </div>
                      </div>
                    ),
                    style: { width: '20%' },
                  },
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
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={5}>
                      <div className="role-empty-state">
                        <div className="role-empty-icon">
                          <i className="bi bi-shield-lock"></i>
                        </div>
                        <div className="role-empty-title">No roles found</div>
                        <div className="role-empty-note">Try another keyword or create a new role to get started.</div>
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
