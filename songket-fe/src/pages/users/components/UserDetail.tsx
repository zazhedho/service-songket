import { detailValue, formatDateTime } from './userHelpers'

type UserDetailProps = {
  canUpdate: boolean
  detailPermLoading: boolean
  detailPermissions: string[]
  navigate: (path: string, options?: any) => void
  selectedId: string
  selectedRoleDisplay: string
  selectedUser: any
}

export default function UserDetail({
  canUpdate,
  detailPermLoading,
  detailPermissions,
  navigate,
  selectedId,
  selectedRoleDisplay,
  selectedUser,
}: UserDetailProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Detail User</div>
          <div style={{ color: '#64748b' }}>Lihat informasi detail user</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/users/${selectedId}/edit`, { state: { user: selectedUser } })}>
              Edit User
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/users')}>Kembali</button>
        </div>
      </div>
      <div className="page">
        {!selectedUser && <div className="alert">Data user tidak ditemukan.</div>}
        {selectedUser && (
          <div className="card" style={{ maxWidth: 940 }}>
            <h3>User Information</h3>
            <table className="table" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Name</th>
                  <td style={{ fontWeight: 600 }}>{detailValue(selectedUser.name)}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Email</th>
                  <td style={{ fontWeight: 600 }}>{detailValue(selectedUser.email)}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Phone</th>
                  <td style={{ fontWeight: 600 }}>{detailValue(selectedUser.phone)}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Role</th>
                  <td style={{ fontWeight: 600 }}>{selectedRoleDisplay}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Created At</th>
                  <td style={{ fontWeight: 600 }}>{formatDateTime(selectedUser.created_at)}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Updated At</th>
                  <td style={{ fontWeight: 600 }}>{formatDateTime(selectedUser.updated_at)}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Permission Count</th>
                  <td style={{ fontWeight: 600 }}>{detailPermissions.length}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: 14 }}>Permissions</h3>
            <table className="table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>No</th>
                  <th>Permission</th>
                </tr>
              </thead>
              <tbody>
                {detailPermLoading && (
                  <tr>
                    <td colSpan={2}>Loading permissions...</td>
                  </tr>
                )}
                {!detailPermLoading && detailPermissions.length === 0 && (
                  <tr>
                    <td colSpan={2}>No permissions assigned.</td>
                  </tr>
                )}
                {!detailPermLoading && detailPermissions.map((permission, index) => (
                  <tr key={`${permission}-${index}`}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{permission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
