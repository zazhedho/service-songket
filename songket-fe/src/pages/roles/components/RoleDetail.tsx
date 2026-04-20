function DetailTable({ rows }: { rows: Array<{ label: string; value: any }> }) {
  return (
    <table className="table" style={{ marginTop: 8 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: '35%', textTransform: 'none', letterSpacing: 'normal' }}>{row.label}</th>
            <td style={{ fontWeight: 600 }}>{row.value || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

type RoleDetailProps = {
  canUpdate: boolean
  navigate: (path: string, options?: any) => void
  permissionLabel: (id: string) => string
  roleDetail: any
  selectedId: string
  selectedRole: any
}

export default function RoleDetail({
  canUpdate,
  navigate,
  permissionLabel,
  roleDetail,
  selectedId,
  selectedRole,
}: RoleDetailProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Role Details</div>
          <div style={{ color: '#64748b' }}>Role profile with related permissions</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/roles/${selectedId}/edit`, { state: { role: selectedRole } })}>
              Edit Role
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/roles')}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedRole && !roleDetail && <div className="alert">Role not found.</div>}

        {(selectedRole || roleDetail) && (
          <div className="card" style={{ maxWidth: 960 }}>
            <h3 style={{ marginTop: 0 }}>Role Information</h3>
            <DetailTable
              rows={[
                { label: 'Name', value: roleDetail?.name || selectedRole?.name || '-' },
                { label: 'Display Name', value: roleDetail?.display_name || selectedRole?.display_name || '-' },
                { label: 'Description', value: roleDetail?.description || selectedRole?.description || '-' },
              ]}
            />
          </div>
        )}

        <div className="card" style={{ maxWidth: 960 }}>
          <h3>Permissions</h3>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ width: 70 }}>No</th>
                <th>Permission</th>
              </tr>
            </thead>
            <tbody>
              {(roleDetail?.permission_ids || []).map((id: string, index: number) => (
                <tr key={id}>
                  <td>{index + 1}</td>
                  <td>{permissionLabel(id)}</td>
                </tr>
              ))}
              {(roleDetail?.permission_ids || []).length === 0 && (
                <tr>
                  <td colSpan={2}>No permissions assigned.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
