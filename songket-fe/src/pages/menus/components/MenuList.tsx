import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'

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
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Menus</div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label>Search Menu</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/path" />
          </div>

          <h3>Menu List</h3>
          {!canList && <div className="alert">No permission to view menu.</div>}
          {canList && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.display_name || item.name}</td>
                      <td>{item.path || '-'}</td>
                      <td>{item.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="action-cell">
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
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4}>No menus yet.</td>
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
