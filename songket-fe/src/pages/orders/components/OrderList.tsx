import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import { getAttempt, lookupName, lookupOptionName, normalizeCode } from './orderHelpers'

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
  kabupatenLookup: Record<string, string>
  kecamatanLookup: Record<string, string>
  limit: number
  list: any[]
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

export default function OrderListView({
  canCreate,
  canDelete,
  canUpdate,
  exportDownloading,
  exportJob,
  exportJobRunning,
  filters,
  kabupatenLookup,
  kecamatanLookup,
  limit,
  list,
  lookups,
  navigate,
  onExport,
  onClearExportJob,
  onFilterChange,
  onLimitChange,
  onPageChange,
  onRemove,
  page,
  provinces,
  showTable,
  totalData,
  totalPages,
}: OrderListViewProps) {
  const exportJobTone = exportJob?.status === 'failed' ? 'error' : exportJob?.status === 'downloaded' ? 'success' : 'info'

  const orderLocationLabel = (order: any) => {
    const provinceCode = String(order?.province || '').trim()
    const regencyCode = String(order?.regency || '').trim()
    const districtCode = String(order?.district || '').trim()

    const provinceName = lookupOptionName(provinces, provinceCode)
    const provinceKey = normalizeCode(provinceCode)
    const regencyKey = normalizeCode(regencyCode)
    const districtKey = normalizeCode(districtCode)

    const regencyName = regencyCode
      ? kabupatenLookup[`${provinceKey}|${regencyKey}`] || regencyCode
      : '-'
    const districtName = districtCode
      ? kecamatanLookup[`${provinceKey}|${regencyKey}|${districtKey}`] || districtCode
      : '-'

    return (
      [districtName, regencyName, provinceName]
        .filter((item) => String(item || '').trim() && item !== '-')
        .join(', ') || '-'
    )
  }

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
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <label>Search</label>
              <input placeholder="Search .." value={filters.search} onChange={(e) => onFilterChange((prev) => ({ ...prev, search: e.target.value }))} />
            </div>
            <div>
              <label>Status</label>
              <select value={filters.status} onChange={(e) => onFilterChange((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="">All</option>
                <option value="approve">Approve</option>
                <option value="pending">Pending</option>
                <option value="reject">Reject</option>
              </select>
            </div>
            <div>
              <label>Export From</label>
              <input
                type="date"
                value={filters.export_from}
                onChange={(e) => onFilterChange((prev) => ({ ...prev, export_from: e.target.value }))}
              />
            </div>
            <div>
              <label>Export To</label>
              <input
                type="date"
                value={filters.export_to}
                onChange={(e) => onFilterChange((prev) => ({ ...prev, export_to: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button
                className="btn"
                type="button"
                onClick={() => void onExport()}
                disabled={exportJobRunning}
                style={{ width: '100%' }}
              >
                {exportJobRunning ? 'Exporting...' : 'Export to Excel'}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Order List</h3>
          {!showTable && <div className="alert">You do not have permission to view orders.</div>}
          {showTable && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Pooling</th>
                    <th>Consumer</th>
                    <th>Location</th>
                    <th>Finance</th>
                    <th>Status</th>
                    <th>Tenor</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((order) => (
                    <tr key={order.id}>
                      <td>{order.pooling_number}</td>
                      <td>{order.consumer_name}</td>
                      <td>{orderLocationLabel(order)}</td>
                      <td>
                        <div>{lookupName(lookups?.finance_companies, getAttempt(order, 1)?.finance_company_id)}</div>
                        {getAttempt(order, 2)?.finance_company_id && (
                          <div style={{ color: '#64748b', fontSize: 12 }}>
                            FC2: {lookupName(lookups?.finance_companies, getAttempt(order, 2)?.finance_company_id)}
                          </div>
                        )}
                      </td>
                      <td><span className={`badge ${order.result_status}`}>{order.result_status}</span></td>
                      <td>{order.tenor} months</td>
                      <td className="action-cell">
                        <ActionMenu
                          items={[
                            {
                              key: 'view',
                              label: 'View',
                              onClick: () => navigate(`/orders/${order.id}`, { state: { order } }),
                            },
                            {
                              key: 'edit',
                              label: 'Edit',
                              onClick: () => navigate(`/orders/${order.id}/edit`, { state: { order } }),
                              hidden: !canUpdate,
                            },
                            {
                              key: 'delete',
                              label: 'Delete',
                              onClick: () => void onRemove(order.id),
                              hidden: !canDelete,
                              danger: true,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={7}>No orders yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>

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
