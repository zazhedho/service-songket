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
  const menuTitle = selectedItem?.display_name || selectedItem?.name || '-'

  return (
    <div className="menu-shell">
      <div className="header menu-header">
        <div className="menu-heading">
          <div className="menu-eyebrow">Menu Detail</div>
          <div className="menu-title">Menu Details</div>
          <div className="menu-subtitle">Route, hierarchy, icon, and navigation visibility configuration.</div>
        </div>
        <div className="menu-actions">
          {canUpdate && selectedId && (
            <button className="btn" onClick={() => navigate(`/menus/${selectedId}/edit`, { state: { menu: selectedItem } })}>
              Edit Menu
            </button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/menus')}>Back to Menus</button>
        </div>
      </div>

      <div className="page menu-page">
        {!selectedItem && <div className="alert">Menu not found.</div>}
        {selectedItem && (
          <>
            <div className="card menu-detail-hero">
              <div className="menu-detail-hero-main">
                <div className="menu-detail-kicker">Menu</div>
                <div className="menu-detail-name">{menuTitle}</div>
                <div className="menu-detail-note">{selectedItem.path || 'No route path set.'}</div>
              </div>
              <div className="menu-detail-badges">
                <span className={`menu-detail-badge ${selectedItem.is_active ? 'success' : 'muted'}`}>
                  {selectedItem.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="menu-detail-badge muted">{childMenuCount} child menus</span>
              </div>
            </div>

            <div className="card menu-detail-card">
              <div className="menu-section-head">
                <div>
                  <h3>Menu Information</h3>
                  <span>Configuration values used by the navigation renderer.</span>
                </div>
              </div>
              <div className="menu-detail-grid">
                <table className="table responsive-detail polished-detail-table">
                  <tbody>
                    <tr>
                      <th className="menu-detail-label">Name</th>
                      <td><span className="detail-value-strong">{selectedItem.name || '-'}</span></td>
                    </tr>
                    <tr>
                      <th className="menu-detail-label">Display Name</th>
                      <td><span className="detail-value-strong">{selectedItem.display_name || '-'}</span></td>
                    </tr>
                    <tr>
                      <th className="menu-detail-label">Path</th>
                      <td><span className="table-code-pill">{selectedItem.path || '-'}</span></td>
                    </tr>
                    <tr>
                      <th className="menu-detail-label">Icon</th>
                      <td><span className="detail-value-strong">{selectedItem.icon || '-'}</span></td>
                    </tr>
                  </tbody>
                </table>
                <table className="table responsive-detail polished-detail-table">
                  <tbody>
                    <tr>
                      <th className="menu-detail-label">Parent Menu</th>
                      <td>
                        <span className="detail-value-strong">{parentMenu?.display_name || parentMenu?.name || parentMenu?.path || 'Root Menu'}</span>
                      </td>
                    </tr>
                    <tr>
                      <th className="menu-detail-label">Order Index</th>
                      <td><span className="table-metric-pill warning">{String(selectedItem.order_index ?? 0)}</span></td>
                    </tr>
                    <tr>
                      <th className="menu-detail-label">Created At</th>
                      <td><span className="detail-value-strong">{formatDateTime(selectedItem.created_at)}</span></td>
                    </tr>
                    <tr>
                      <th className="menu-detail-label">Updated At</th>
                      <td><span className="detail-value-strong">{formatDateTime(selectedItem.updated_at)}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
