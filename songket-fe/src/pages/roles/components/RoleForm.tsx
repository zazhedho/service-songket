type RoleFormProps = {
  canAssignPerms: boolean
  canCreate: boolean
  canUpdate: boolean
  error: string
  form: any
  groupedPerms: Record<string, any[]>
  isCreate: boolean
  isEdit: boolean
  loading: boolean
  navigate: (path: string) => void
  permDraft: string[]
  renderPermissionTable: () => React.ReactNode
  saveRole: () => Promise<void>
  set: (k: string, v: string) => void
}

export default function RoleForm({
  canAssignPerms,
  canCreate,
  canUpdate,
  error,
  form,
  isCreate,
  isEdit,
  loading,
  navigate,
  permDraft,
  renderPermissionTable,
  saveRole,
  set,
}: RoleFormProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Role & Permissions' : 'Input Role Baru & Permissions'}</div>
          <div style={{ color: '#64748b' }}>Role dan permission disimpan dari satu form.</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/roles')}>Kembali ke Tabel</button>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 980 }}>
          {!canCreate && isCreate && <div className="alert">Tidak ada izin membuat role.</div>}
          {!canUpdate && isEdit && <div className="alert">Tidak ada izin mengubah role.</div>}

          <div className="grid" style={{ gap: 10 }}>
            <div>
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={isEdit}
                placeholder={isEdit ? 'Name role tidak dapat diubah' : 'Masukkan name role'}
              />
              {isEdit && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Name role tidak bisa diubah setelah dibuat.</div>}
            </div>
            <div>
              <label>Display Name</label>
              <input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
            </div>
            <div>
              <label>Description</label>
              <input value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            {canAssignPerms && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                  Akses akan disimpan bersamaan saat klik tombol {isEdit ? 'Update Role' : 'Create Role'}.
                </div>
                <div className="card" style={{ background: '#f8fafc' }}>
                  <h4>Assign Permissions</h4>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    Pilih permission yang ingin diberikan ke role ini.
                  </div>
                  {renderPermissionTable()}
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                    {permDraft.length} permission dipilih.
                  </div>
                </div>
              </div>
            )}

            {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={() => void saveRole()} disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/roles')}>Batal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
