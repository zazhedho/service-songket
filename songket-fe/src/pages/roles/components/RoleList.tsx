import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'

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
          <div style={{ marginBottom: 10 }}>
            <label>Search Role</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/display name" />
          </div>

          <h3>Role List</h3>
          {!canList && <div className="alert">You do not have permission to view roles.</div>}
          {canList && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Display Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((roleItem: any) => (
                    <tr key={roleItem.id}>
                      <td>{roleItem.name}</td>
                      <td>{roleItem.display_name}</td>
                      <td className="action-cell">
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
                      </td>
                    </tr>
                  ))}
                  {roles.length === 0 && (
                    <tr>
                      <td colSpan={3}>No roles found.</td>
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
