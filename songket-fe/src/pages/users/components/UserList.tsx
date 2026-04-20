import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'

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
          {canCreate && <button className="btn" onClick={() => navigate('/users/create')}>Input User</button>}
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search User</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama/email/phone" />
          </div>

          <h3>Daftar User</h3>
          {!canList && <div className="alert">Tidak ada izin melihat data.</div>}
          {canList && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td><span className="badge pending">{user.role}</span></td>
                      <td className="action-cell">
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
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4}>Belum ada user.</td>
                    </tr>
                  )}
                </tbody>
              </table>

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
