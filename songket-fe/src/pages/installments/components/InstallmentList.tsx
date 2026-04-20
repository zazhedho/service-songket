import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'

type InstallmentListProps = {
  areaLabel: (motor?: any) => string
  canCreate: boolean
  canDelete: boolean
  canList: boolean
  canUpdate: boolean
  canView: boolean
  filterRegencies: any[]
  formatDate: (value?: string) => string
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

export default function InstallmentList({
  areaLabel,
  canCreate,
  canDelete,
  canList,
  canUpdate,
  canView,
  filterRegencies,
  formatDate,
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
}: InstallmentListProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Types & Installments</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/installments/create')}>Create Motor & Installment</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div>
              <label>Search</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search motor type" />
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
          <h3>Data List</h3>
          {(!canList || !canView) && <div className="alert">No permission to view data.</div>}
          {canList && canView && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Motor Type</th>
                    <th>Brand / Model</th>
                    <th>Variant</th>
                    <th>OTR</th>
                    <th>Area</th>
                    <th>Installment</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.motor_type?.name || '-'}</td>
                      <td>{[item.motor_type?.brand, item.motor_type?.model].filter(Boolean).join(' / ') || '-'}</td>
                      <td>{item.motor_type?.type || '-'}</td>
                      <td>{formatRupiah(Number(item.motor_type?.otr || 0))}</td>
                      <td>{areaLabel(item.motor_type)}</td>
                      <td>{formatRupiah(Number(item.amount || 0))}</td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td className="action-cell">
                        <ActionMenu
                          items={[
                            { key: 'view', label: 'View', onClick: () => navigate(`/installments/${item.id}`, { state: { item } }) },
                            { key: 'edit', label: 'Edit', onClick: () => navigate(`/installments/${item.id}/edit`, { state: { item } }), hidden: !canUpdate },
                            { key: 'delete', label: 'Delete', onClick: () => void remove(item.id), hidden: !canDelete, danger: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8}>No data available.</td>
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
