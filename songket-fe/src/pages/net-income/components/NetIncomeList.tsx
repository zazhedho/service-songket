import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

type NetIncomeListProps = {
  areaLabel: (area: any) => string
  canCreate: boolean
  canDelete: boolean
  canList: boolean
  canUpdate: boolean
  formatDate: (value?: string) => string
  formatRupiah: (value: number) => string
  items: any[]
  jobName: (id: string, fallback?: string) => string
  limit: number
  navigate: (path: string, options?: any) => void
  page: number
  remove: (id: string) => Promise<void>
  search: string
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  totalData: number
  totalPages: number
}

function looksLikeLocationCode(value?: string) {
  const raw = String(value || '').trim()
  if (!raw) return false
  if (/^\d+$/.test(raw)) return true
  if (!/\s/.test(raw) && /^[A-Z0-9._-]+$/.test(raw) && /[0-9._-]/.test(raw)) return true
  return false
}

function summarizeAreas(areas: any[], areaLabel: (area: any) => string) {
  const safeAreas = Array.isArray(areas) ? areas : []
  const regencies = safeAreas
    .map((area) => String(area?.regency_name || '').trim())
    .filter((value) => value && !looksLikeLocationCode(value))
  const provinces = Array.from(new Set(
    safeAreas
      .map((area) => String(area?.province_name || '').trim())
      .filter((value) => value && !looksLikeLocationCode(value)),
  ))
  const fullCoverage = safeAreas.length
    ? safeAreas.map((area) => areaLabel(area)).filter(Boolean).join(', ')
    : '-'

  const headline = regencies.length === 0
    ? '-'
    : regencies.length === 1
      ? regencies[0]
      : `${regencies[0]} + ${regencies.length - 1} more`

  const provinceLine = provinces.length === 0
    ? 'No province data'
    : provinces.join(', ')

  return {
    countLabel: `${safeAreas.length} area${safeAreas.length === 1 ? '' : 's'}`,
    fullCoverage,
    headline,
    provinceLine,
  }
}

export default function NetIncomeList({
  areaLabel,
  canCreate,
  canDelete,
  canList,
  canUpdate,
  formatDate,
  formatRupiah,
  items,
  jobName,
  limit,
  navigate,
  page,
  remove,
  search,
  setLimit,
  setPage,
  setSearch,
  totalData,
  totalPages,
}: NetIncomeListProps) {
  const uniqueJobs = new Set(items.map((item) => String(item?.job_id || item?.job_name || '').trim()).filter(Boolean)).size
  const uniqueAreas = new Set(
    items.flatMap((item) =>
      Array.isArray(item?.area_net_income)
        ? item.area_net_income.map((area: any) => areaLabel(area)).filter(Boolean)
        : [],
    ),
  ).size

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Net Income</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Review net income benchmarks across jobs and areas.
          </div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/net-income/create')}>Create Net Income</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="entity-list-summary">
            <div className="entity-summary-card">
              <div className="entity-summary-label">Total Net Income Rows</div>
              <div className="entity-summary-value">{totalData || items.length}</div>
              <div className="entity-summary-note">Current result count for net income data.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Unique Jobs</div>
              <div className="entity-summary-value">{uniqueJobs}</div>
              <div className="entity-summary-note">Distinct jobs in the current result set.</div>
            </div>
            <div className="entity-summary-card">
              <div className="entity-summary-label">Unique Areas</div>
              <div className="entity-summary-value">{uniqueAreas}</div>
              <div className="entity-summary-note">Distinct area labels configured in this result set.</div>
            </div>
          </div>

          <div className="compact-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job name" aria-label="Search job name" />
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

          <h3>Net Income List</h3>
          {!canList && <div className="alert">No permission to view net income data.</div>}
          {canList && (
            <>
              <Table
                className="net-income-list-table"
                data={items}
                keyField="id"
                onRowClick={(item) => navigate(`/net-income/${item.id}`, { state: { item } })}
                emptyMessage="No net income data yet."
                columns={[
                  {
                    header: 'Job',
                    accessor: (item) => {
                      const areaSummary = summarizeAreas(item.area_net_income, areaLabel)
                      return (
                        <div className="entity-list-cell">
                          <div className="entity-list-title table-text-ellipsis" title={jobName(item.job_id, item.job_name)}>
                            {jobName(item.job_id, item.job_name)}
                          </div>
                          <div className="entity-list-note">{areaSummary.countLabel}</div>
                        </div>
                      )
                    },
                    className: 'net-income-col-job',
                    headerClassName: 'net-income-col-job',
                  },
                  {
                    header: 'Net Income',
                    accessor: (item) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title">{formatRupiah(Number(item.net_income || 0))}</div>
                      </div>
                    ),
                    className: 'net-income-col-income',
                    headerClassName: 'net-income-col-income',
                  },
                  {
                    header: 'Area Coverage',
                    accessor: (item) => {
                      const areaSummary = summarizeAreas(item.area_net_income, areaLabel)
                      return (
                        <div className="entity-list-cell">
                          <div className="entity-list-title table-text-ellipsis" title={areaSummary.fullCoverage}>
                            {areaSummary.headline}
                          </div>
                          <div className="entity-list-note table-text-ellipsis" title={areaSummary.provinceLine}>
                            {areaSummary.provinceLine}
                          </div>
                        </div>
                      )
                    },
                    className: 'net-income-col-area',
                    headerClassName: 'net-income-col-area',
                  },
                  {
                    header: 'Updated',
                    accessor: (item) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title">{formatDate(item.updated_at)}</div>
                      </div>
                    ),
                    className: 'net-income-col-updated',
                    headerClassName: 'net-income-col-updated',
                  },
                  {
                    header: 'Action',
                    accessor: (item) => (
                      <ActionMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`/net-income/${item.id}`, { state: { item } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`/net-income/${item.id}/edit`, { state: { item } }),
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
                    headerClassName: 'net-income-col-action',
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={5}>
                      <div className="entity-empty-state">
                        <div className="entity-empty-icon">
                          <i className="bi bi-cash-stack"></i>
                        </div>
                        <div className="entity-empty-title">No net income rows found</div>
                        <div className="entity-empty-note">Try another keyword or create a new net income entry to get started.</div>
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
