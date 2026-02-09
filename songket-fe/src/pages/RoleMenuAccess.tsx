import { useEffect, useMemo, useState } from 'react'
import { assignRoleMenus, getRoleById, listMenus, listRoles } from '../api'
import { useAuth } from '../store'

type Role = { id: string; name: string; display_name?: string }
type Menu = { id: string; name: string; display_name?: string; path?: string; is_active?: boolean }

const TARGET_ROLES = ['dealer', 'main_dealer', 'superadmin'] as const
type TargetRole = (typeof TARGET_ROLES)[number]

// Path kategori
const DEALER_PATHS = ['/orders']
const MAIN_DEALER_PATHS = ['/orders', '/finance', '/credit', '/quadrants', '/prices', '/news', '/jobs', '/net-income', '/dashboard']
const ADMIN_ONLY_PATHS = ['/users', '/roles', '/menus', '/role-menu-access', '/scrape-sources']

export default function RoleMenuAccessPage() {
  const role = useAuth((s) => s.role)
  const perms = useAuth((s) => s.permissions)
  const canAssign = role === 'superadmin' && perms.includes('assign_menus')

  const [roles, setRoles] = useState<Role[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [roleMenus, setRoleMenus] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [info, setInfo] = useState<string>('')

  const targetRoles = useMemo(
    () => roles.filter((r) => TARGET_ROLES.includes(r.name as TargetRole)),
    [roles],
  )

  const load = async () => {
    if (!canAssign) return
    setLoading(true)
    setError('')
    try {
      const [rRes, mRes] = await Promise.all([listRoles(), listMenus()])
      const rData = rRes.data.data || rRes.data || []
      const mData = mRes.data.data || mRes.data || []
      setRoles(rData)
      setMenus(mData)

      // fetch existing menu assignments per target role
      const details = await Promise.all(
        (rData as Role[])
          .filter((r) => TARGET_ROLES.includes(r.name as TargetRole))
          .map(async (r) => {
            try {
              const det = await getRoleById(r.id)
              const menuIds = det.data?.data?.menu_ids || det.data?.menu_ids || []
              return { id: r.id, menuIds }
            } catch {
              return { id: r.id, menuIds: [] }
            }
          }),
      )
      const next: Record<string, string[]> = {}
      details.forEach((d) => {
        next[d.id] = d.menuIds
      })
      setRoleMenus(next)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAssign])

  const toggle = (roleId: string, menuId: string) => {
    setRoleMenus((prev) => {
      const current = new Set(prev[roleId] || [])
      if (current.has(menuId)) current.delete(menuId)
      else current.add(menuId)
      return { ...prev, [roleId]: Array.from(current) }
    })
  }

  const presetFor = (roleName: TargetRole): string[] => {
    if (!displayMenus.length) return []
    if (roleName === 'superadmin') return displayMenus.map((m) => m.id)
    if (roleName === 'dealer') {
      return displayMenus.filter((m) => DEALER_PATHS.includes(m.path || '')).map((m) => m.id)
    }
    // main dealer
    return displayMenus
      .filter((m) => MAIN_DEALER_PATHS.includes(m.path || '') && !ADMIN_ONLY_PATHS.includes(m.path || ''))
      .map((m) => m.id)
  }

  const applyPreset = (roleName: TargetRole) => {
    const r = targetRoles.find((x) => x.name === roleName)
    if (!r) return
    const ids = presetFor(roleName)
    setRoleMenus((prev) => ({ ...prev, [r.id]: ids }))
    setInfo(`Preset ${roleName.replace('_', ' ')} diset. Jangan lupa klik Save.`)
  }

  const save = async (roleId: string) => {
    if (!canAssign) return
    setSaving(roleId)
    setError('')
    setInfo('')
    try {
      const payload = roleMenus[roleId] || []
      if (!payload.length) {
        setError('Minimal 1 menu harus dipilih.')
        return
      }
      await assignRoleMenus(roleId, payload)
      setInfo('Menu berhasil disimpan.')
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Gagal menyimpan menu')
    } finally {
      setSaving(null)
    }
  }

  const roleColumns = targetRoles
    .slice()
    .sort((a, b) => TARGET_ROLES.indexOf(a.name as TargetRole) - TARGET_ROLES.indexOf(b.name as TargetRole))

  const displayMenus = useMemo(
    () =>
      menus
        .filter((m) => m.is_active !== false)
        .sort((a, b) => (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')),
    [menus],
  )

  const renderPresetButtons = () => (
    <div className="preset-row">
      <button className="btn-ghost" onClick={() => applyPreset('dealer')}>Set Dealer Default</button>
      <button className="btn-ghost" onClick={() => applyPreset('main_dealer')}>Set Main Dealer Default</button>
      <button className="btn-ghost" onClick={() => applyPreset('superadmin')}>Set Superadmin (All)</button>
    </div>
  )

  if (!canAssign) {
    return (
      <div className="page">
        <div className="card">
          <h3>Roles Menu Access</h3>
          <div className="alert">Hanya superadmin dengan izin assign_menus yang dapat mengatur akses menu.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Roles Menu Access</div>
          </div>
      </div>
      <div className="page">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0 }}>Mapping Menu per Role</h3>
              <div style={{ color: '#9ca3af', fontSize: 13 }}>
                Dealer: Form Order in saja. Main Dealer: Order, peta, credit, nama pekerjaan, net income, dll non-admin. Superadmin: semua menu.
              </div>
            </div>
            {renderPresetButtons()}
          </div>

          {loading && <div style={{ marginTop: 12 }}>Loading data...</div>}
          {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}
          {info && !error && <div style={{ color: '#22c55e', marginTop: 12, fontSize: 13 }}>{info}</div>}

          {!loading && displayMenus.length > 0 && (
            <div style={{ marginTop: 12, overflowX: 'auto' }}>
              <table className="table role-menu-table">
                <thead>
                  <tr>
                    <th>Menu</th>
                    {roleColumns.map((r) => (
                      <th key={r.id}>{r.display_name || r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayMenus.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.display_name || m.name}</div>
                        <div style={{ color: '#9ca3af', fontSize: 11 }}>{m.path}</div>
                      </td>
                      {roleColumns.map((r) => {
                        const checked = (roleMenus[r.id] || []).includes(m.id)
                        return (
                          <td key={r.id} style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className="perm-checkbox"
                              checked={checked}
                              onChange={() => toggle(r.id, m.id)}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {roleColumns.map((r) => (
              <button
                key={r.id}
                className="btn"
                onClick={() => save(r.id)}
                disabled={saving === r.id}
              >
                {saving === r.id ? `Saving ${r.name}...` : `Save ${r.name}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
