import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import SearchableSelect from '../../../components/common/SearchableSelect'
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
  const provinceOptions = [
    { value: '', label: 'All Provinces' },
    ...provinces.map((province: any) => ({ value: province.code, label: province.name })),
  ]

  const regencyOptions = [
    { value: '', label: 'All Regencies' },
    ...filterRegencies.map((regency: any) => ({ value: regency.code, label: regency.name })),
  ]

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
          <div className="compact-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search type, brand, or model" aria-label="Search motor type" />
            </div>

            <div className="compact-filter-item">
              <SearchableSelect
                value={provinceFilter}
                onChange={setProvinceFilter}
                options={provinceOptions}
                placeholder="All Provinces"
                searchPlaceholder="Search province..."
              />
            </div>

            <div className="compact-filter-item">
              <SearchableSelect
                value={regencyFilter}
                onChange={setRegencyFilter}
                options={regencyOptions}
                placeholder="All Regencies"
                searchPlaceholder="Search regency..."
                disabled={!provinceFilter}
              />
            </div>

            <div className="compact-filter-action">
              <button
                className="btn-ghost"
                onClick={() => {
                  setSearch('')
                  setProvinceFilter('')
                  setRegencyFilter('')
                }}
                disabled={!search.trim() && !provinceFilter && !regencyFilter}
                title="Clear all filters"
                aria-label="Clear all filters"
                style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
              >
                ×
              </button>
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
