import { useMemo } from 'react'
import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import SearchableSelect from '../../../components/common/SearchableSelect'
import Table from '../../../components/common/Table'
import type { ResolvedLocationNames } from '../../../hooks/useLocationNameResolver'
import { formatDate, getAttempt, lookupDisplayName } from './orderHelpers'

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
  resolveRegencyLabel: (provinceValue?: string, regencyValue?: string) => string
  showTable: boolean
  totalData: number
  totalPages: number
}

type OrderListRow = {
  consumerPhone: string
  createdAt: string
  dealerName: string
  financeCompany1Name: string
  financeCompany2Name: string
  id: string
  locationDistrict: string
  locationProvince: string
  locationRegency: string
  order: any
  resultAt: string
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

function locationParts(locationNames?: ResolvedLocationNames) {
  return {
    district: String(locationNames?.district || '').trim() || '-',
    province: String(locationNames?.province || '').trim() || '-',
    regency: String(locationNames?.regency || '').trim() || '-',
  }
}

function dealerName(dealers: any[] | undefined, order: any) {
  return lookupDisplayName(
    dealers,
    order?.dealer_id,
    order?.dealer?.name || order?.dealer_name,
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
  resolveRegencyLabel,
  showTable,
  totalData,
  totalPages,
}: OrderListViewProps) {
  const exportJobTone = exportJob?.status === 'failed' ? 'error' : exportJob?.status === 'downloaded' ? 'success' : 'info'
  const dealers = lookups?.dealers
  const financeCompanies = lookups?.finance_companies
  const statusCounts = useMemo(
    () => ({
      approve: list.filter((order) => String(order?.result_status || '').toLowerCase() === 'approve').length,
      pending: list.filter((order) => String(order?.result_status || '').toLowerCase() === 'pending').length,
      reject: list.filter((order) => String(order?.result_status || '').toLowerCase() === 'reject').length,
    }),
    [list],
  )
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'approve', label: 'Approve' },
    { value: 'pending', label: 'Pending' },
    { value: 'reject', label: 'Reject' },
  ]
  const exportProgress = Math.max(0, Math.min(100, Number(exportJob?.progress || 0)))

  const rows = useMemo<OrderListRow[]>(
    () =>
      list.map((order) => {
        const firstAttempt = getAttempt(order, 1)
        const secondAttempt = getAttempt(order, 2)
        const resolvedLocation = locationParts(locationNamesByKey[String(order?.id || '').trim()])
        const resolvedDealerName = dealerName(dealers, order)
        const resolvedRegency = resolvedLocation.regency !== '-'
          ? resolvedLocation.regency
          : resolveRegencyLabel(order?.province, order?.regency)

        return {
          consumerPhone: String(order?.consumer_phone || '').trim() || '-',
          createdAt: formatDate(order?.created_at),
          dealerName: resolvedDealerName,
          financeCompany1Name: financeName(financeCompanies, firstAttempt),
          financeCompany2Name: financeName(financeCompanies, secondAttempt),
          id: String(order?.id || ''),
          locationDistrict: resolvedLocation.district,
          locationProvince: resolvedLocation.province,
          locationRegency: resolvedRegency,
          order,
          resultAt: formatDate(order?.result_at),
          showFinanceCompany2: Boolean(secondAttempt?.finance_company_id),
          status: String(order?.result_status || ''),
        }
      }),
    [dealers, financeCompanies, list, locationNamesByKey, resolveRegencyLabel],
  )

  return (
    <div className="order-shell">
      <div className="header order-header">
        <div className="order-heading">
          <div className="order-eyebrow">Order Pipeline</div>
          <div className="order-title">Orders</div>
          <div className="order-subtitle">Track pooled credit orders, finance attempts, and export-ready date ranges.</div>
        </div>
        {canCreate && <button className="btn" onClick={() => navigate('/orders/create')}>Create Order</button>}
      </div>

      <div className="page order-page">
        <div className="card order-list-card">
          <div className="entity-list-summary">
            <div className="entity-summary-card order-summary-card tone-blue">
              <div className="entity-summary-label">Total Orders</div>
              <div className="entity-summary-value">{totalData || list.length}</div>
              <div className="entity-summary-note">Current result count.</div>
            </div>
            <div className="entity-summary-card order-summary-card tone-emerald">
              <div className="entity-summary-label">Approved / Pending</div>
              <div className="entity-summary-value">{statusCounts.approve} / {statusCounts.pending}</div>
              <div className="entity-summary-note">Current page status mix.</div>
            </div>
            <div className="entity-summary-card order-summary-card tone-red">
              <div className="entity-summary-label">Rejected</div>
              <div className="entity-summary-value">{statusCounts.reject}</div>
              <div className="entity-summary-note">Rejected in this result.</div>
            </div>
          </div>

          <div className="compact-filter-toolbar order-filter-toolbar">
            <div className="compact-filter-item grow-2 order-filter-search">
              <input
                placeholder="Search consumer or pooling number"
                value={filters.search}
                onChange={(e) => onFilterChange((prev) => ({ ...prev, search: e.target.value }))}
                aria-label="Search orders"
              />
            </div>
            <div className="compact-filter-item narrow order-filter-status">
              <SearchableSelect
                value={filters.status}
                onChange={(value) => onFilterChange((prev) => ({ ...prev, status: value }))}
                options={statusOptions}
                placeholder="All Statuses"
                searchPlaceholder="Search status..."
              />
            </div>
            <div className="compact-filter-item order-date-range">
              <div className="credit-date-field order-date-field">
                <span className="credit-date-label">From</span>
                <input
                  type="date"
                  value={filters.export_from}
                  onChange={(e) => onFilterChange((prev) => ({ ...prev, export_from: e.target.value }))}
                  aria-label="Export from date"
                />
              </div>
              <div className="order-date-separator">-</div>
              <div className="credit-date-field order-date-field">
                <span className="credit-date-label">To</span>
                <input
                  type="date"
                  value={filters.export_to}
                  onChange={(e) => onFilterChange((prev) => ({ ...prev, export_to: e.target.value }))}
                  aria-label="Export to date"
                />
              </div>
            </div>
            <div className="compact-filter-action order-filter-action">
              <button
                className="btn-ghost order-clear-btn"
                type="button"
                onClick={() => onFilterChange({ search: '', status: '', export_from: '', export_to: '' })}
                disabled={!filters.search.trim() && !filters.status && !filters.export_from && !filters.export_to}
                title="Clear all filters"
                aria-label="Clear all filters"
              >
                ×
              </button>
              <button className="btn" type="button" onClick={() => void onExport()} disabled={exportJobRunning}>
                {exportJobRunning ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>

        <div className="card order-list-card">
          <div className="order-section-head">
            <div>
              <h3>Order List</h3>
              <span>Click a row to open complete order details.</span>
            </div>
          </div>
          {!showTable && <div className="alert">You do not have permission to view orders.</div>}
          {showTable && (
            <>
              <Table
                className="order-list-table"
                data={rows}
                keyField="id"
                onRowClick={(row) => navigate(`/orders/${row.id}`, { state: { order: row.order } })}
                emptyMessage="No orders yet."
                columns={[
                  {
                    header: 'Order',
                    accessor: (row) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={row.order.pooling_number || '-'}>
                          {row.order.pooling_number || '-'}
                        </div>
                        <div className="entity-list-note table-text-ellipsis" title={row.dealerName}>
                          {row.dealerName !== '-' ? row.dealerName : 'Dealer not available'}
                        </div>
                      </div>
                    ),
                    className: 'order-list-col-order',
                    headerClassName: 'order-list-col-order',
                  },
                  {
                    header: 'Consumer',
                    accessor: (row) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title table-text-ellipsis" title={row.order.consumer_name || '-'}>
                          {row.order.consumer_name || '-'}
                        </div>
                        <div className="entity-list-note table-text-ellipsis" title={row.consumerPhone}>
                          {row.consumerPhone}
                        </div>
                      </div>
                    ),
                    className: 'order-list-col-consumer',
                    headerClassName: 'order-list-col-consumer',
                  },
                  {
                    header: 'Location',
                    accessor: (row) => {
                      const districtRegency = [row.locationDistrict, row.locationRegency]
                        .filter((value, index, array) => value && value !== '-' && array.indexOf(value) === index)
                        .join(' / ') || '-'
                      const locationTitle = districtRegency.replace(' / ', ', ')

                      return (
                        <div className="entity-list-cell">
                          <div className="entity-list-title table-text-ellipsis" title={locationTitle}>
                            {locationTitle}
                          </div>
                          <div className="entity-list-note table-text-ellipsis" title={row.locationProvince}>
                            {row.locationProvince}
                          </div>
                        </div>
                      )
                    },
                    className: 'order-list-col-location',
                    headerClassName: 'order-list-col-location',
                  },
                  {
                    header: 'Finance',
                    accessor: (row) => (
                      <div className="order-finance-stack">
                        <div className="order-finance-item">
                          <span className="order-finance-label">FC1</span>
                          <span className="order-finance-value table-text-ellipsis" title={row.financeCompany1Name}>
                            {row.financeCompany1Name}
                          </span>
                        </div>
                        {row.showFinanceCompany2 && (
                          <div className="order-finance-item secondary">
                            <span className="order-finance-label">FC2</span>
                            <span className="order-finance-value table-text-ellipsis" title={row.financeCompany2Name}>
                              {row.financeCompany2Name}
                            </span>
                          </div>
                        )}
                      </div>
                    ),
                    className: 'order-list-col-finance',
                    headerClassName: 'order-list-col-finance',
                  },
                  {
                    header: 'Credit',
                    accessor: (row) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title">{row.order.tenor ? `${row.order.tenor} months` : '-'}</div>
                        <div className="entity-list-note">
                          {Number(row.order.installment || 0) > 0 ? `Installment: ${Number(row.order.installment || 0).toLocaleString('en-US')}` : 'Installment not available'}
                        </div>
                      </div>
                    ),
                    className: 'order-list-col-credit',
                    headerClassName: 'order-list-col-credit',
                  },
                  {
                    header: 'Status',
                    accessor: (row) => (
                      <div className="entity-list-cell">
                        <div className="entity-list-title">
                          <span className={`badge ${row.status || 'pending'}`}>{row.status || '-'}</span>
                        </div>
                      </div>
                    ),
                    className: 'order-list-col-status',
                    headerClassName: 'order-list-col-status',
                  },
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
                    headerClassName: 'order-list-col-action',
                    ignoreRowClick: true,
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={7}>
                      <div className="entity-empty-state">
                        <div className="entity-empty-icon">
                          <i className="bi bi-journal-text"></i>
                        </div>
                        <div className="entity-empty-title">No orders found</div>
                        <div className="entity-empty-note">Try another keyword or create a new order to populate this list.</div>
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
          <div className={`toast-card order-export-toast ${exportJobTone}`} role="status" aria-live="polite">
            <div className="order-export-toast-head">
              <div className="toast-message">{exportJob.message || 'Export in progress'}</div>
              {(exportJob.status === 'failed' || exportJob.status === 'downloaded') && (
                <button className="toast-close" onClick={onClearExportJob} aria-label="Close export toast">x</button>
              )}
            </div>
            <div className="order-export-progress-track">
              <div
                className={`order-export-progress-fill ${exportJob.status === 'failed' ? 'failed' : ''}`}
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="order-export-toast-meta">
              {exportProgress}%
              {exportJob.error ? ` · ${exportJob.error}` : ''}
              {exportDownloading ? ' · downloading' : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
