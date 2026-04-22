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
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Menus</div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          <div className="filter-panel">
            <div className="filter-panel-head">
              <div>
                <div className="filter-panel-title">Search Menu</div>
                <div className="filter-panel-subtitle">Cari menu berdasarkan nama tampil atau path route.</div>
              </div>
            </div>
            <div className="filter-grid">
              <div className="filter-field">
                <label>Keyword</label>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/path" />
              </div>
            </div>
          </div>

          <h3>Menu List</h3>
          {!canList && <div className="alert">No permission to view menu.</div>}
          {canList && (
            <>
              <Table
                data={items}
                keyField="id"
                onRowClick={(item: any) => navigate(`/menus/${item.id}`, { state: { menu: item } })}
                emptyMessage="No menus yet."
                columns={[
                  { header: 'Name', accessor: (item: any) => item.display_name || item.name },
                  { header: 'Path', accessor: 'path' },
                  { header: 'Status', accessor: (item: any) => item.is_active ? 'Active' : 'Inactive' },
                  {
                    header: 'Actions',
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
                    ignoreRowClick: true,
                  },
                ]}
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
