import Can from '../../../components/common/Can'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'

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
        <Table
          className="table-list"
          style={{ marginTop: 10 }}
          data={paginatedSettings}
          keyField="key"
          columns={[
            { header: 'Setting', accessor: 'label' },
            { header: 'Status', accessor: 'status' },
            { header: 'Interval', accessor: 'interval' },
            { header: 'Updated', accessor: 'updatedAt' },
            {
              header: 'Action',
              accessor: (row) => (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                </div>
              ),
              className: 'action-cell',
              ignoreRowClick: true,
            },
          ]}
        />

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
