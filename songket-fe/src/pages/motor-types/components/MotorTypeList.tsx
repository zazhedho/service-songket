import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

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
          <div className="filter-panel">
            <div className="filter-panel-head">
              <div>
                <div className="filter-panel-title">Filter Motor Type</div>
                <div className="filter-panel-subtitle">Gabungkan pencarian keyword dengan area provinsi dan kabupaten/kota.</div>
              </div>
            </div>
            <div className="filter-grid">
              <div className="filter-field">
                <label>Search</label>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search type/brand/model" />
              </div>

              <div className="filter-field">
                <label>Filter Province</label>
                <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}>
                  <option value="">All</option>
                  {provinces.map((province: any) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-field">
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
        </div>

        <div className="card">
          <h3>Motor Type List</h3>
          {(!canList || !canView) && <div className="alert">No permission to view motor type data.</div>}
          {canList && canView && (
            <>
              <Table
                data={items}
                keyField="id"
                onRowClick={(item: any) => navigate(`/motor-types/${item.id}`, { state: { motorType: item } })}
                emptyMessage="No motor type data yet."
                columns={[
                  { header: 'Type', accessor: (item: any) => item.name || '-' },
                  { header: 'Brand / Model', accessor: (item: any) => [item.brand, item.model].filter(Boolean).join(' / ') || '-' },
                  { header: 'Type', accessor: (item: any) => item.type || '-' },
                  { header: 'OTR', accessor: (item: any) => formatRupiah(item.otr || 0) },
                  { header: 'Area', accessor: (item: any) => [item.regency_name, item.province_name].filter(Boolean).join(', ') || '-' },
                  {
                    header: 'Action',
                    accessor: (item: any) => (
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
