import { useMemo } from 'react'
import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import SearchableSelect from '../../../components/common/SearchableSelect'
import Table from '../../../components/common/Table'
import type { ResolvedLocationNames } from '../../../hooks/useLocationNameResolver'
import { getAttempt, lookupDisplayName } from './orderHelpers'

type OrderListViewProps = {
  canCreate: boolean
  canDelete: boolean
  canUpdate: boolean
  exportDownloading: boolean
  exportJob: {
    id: string
    status: string
    progress: number
    message: string
    file_name?: string
    error?: string
  } | null
  exportJobRunning: boolean
  filters: { search: string; status: string; export_from: string; export_to: string }
  limit: number
  list: any[]
  locationNamesByKey: Record<string, ResolvedLocationNames>
  lookups: any
  navigate: (path: string, options?: any) => void
  onExport: () => Promise<void>
  onClearExportJob: () => void
  onFilterChange: React.Dispatch<React.SetStateAction<{ search: string; status: string; export_from: string; export_to: string }>>
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
  onRemove: (id: string) => Promise<void>
  page: number
  provinces: any[]
  showTable: boolean
  totalData: number
  totalPages: number
}

type OrderListRow = {
  financeCompany1Name: string
  financeCompany2Name: string
  id: string
  locationLabel: string
  order: any
  showFinanceCompany2: boolean
  status: string
}

function financeName(financeCompanies: any[] | undefined, attempt: any) {
  return lookupDisplayName(
    financeCompanies,
    attempt?.finance_company_id,
    attempt?.finance_company?.name,
  )
}

function orderLocationLabel(
  locationNames?: ResolvedLocationNames,
) {
  return (
    [locationNames?.district, locationNames?.regency, locationNames?.province]
      .filter((item) => String(item || '').trim() && item !== '-')
      .join(', ') || '-'
  )
}

export default function OrderListView({
  canCreate,
  canDelete,
  canUpdate,
  exportDownloading,
  exportJob,
  exportJobRunning,
  filters,
  limit,
  list,
  locationNamesByKey,
  lookups,
  navigate,
  onExport,
  onClearExportJob,
  onFilterChange,
  onLimitChange,
  onPageChange,
  onRemove,
  page,
  showTable,
  totalData,
  totalPages,
}: OrderListViewProps) {
  const exportJobTone = exportJob?.status === 'failed' ? 'error' : exportJob?.status === 'downloaded' ? 'success' : 'info'
  const financeCompanies = lookups?.finance_companies
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'approve', label: 'Approve' },
    { value: 'pending', label: 'Pending' },
    { value: 'reject', label: 'Reject' },
  ]

  const rows = useMemo<OrderListRow[]>(
    () =>
      list.map((order) => {
        const firstAttempt = getAttempt(order, 1)
        const secondAttempt = getAttempt(order, 2)

        return {
          financeCompany1Name: financeName(financeCompanies, firstAttempt),
          financeCompany2Name: financeName(financeCompanies, secondAttempt),
          id: String(order?.id || ''),
          locationLabel: orderLocationLabel(locationNamesByKey[String(order?.id || '').trim()]),
          order,
          showFinanceCompany2: Boolean(secondAttempt?.finance_company_id),
          status: String(order?.result_status || ''),
        }
      }),
    [financeCompanies, list, locationNamesByKey],
  )

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Orders</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/orders/create')}>Create Order</button>}
      </div>

      <div className="page">
        <div className="card">
          <div className="compact-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input
                placeholder="Search consumer or pooling number"
                value={filters.search}
                onChange={(e) => onFilterChange((prev) => ({ ...prev, search: e.target.value }))}
                aria-label="Search orders"
              />
            </div>
            <div className="compact-filter-item narrow">
              <SearchableSelect
                value={filters.status}
                onChange={(value) => onFilterChange((prev) => ({ ...prev, status: value }))}
                options={statusOptions}
                placeholder="All Statuses"
                searchPlaceholder="Search status..."
              />
            </div>
            <div className="compact-filter-item narrow">
              <div className="credit-date-field">
                <span className="credit-date-label">From</span>
                <input
                  type="date"
                  value={filters.export_from}
                  onChange={(e) => onFilterChange((prev) => ({ ...prev, export_from: e.target.value }))}
                  aria-label="Export from date"
                />
              </div>
            </div>
            <div className="compact-filter-item narrow">
              <div className="credit-date-field">
                <span className="credit-date-label">To</span>
                <input
                  type="date"
                  value={filters.export_to}
                  onChange={(e) => onFilterChange((prev) => ({ ...prev, export_to: e.target.value }))}
                  aria-label="Export to date"
                />
              </div>
            </div>
            <div className="compact-filter-action">
              <button
                className="btn-ghost"
                type="button"
                onClick={() => onFilterChange({ search: '', status: '', export_from: '', export_to: '' })}
                disabled={!filters.search.trim() && !filters.status && !filters.export_from && !filters.export_to}
                title="Clear all filters"
                aria-label="Clear all filters"
                style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
              >
                ×
              </button>
              <button className="btn" type="button" onClick={() => void onExport()} disabled={exportJobRunning}>
                {exportJobRunning ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Order List</h3>
          {!showTable && <div className="alert">You do not have permission to view orders.</div>}
          {showTable && (
            <>
              <Table
                data={rows}
                keyField="id"
                onRowClick={(row) => navigate(`/orders/${row.id}`, { state: { order: row.order } })}
                emptyMessage="No orders yet."
                columns={[
                  { header: 'Pooling', accessor: (row) => row.order.pooling_number },
                  { header: 'Consumer', accessor: (row) => row.order.consumer_name },
                  { header: 'Location', accessor: 'locationLabel' },
                  {
                    header: 'Finance',
                    accessor: (row) => (
                      <>
                        <div>{row.financeCompany1Name}</div>
                        {row.showFinanceCompany2 && (
                          <div style={{ color: '#64748b', fontSize: 12 }}>
                            FC2: {row.financeCompany2Name}
                          </div>
                        )}
                      </>
                    ),
                  },
                  {
                    header: 'Status',
                    accessor: (row) => <span className={`badge ${row.status}`}>{row.status}</span>,
                  },
                  { header: 'Tenor', accessor: (row) => `${row.order.tenor} months` },
                  {
                    header: 'Action',
                    accessor: (row) => (
                      <ActionMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`/orders/${row.id}`, { state: { order: row.order } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`/orders/${row.id}/edit`, { state: { order: row.order } }),
                            hidden: !canUpdate,
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            onClick: () => void onRemove(row.id),
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
                onPageChange={onPageChange}
                onLimitChange={(next) => {
                  onLimitChange(next)
                  onPageChange(1)
                }}
              />
            </>
          )}
        </div>
      </div>

      {exportJob && (
        <div className="toast-stack">
          <div className={`toast-card ${exportJobTone}`} role="status" aria-live="polite" style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div className="toast-message">{exportJob.message || 'Export in progress'}</div>
              {(exportJob.status === 'failed' || exportJob.status === 'downloaded') && (
                <button className="toast-close" onClick={onClearExportJob} aria-label="Close export toast">x</button>
              )}
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(15, 23, 42, 0.12)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, Number(exportJob.progress || 0)))}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: exportJob.status === 'failed' ? '#ef4444' : '#2563eb',
                  transition: 'width 220ms ease',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#334155' }}>
              {Math.max(0, Math.min(100, Number(exportJob.progress || 0)))}%
              {exportJob.error ? ` · ${exportJob.error}` : ''}
              {exportDownloading ? ' · downloading' : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
