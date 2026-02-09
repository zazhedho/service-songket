import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  assignRoleMenus,
  assignRolePermissions,
  createRole,
  deleteRole,
  getRoleById,
  listMenus,
  listPermissions,
  listRoles,
  updateRole,
} from '../api'
import Pagination from '../components/Pagination'
import { useAuth } from '../store'

const empty = { name: '', display_name: '', description: '' }

function parseMode(pathname: string) {
  if (pathname.endsWith('/create')) return 'create'
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/roles\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function RolesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const userPerms = useAuth((s) => s.permissions)
  const canList = userPerms.includes('list_roles')
  const canCreate = userPerms.includes('create_roles')
  const canUpdate = userPerms.includes('update_roles')
  const canDelete = userPerms.includes('delete_roles')
  const canAssignPerms = userPerms.includes('assign_permissions')
  const canAssignMenus = userPerms.includes('assign_menus')

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const [roles, setRoles] = useState<any[]>([])
  const [menus, setMenus] = useState<any[]>([])
  const [perms, setPerms] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const [form, setForm] = useState(empty)
  const [permInput, setPermInput] = useState('')
  const [menuInput, setMenuInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [roleDetail, setRoleDetail] = useState<any>(null)

  const stateRole = (location.state as any)?.role || null

  const load = async () => {
    const [rolesRes, menusRes] = await Promise.all([
      listRoles({ page, limit, search: search || undefined }),
      listMenus({ page: 1, limit: 500 }),
    ])
    setRoles(rolesRes.data.data || rolesRes.data || [])
    setMenus(menusRes.data.data || menusRes.data || [])

    setTotalPages(rolesRes.data.total_pages || 1)
    setTotalData(rolesRes.data.total_data || 0)
    setPage(rolesRes.data.current_page || page)
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => {
        setRoles([])
        setMenus([])
      })
    }
    listPermissions().then((res: any) => setPerms(res.data.data || res.data || [])).catch(() => setPerms([]))
  }, [canList, isDetail, isEdit, limit, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const selectedRole = useMemo(() => {
    if (!selectedId) return null
    return roles.find((r) => r.id === selectedId) || (stateRole?.id === selectedId ? stateRole : null)
  }, [roles, selectedId, stateRole])

  useEffect(() => {
    if (isCreate) {
      setForm(empty)
      setRoleDetail(null)
      return
    }

    if (selectedId && (isEdit || isDetail)) {
      const preview = selectedRole
      if (preview) {
        setForm({
          name: preview.name || '',
          display_name: preview.display_name || '',
          description: preview.description || '',
        })
      }

      setLoading(true)
      getRoleById(selectedId)
        .then((res) => {
          const detail = res.data?.data || res.data || null
          setRoleDetail(detail)
          setForm({
            name: detail?.name || preview?.name || '',
            display_name: detail?.display_name || preview?.display_name || '',
            description: detail?.description || preview?.description || '',
          })
        })
        .catch(() => setRoleDetail(null))
        .finally(() => setLoading(false))
    }
  }, [isCreate, isDetail, isEdit, selectedId, selectedRole])

  const saveRole = async () => {
    if (isCreate && !canCreate) return
    if (isEdit && !canUpdate) return

    setLoading(true)
    setError('')
    try {
      if (isEdit && selectedId) await updateRole(selectedId, form)
      else await createRole(form)
      setForm(empty)
      navigate('/roles')
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Gagal menyimpan role'
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }

  const applyPerms = async () => {
    if (!selectedId || !canAssignPerms) return
    const ids = permInput.split(',').map((s) => s.trim()).filter(Boolean)
    await assignRolePermissions(selectedId, ids)
    setPermInput('')
    if (isDetail || isEdit) {
      const res = await getRoleById(selectedId)
      setRoleDetail(res.data?.data || res.data || null)
    }
  }

  const applyMenus = async () => {
    if (!selectedId || !canAssignMenus) return
    const ids = menuInput.split(',').map((s) => s.trim()).filter(Boolean)
    await assignRoleMenus(selectedId, ids)
    setMenuInput('')
    if (isDetail || isEdit) {
      const res = await getRoleById(selectedId)
      setRoleDetail(res.data?.data || res.data || null)
    }
  }

  const remove = async (id: string) => {
    if (!canDelete) return
    if (!window.confirm('Hapus role?')) return
    await deleteRole(id)
    await load()
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  if (isDetail) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Detail Role</div>
            <div style={{ color: '#64748b' }}>Informasi role, menu, dan permission</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUpdate && selectedId && (
              <button className="btn" onClick={() => navigate(`/roles/${selectedId}/edit`, { state: { role: selectedRole } })}>
                Edit Role
              </button>
            )}
            <button className="btn-ghost" onClick={() => navigate('/roles')}>Kembali</button>
          </div>
        </div>

        <div className="page">
          {!selectedRole && !roleDetail && <div className="alert">Role tidak ditemukan.</div>}

          {(selectedRole || roleDetail) && (
            <div className="card">
              <div style={{ display: 'grid', gap: 10 }}>
                <DetailRow label="Name" value={roleDetail?.name || selectedRole?.name || '-'} />
                <DetailRow label="Display Name" value={roleDetail?.display_name || selectedRole?.display_name || '-'} />
                <DetailRow label="Description" value={roleDetail?.description || selectedRole?.description || '-'} />
                <DetailRow label="Role ID" value={selectedId || '-'} />
              </div>
            </div>
          )}

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card">
              <h3>Menu IDs</h3>
              <div style={{ maxHeight: 250, overflow: 'auto', marginTop: 8 }}>
                {(roleDetail?.menu_ids || []).length === 0 && <div className="muted">Belum ada menu.</div>}
                {(roleDetail?.menu_ids || []).map((id: string) => (
                  <div key={id} style={{ fontSize: 13 }}>{id}</div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>Permission IDs</h3>
              <div style={{ maxHeight: 250, overflow: 'auto', marginTop: 8 }}>
                {(roleDetail?.permission_ids || []).length === 0 && <div className="muted">Belum ada permission.</div>}
                {(roleDetail?.permission_ids || []).map((id: string) => (
                  <div key={id} style={{ fontSize: 13 }}>{id}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isCreate || isEdit) {
    return (
      <div>
        <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Role' : 'Input Role Baru'}</div>
            <div style={{ color: '#64748b' }}>Form terpisah dari tabel role</div>
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
                <input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label>Display Name</label>
                <input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
              </div>
              <div>
                <label>Description</label>
                <input value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>

              {isEdit && selectedId && (canAssignMenus || canAssignPerms) && (
                <div style={{ marginTop: 6 }}>
                  <h4>Assign Permissions (IDs, pisah koma)</h4>
                  <input
                    value={permInput}
                    onChange={(e) => setPermInput(e.target.value)}
                    placeholder="perm-id-1,perm-id-2"
                    disabled={!canAssignPerms}
                  />
                  <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => void applyPerms()} disabled={!canAssignPerms}>
                    Assign Perms
                  </button>

                  <h4 style={{ marginTop: 16 }}>Assign Menus (IDs, pisah koma)</h4>
                  <input
                    value={menuInput}
                    onChange={(e) => setMenuInput(e.target.value)}
                    placeholder="menu-id-1,menu-id-2"
                    disabled={!canAssignMenus}
                  />
                  <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => void applyMenus()} disabled={!canAssignMenus}>
                    Assign Menus
                  </button>

                  <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Gunakan ID dari tabel di bawah.</p>

                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <div className="card">
                      <h4>Menus</h4>
                      <div style={{ maxHeight: 170, overflow: 'auto' }}>
                        {menus.map((m) => (
                          <div key={m.id} style={{ fontSize: 12 }}>{m.id} - {m.name}</div>
                        ))}
                      </div>
                    </div>
                    <div className="card">
                      <h4>Permissions</h4>
                      <div style={{ maxHeight: 170, overflow: 'auto' }}>
                        {perms.map((p) => (
                          <div key={p.id} style={{ fontSize: 12 }}>{p.id} - {p.name}</div>
                        ))}
                      </div>
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

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Roles & Access</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/roles/create')}>Input Role</button>}
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search Role</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari name/display name" />
          </div>

          <h3>Daftar Role</h3>
          {!canList && <div className="alert">Tidak ada izin melihat role.</div>}
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
                {roles.map((roleItem) => (
                  <tr key={roleItem.id}>
                    <td>{roleItem.name}</td>
                    <td>{roleItem.display_name}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-ghost" onClick={() => navigate(`/roles/${roleItem.id}`, { state: { role: roleItem } })}>View</button>
                      {canUpdate && (
                        <button className="btn-ghost" onClick={() => navigate(`/roles/${roleItem.id}/edit`, { state: { role: roleItem } })}>
                          Edit
                        </button>
                      )}
                      {canDelete && <button className="btn-ghost" onClick={() => void remove(roleItem.id)}>Delete</button>}
                      {!canUpdate && !canDelete && '-'}
                    </td>
                  </tr>
                ))}
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={3}>Belum ada role.</td>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12 }}>
      <div style={{ color: '#64748b', fontWeight: 600 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value || '-'}</div>
    </div>
  )
}
