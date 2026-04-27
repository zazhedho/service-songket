import Pagination from '../../../components/common/Pagination'

type MasterSettingHistoryProps = {
  activeTab: 'settings' | 'history'
  formatDate: (value?: string) => string
  formatHistoryInterval: (minutes: number, key?: string) => string
  formatSettingLabel: (key?: string) => string
  historiesTotalPages: number
  historyLoading: boolean
  historyPage: number
  loading: boolean
  onRefresh: () => Promise<void>
  paginatedHistories: Array<{
    id: string
    key: string
    previous_is_active: boolean
    previous_interval_minutes: number
    new_is_active: boolean
    new_interval_minutes: number
    changed_by_name?: string
    created_at?: string
  }>
  setActiveTab: React.Dispatch<React.SetStateAction<'settings' | 'history'>>
  setHistoryPage: React.Dispatch<React.SetStateAction<number>>
  totalData: number
}

export default function MasterSettingHistory({
  activeTab,
  formatDate,
  formatHistoryInterval,
  formatSettingLabel,
  historiesTotalPages,
  historyLoading,
  historyPage,
  loading,
  onRefresh,
  paginatedHistories,
  setActiveTab,
  setHistoryPage,
  totalData,
}: MasterSettingHistoryProps) {
  const renderHistoryState = (isActive: boolean, interval: number, key: string) => (
    <div className="table-stack-cell">
      <div>
        <span className={`table-metric-pill ${isActive ? 'approved' : 'rejected'}`}>{isActive ? 'ON' : 'OFF'}</span>
      </div>
      <div className="table-stack-secondary">{formatHistoryInterval(interval, key)}</div>
    </div>
  )

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={activeTab === 'settings' ? 'btn' : 'btn-ghost'}
            onClick={() => setActiveTab('settings')}
            disabled={loading}
          >
            Settings
          </button>
          <button
            className={activeTab === 'history' ? 'btn' : 'btn-ghost'}
            onClick={() => setActiveTab('history')}
            disabled={loading}
          >
            History
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Master Settings History</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {historyLoading && <div style={{ color: '#64748b', fontSize: 12 }}>Loading...</div>}
            <button className="btn-ghost" onClick={() => void onRefresh()} disabled={historyLoading || loading}>
              Refresh History
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table metric-table" style={{ marginTop: 10, minWidth: 760 }}>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Changed</th>
                <th>Previous</th>
                <th>New</th>
              </tr>
            </thead>
            <tbody>
              {paginatedHistories.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-stack-cell">
                      <div className="table-stack-primary">{formatSettingLabel(item.key)}</div>
                      <div className="table-stack-secondary">{item.key || '-'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="table-stack-cell">
                      <div className="table-stack-primary">{item.changed_by_name || '-'}</div>
                      <div className="table-stack-secondary">{formatDate(item.created_at)}</div>
                    </div>
                  </td>
                  <td>{renderHistoryState(item.previous_is_active, item.previous_interval_minutes, item.key)}</td>
                  <td>{renderHistoryState(item.new_is_active, item.new_interval_minutes, item.key)}</td>
                </tr>
              ))}
              {!historyLoading && paginatedHistories.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="table-empty-panel">No history yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={historyPage}
          totalPages={historiesTotalPages}
          totalData={totalData}
          limit={10}
          onPageChange={setHistoryPage}
          disabled={historyLoading || loading}
        />
      </div>
    </>
  )
}
