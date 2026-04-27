import dayjs from 'dayjs'
import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

type MenuListProps = {
  canList: boolean
  canUpdate: boolean
  items: any[]
  limit: number
  navigate: (path: string, options?: any) => void
  page: number
  search: string
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  totalData: number
  totalPages: number
}

export default function MenuList({
  canList,
  canUpdate,
  items,
  limit,
  navigate,
  page,
  search,
  setLimit,
  setPage,
  setSearch,
  totalData,
  totalPages,
}: MenuListProps) {
  const activeCount = items.filter((item) => Boolean(item?.is_active)).length
  const rootCount = items.filter((item) => !item?.parent_id).length
  const menuById = Object.fromEntries(items.map((item) => [String(item.id || ''), item]))

  const formatDate = (value: unknown) => {
    if (!value) return '-'
    const parsed = dayjs(String(value))
    return parsed.isValid() ? parsed.format('DD MMM YYYY HH:mm') : '-'
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Menus</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Manage navigation structure, routes, and menu visibility.
          </div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div className="entity-list-summary">
            <div className="entity-summary-card">
              <div className="entity-summary-label">Total Menus</div>
              <div className="entity-summary-value">{totalData || items.length}</div>
              <div className="entity-summary-note">Current result count for the navigation menu registry.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Active Menus</div>
              <div className="entity-summary-value">{activeCount}</div>
              <div className="entity-summary-note">Menus that are currently enabled for navigation.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Root Menus</div>
              <div className="entity-summary-value">{rootCount}</div>
              <div className="entity-summary-note">Top-level entries without a parent menu.</div>
            </div>
          </div>

          <div className="compact-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or path" aria-label="Search menu" />
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

          <h3>Menu List</h3>
          {!canList && <div className="alert">No permission to view menu.</div>}
          {canList && (
            <>
              <Table
                className="menu-list-table metric-table"
                data={items}
                keyField="id"
                onRowClick={(item: any) => navigate(`/menus/${item.id}`, { state: { menu: item } })}
                emptyMessage="No menus yet."
                columns={[
                  {
                    header: 'Menu',
                    accessor: (item: any) => (
                      <div className="table-stack-cell">
                        <div className="table-stack-primary" title={item.display_name || item.name || '-'}>
                          {item.display_name || item.name || '-'}
                        </div>
                        <div className="table-stack-secondary" title={item.name || '-'}>
                          {item.name || 'No internal name'}
                        </div>
                      </div>
                    ),
                    className: 'menu-list-col-menu',
                    headerClassName: 'menu-list-col-menu',
                  },
                  {
                    header: 'Path',
                    accessor: (item: any) => (
                      <div className="table-stack-cell">
                        <div className="table-code-pill table-text-ellipsis" title={item.path || '-'}>
                          {item.path || '-'}
                        </div>
                        <div className="table-stack-tertiary">
                          {item.icon ? `Icon: ${item.icon}` : 'No icon selected'}
                        </div>
                      </div>
                    ),
                    className: 'menu-list-col-path',
                    headerClassName: 'menu-list-col-path',
                  },
                  {
                    header: 'Parent',
                    accessor: (item: any) => {
                      const parent = item.parent_id ? menuById[String(item.parent_id)] : null
                      const parentLabel = parent?.display_name || parent?.name || parent?.path || 'Root Menu'
                      return (
                        <div className="table-stack-cell">
                          <div className="table-stack-primary" title={parentLabel}>
                            {parentLabel}
                          </div>
                          <div>
                            <span className="table-metric-pill warning">Order {Number(item.order_index || 0)}</span>
                          </div>
                        </div>
                      )
                    },
                    className: 'menu-list-col-parent',
                    headerClassName: 'menu-list-col-parent',
                  },
                  {
                    header: 'Status',
                    accessor: (item: any) => (
                      <div className="table-stack-cell">
                        <div>
                          <span className={`badge ${item.is_active ? 'success' : 'pending'}`}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="table-stack-tertiary">
                          {item.is_active ? 'Shown in navigation' : 'Hidden from navigation'}
                        </div>
                      </div>
                    ),
                    className: 'menu-list-col-status',
                    headerClassName: 'menu-list-col-status',
                  },
                  {
                    header: 'Updated',
                    accessor: (item: any) => (
                      <div className="table-stack-cell">
                        <div className="table-stack-primary">{formatDate(item.updated_at || item.created_at)}</div>
                      </div>
                    ),
                    className: 'menu-list-col-updated',
                    headerClassName: 'menu-list-col-updated',
                  },
                  {
                    header: 'Action',
                    accessor: (item: any) => (
                      <ActionMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`/menus/${item.id}`, { state: { menu: item } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`/menus/${item.id}/edit`, { state: { menu: item } }),
                            hidden: !canUpdate,
                          },
                        ]}
                      />
                    ),
                    className: 'action-cell',
                    headerClassName: 'menu-list-col-action',
                    ignoreRowClick: true,
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={6}>
                      <div className="entity-empty-state">
                        <div className="entity-empty-icon">
                          <i className="bi bi-grid"></i>
                        </div>
                        <div className="entity-empty-title">No menus found</div>
                        <div className="entity-empty-note">Try another keyword or add a new menu entry to build the navigation structure.</div>
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
