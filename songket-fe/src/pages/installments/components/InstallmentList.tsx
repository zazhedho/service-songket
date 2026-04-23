import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import SearchableSelect from '../../../components/common/SearchableSelect'
import Table from '../../../components/common/Table'

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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Types & Installments</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/installments/create')}>Create Motor & Installment</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="compact-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search motor type" aria-label="Search installment motor type" />
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
          <h3>Data List</h3>
          {(!canList || !canView) && <div className="alert">No permission to view data.</div>}
          {canList && canView && (
            <>
              <Table
                data={items}
                keyField="id"
                onRowClick={(item) => navigate(`/installments/${item.id}`, { state: { item } })}
                emptyMessage="No data available."
                columns={[
                  { header: 'Motor Type', accessor: (item) => item.motor_type?.name || '-' },
                  { header: 'Brand / Model', accessor: (item) => [item.motor_type?.brand, item.motor_type?.model].filter(Boolean).join(' / ') || '-' },
                  { header: 'Variant', accessor: (item) => item.motor_type?.type || '-' },
                  { header: 'OTR', accessor: (item) => formatRupiah(Number(item.motor_type?.otr || 0)) },
                  { header: 'Area', accessor: (item) => areaLabel(item.motor_type) },
                  { header: 'Installment', accessor: (item) => formatRupiah(Number(item.amount || 0)) },
                  { header: 'Updated', accessor: (item) => formatDate(item.updated_at) },
                  {
                    header: 'Action',
                    accessor: (item) => (
                      <ActionMenu
                        items={[
                          { key: 'view', label: 'View', onClick: () => navigate(`/installments/${item.id}`, { state: { item } }) },
                          { key: 'edit', label: 'Edit', onClick: () => navigate(`/installments/${item.id}/edit`, { state: { item } }), hidden: !canUpdate },
                          { key: 'delete', label: 'Delete', onClick: () => void remove(item.id), hidden: !canDelete, danger: true },
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
