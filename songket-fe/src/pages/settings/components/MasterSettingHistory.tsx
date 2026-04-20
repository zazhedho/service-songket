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

        <table className="table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>Setting</th>
              <th>Time</th>
              <th>Changed By</th>
              <th>Previous Status</th>
              <th>Previous Interval</th>
              <th>New Status</th>
              <th>New Interval</th>
            </tr>
          </thead>
          <tbody>
            {paginatedHistories.map((item) => (
              <tr key={item.id}>
                <td>{formatSettingLabel(item.key)}</td>
                <td>{formatDate(item.created_at)}</td>
                <td>{item.changed_by_name || '-'}</td>
                <td>{item.previous_is_active ? 'ON' : 'OFF'}</td>
                <td>{formatHistoryInterval(item.previous_interval_minutes, item.key)}</td>
                <td>{item.new_is_active ? 'ON' : 'OFF'}</td>
                <td>{formatHistoryInterval(item.new_interval_minutes, item.key)}</td>
              </tr>
            ))}
            {!historyLoading && paginatedHistories.length === 0 && (
              <tr>
                <td colSpan={7}>No history yet.</td>
              </tr>
            )}
          </tbody>
        </table>

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
