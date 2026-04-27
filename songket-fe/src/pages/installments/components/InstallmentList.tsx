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
  const uniqueBrands = new Set(
    items.map((item: any) => String(item?.motor_type?.brand || '').trim()).filter(Boolean),
  ).size
  const uniqueAreas = new Set(
    items
      .map((item: any) => [item?.motor_type?.regency_name, item?.motor_type?.province_name].filter(Boolean).join(' / '))
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Motor Types & Installments</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Review installment references for each motor type and area.
          </div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/installments/create')}>Create Motor & Installment</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="entity-list-summary">
            <div className="entity-summary-card">
              <div className="entity-summary-label">Total Installments</div>
              <div className="entity-summary-value">{totalData || items.length}</div>
              <div className="entity-summary-note">Current result count for installment data.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Brands</div>
              <div className="entity-summary-value">{uniqueBrands}</div>
              <div className="entity-summary-note">Distinct motor brands in the current result set.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Areas</div>
              <div className="entity-summary-value">{uniqueAreas}</div>
              <div className="entity-summary-note">Distinct regency and province combinations.</div>
            </div>
          </div>

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
                className="installment-list-table metric-table"
                data={items}
                keyField="id"
                onRowClick={(item) => navigate(`/installments/${item.id}`, { state: { item } })}
                emptyMessage="No data available."
                columns={[
                  {
                    header: 'Motor Type',
                    accessor: (item) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={item.motor_type?.name || '-'}>
                          {item.motor_type?.name || '-'}
                        </div>
                        <div className="entity-list-note table-text-ellipsis" title={item.motor_type?.type || '-'}>
                          {item.motor_type?.type || 'No variant'}
                        </div>
                      </div>
                    ),
                    className: 'installment-col-type',
                    headerClassName: 'installment-col-type',
                  },
                  {
                    header: 'Brand / Model',
                    accessor: (item) => {
                      const brandModel = [item.motor_type?.brand, item.motor_type?.model].filter(Boolean).join(' / ') || '-'
                      return (
                        <div className="entity-list-cell">
                          <div className="entity-list-title table-text-ellipsis" title={brandModel}>{brandModel}</div>
                        </div>
                      )
                    },
                    className: 'installment-col-brand',
                    headerClassName: 'installment-col-brand',
                  },
                  {
                    header: 'OTR',
                    accessor: (item) => (
                      <div className="table-metric-cell">
                        <span className="table-metric-pill total">{formatRupiah(Number(item.motor_type?.otr || 0))}</span>
                      </div>
                    ),
                    className: 'installment-col-otr',
                    headerClassName: 'installment-col-otr',
                  },
                  {
                    header: 'Area',
                    accessor: (item) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={item.motor_type?.regency_name || '-'}>
                          {item.motor_type?.regency_name || '-'}
                        </div>
                        <div className="entity-list-note table-text-ellipsis" title={item.motor_type?.province_name || '-'}>
                          {item.motor_type?.province_name || '-'}
                        </div>
                      </div>
                    ),
                    className: 'installment-col-area',
                    headerClassName: 'installment-col-area',
                  },
                  {
                    header: 'Installment',
                    accessor: (item) => (
                      <div className="table-metric-cell">
                        <span className="table-metric-pill warning">{formatRupiah(Number(item.amount || 0))}</span>
                      </div>
                    ),
                    className: 'installment-col-amount',
                    headerClassName: 'installment-col-amount',
                  },
                  {
                    header: 'Updated',
                    accessor: (item) => {
                      const updatedAt = splitDateTime(item.updated_at)
                      return (
                        <div className="table-date-cell">
                          <div className="table-date-primary">{updatedAt.date}</div>
                          {updatedAt.time && <div className="table-date-secondary">{updatedAt.time}</div>}
                        </div>
                      )
                    },
                    className: 'installment-col-updated',
                    headerClassName: 'installment-col-updated',
                  },
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
                    headerClassName: 'installment-col-action',
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={7}>
                      <div className="entity-empty-state">
                        <div className="entity-empty-icon">
                          <i className="bi bi-receipt"></i>
                        </div>
                        <div className="entity-empty-title">No installment rows found</div>
                        <div className="entity-empty-note">Try another keyword or create a new installment entry to get started.</div>
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
