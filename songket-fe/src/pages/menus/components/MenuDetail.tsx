import { formatDateTime } from './menuHelpers'

type MenuDetailProps = {
  canUpdate: boolean
  childMenuCount: number
  navigate: (path: string, options?: any) => void
  parentMenu: any
  selectedId: string
  selectedItem: any
}

export default function MenuDetail({
  canUpdate,
  childMenuCount,
  navigate,
  parentMenu,
  selectedId,
  selectedItem,
}: MenuDetailProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Menu Details</div>
          <div style={{ color: '#64748b' }}>Route and menu configuration details</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/menus/${selectedId}/edit`, { state: { menu: selectedItem } })}>
              Edit Menu
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/menus')}>Back</button>
        </div>
      </div>

      <div className="page">
        {!selectedItem && <div className="alert">Menu not found.</div>}
        {selectedItem && (
          <div className="card" style={{ maxWidth: 760 }}>
            <h3 style={{ marginTop: 0 }}>Menu Information</h3>
            <table className="table" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Name</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.name || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Display Name</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.display_name || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Path</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.path || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Icon</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.icon || '-'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Parent Menu</th>
                  <td style={{ fontWeight: 600 }}>
                    {parentMenu?.display_name || parentMenu?.name || parentMenu?.path || 'Root Menu'}
                  </td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Child Menus</th>
                  <td style={{ fontWeight: 600 }}>{childMenuCount}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Order Index</th>
                  <td style={{ fontWeight: 600 }}>{String(selectedItem.order_index ?? 0)}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Status</th>
                  <td style={{ fontWeight: 600 }}>{selectedItem.is_active ? 'Active' : 'Inactive'}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Created At</th>
                  <td style={{ fontWeight: 600 }}>{formatDateTime(selectedItem.created_at)}</td>
                </tr>
                <tr>
                  <th style={{ width: '34%', textTransform: 'none', letterSpacing: 'normal' }}>Updated At</th>
                  <td style={{ fontWeight: 600 }}>{formatDateTime(selectedItem.updated_at)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
