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

export default function MotorTypeList({
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
}: MotorTypeListProps) {
  const uniqueBrands = new Set(items.map((item: any) => String(item?.brand || '').trim()).filter(Boolean)).size
  const uniqueAreas = new Set(
    items
      .map((item: any) => [item?.regency_name, item?.province_name].filter(Boolean).join(' / '))
      .filter(Boolean),
  ).size

  const provinceOptions = [
    { value: '', label: 'All Provinces' },
    ...provinces.map((province: any) => ({ value: province.code, label: province.name })),
  ]

  const regencyOptions = [
    { value: '', label: 'All Regencies' },
    ...filterRegencies.map((regency: any) => ({ value: regency.code, label: regency.name })),
  ]

  const splitDateTime = (value?: string) => {
    const label = formatDate(value)
    if (!label || label === '-') return { date: '-', time: '' }
    const match = label.match(/^(.*?)(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)$/i)
    if (!match) return { date: label, time: '' }
    return {
      date: match[1].trim().replace(/,$/, '') || label,
      time: match[2].trim(),
    }
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Types</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Manage motor type references and their area coverage.
          </div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/motor-types/create')}>Create Motor Type</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="entity-list-summary">
            <div className="entity-summary-card">
              <div className="entity-summary-label">Total Motor Types</div>
              <div className="entity-summary-value">{totalData || items.length}</div>
              <div className="entity-summary-note">Current result count for motor type data.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Brands</div>
              <div className="entity-summary-value">{uniqueBrands}</div>
              <div className="entity-summary-note">Distinct brands in the current result set.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Areas</div>
              <div className="entity-summary-value">{uniqueAreas}</div>
              <div className="entity-summary-note">Distinct regency and province combinations.</div>
            </div>
          </div>

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
                className="motor-type-list-table metric-table"
                data={items}
                keyField="id"
                onRowClick={(item: any) => navigate(`/motor-types/${item.id}`, { state: { motorType: item } })}
                emptyMessage="No motor type data yet."
                columns={[
                  {
                    header: 'Motor Type',
                    accessor: (item: any) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={item.name || '-'}>
                          {item.name || '-'}
                        </div>
                        <div className="entity-list-note table-text-ellipsis" title={item.type || '-'}>
                          {item.type || 'No variant'}
                        </div>
                      </div>
                    ),
                    className: 'motor-type-col-type',
                    headerClassName: 'motor-type-col-type',
                  },
                  {
                    header: 'Brand / Model',
                    accessor: (item: any) => {
                      const brandModel = [item.brand, item.model].filter(Boolean).join(' / ') || '-'
                      return (
                        <div className="entity-list-cell">
                          <div className="entity-list-title table-text-ellipsis" title={brandModel}>{brandModel}</div>
                        </div>
                      )
                    },
                    className: 'motor-type-col-brand',
                    headerClassName: 'motor-type-col-brand',
                  },
                  {
                    header: 'OTR',
                    accessor: (item: any) => (
                      <div className="table-metric-cell">
                        <span className="table-metric-pill total">{formatRupiah(item.otr || 0)}</span>
                      </div>
                    ),
                    className: 'motor-type-col-otr',
                    headerClassName: 'motor-type-col-otr',
                  },
                  {
                    header: 'Area',
                    accessor: (item: any) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={item.regency_name || '-'}>
                          {item.regency_name || '-'}
                        </div>
                        <div className="entity-list-note table-text-ellipsis" title={item.province_name || '-'}>
                          {item.province_name || '-'}
                        </div>
                      </div>
                    ),
                    className: 'motor-type-col-area',
                    headerClassName: 'motor-type-col-area',
                  },
                  {
                    header: 'Updated',
                    accessor: (item: any) => {
                      const updatedAt = splitDateTime(item.updated_at)
                      return (
                        <div className="table-date-cell">
                          <div className="table-date-primary">{updatedAt.date}</div>
                          {updatedAt.time && <div className="table-date-secondary">{updatedAt.time}</div>}
                        </div>
                      )
                    },
                    className: 'motor-type-col-updated',
                    headerClassName: 'motor-type-col-updated',
                  },
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
                    headerClassName: 'motor-type-col-action',
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={6}>
                      <div className="entity-empty-state">
                        <div className="entity-empty-icon">
                          <i className="bi bi-bicycle"></i>
                        </div>
                        <div className="entity-empty-title">No motor types found</div>
                        <div className="entity-empty-note">Try another keyword or create a new motor type to get started.</div>
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
