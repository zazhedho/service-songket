import Can from '../../../components/common/Can'
import Pagination from '../../../components/common/Pagination'

type MasterSettingListProps = {
  activeTab: 'settings' | 'history'
  loading: boolean
  navigate: (path: string) => void
  onRefresh: () => Promise<void>
  paginatedSettings: Array<{
    key: 'news' | 'prices'
    label: string
    exists: boolean
    status: string
    interval: string
    updatedAt: string
  }>
  remove: (option: 'news' | 'prices') => Promise<void>
  setActiveTab: React.Dispatch<React.SetStateAction<'settings' | 'history'>>
  settingsPage: number
  settingsTotalPages: number
  totalData: number
  setSettingsPage: React.Dispatch<React.SetStateAction<number>>
}

export default function MasterSettingList({
  activeTab,
  loading,
  navigate,
  onRefresh,
  paginatedSettings,
  remove,
  setActiveTab,
  settingsPage,
  settingsTotalPages,
  totalData,
  setSettingsPage,
}: MasterSettingListProps) {
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
          <h3>Master Settings Table</h3>
          <button className="btn-ghost" onClick={() => void onRefresh()} disabled={loading}>Refresh</button>
        </div>
        <table className="table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>Setting</th>
              <th>Status</th>
              <th>Interval</th>
              <th>Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSettings.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.status}</td>
                <td>{row.interval}</td>
                <td>{row.updatedAt}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {row.exists ? (
                    <>
                      <Can resource="master_settings" action="update">
                        <button className="btn-ghost" onClick={() => navigate(`/master-settings/form?action=edit&option=${row.key}`)}>Edit</button>
                      </Can>
                      <Can resource="master_settings" action="delete">
                        <button className="btn-ghost" onClick={() => void remove(row.key)}>Delete</button>
                      </Can>
                    </>
                  ) : (
                    <Can resource="master_settings" action="create">
                      <button className="btn-ghost" onClick={() => navigate(`/master-settings/form?action=create&option=${row.key}`)}>Create</button>
                    </Can>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          page={settingsPage}
          totalPages={settingsTotalPages}
          totalData={totalData}
          limit={10}
          onPageChange={setSettingsPage}
          disabled={loading}
        />
      </div>
    </>
  )
}
