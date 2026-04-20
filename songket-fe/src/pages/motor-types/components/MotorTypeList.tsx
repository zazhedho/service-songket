import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'

type MotorTypeListProps = {
  canCreate: boolean
  canDelete: boolean
  canList: boolean
  canUpdate: boolean
  canView: boolean
  filterRegencies: any[]
  formatRupiah: (value: number) => string
  items: any[]
  limit: number
  navigate: (path: string, options?: any) => void
  page: number
  provinceFilter: string
  provinces: any[]
  regencyFilter: string
  remove: (id: string) => Promise<void>
  search: string
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setProvinceFilter: React.Dispatch<React.SetStateAction<string>>
  setRegencyFilter: React.Dispatch<React.SetStateAction<string>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  totalData: number
  totalPages: number
}

export default function MotorTypeList({
  canCreate,
  canDelete,
  canList,
  canUpdate,
  canView,
  filterRegencies,
  formatRupiah,
  items,
  limit,
  navigate,
  page,
  provinceFilter,
  provinces,
  regencyFilter,
  remove,
  search,
  setLimit,
  setPage,
  setProvinceFilter,
  setRegencyFilter,
  setSearch,
  totalData,
  totalPages,
}: MotorTypeListProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Types</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/motor-types/create')}>Create Motor Type</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div>
              <label>Search</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search type/brand/model" />
            </div>

            <div>
              <label>Filter Province</label>
              <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}>
                <option value="">All</option>
                {provinces.map((province: any) => (
                  <option key={province.code} value={province.code}>{province.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Filter Regency</label>
              <select value={regencyFilter} onChange={(e) => setRegencyFilter(e.target.value)} disabled={!provinceFilter}>
                <option value="">All</option>
                {filterRegencies.map((regency: any) => (
                  <option key={regency.code} value={regency.code}>{regency.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Motor Type List</h3>
          {(!canList || !canView) && <div className="alert">No permission to view motor type data.</div>}
          {canList && canView && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Brand / Model</th>
                    <th>Type</th>
                    <th>OTR</th>
                    <th>Area</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.name || '-'}</td>
                      <td>{[item.brand, item.model].filter(Boolean).join(' / ') || '-'}</td>
                      <td>{item.type || '-'}</td>
                      <td>{formatRupiah(item.otr || 0)}</td>
                      <td>{[item.regency_name, item.province_name].filter(Boolean).join(', ') || '-'}</td>
                      <td className="action-cell">
                        <ActionMenu
                          items={[
                            {
                              key: 'view',
                              label: 'View',
                              onClick: () => navigate(`/motor-types/${item.id}`, { state: { motorType: item } }),
                            },
                            {
                              key: 'edit',
                              label: 'Edit',
                              onClick: () => navigate(`/motor-types/${item.id}/edit`, { state: { motorType: item } }),
                              hidden: !canUpdate,
                            },
                            {
                              key: 'delete',
                              label: 'Delete',
                              onClick: () => void remove(item.id),
                              hidden: !canDelete,
                              danger: true,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6}>No motor type data yet.</td>
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
