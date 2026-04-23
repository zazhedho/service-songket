import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'
import { usePermissions } from '../../../hooks/usePermissions'

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
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('master_settings', 'create')
  const canUpdate = hasPermission('master_settings', 'update')
  const canDelete = hasPermission('master_settings', 'delete')
  const configuredCount = paginatedSettings.filter((item) => item.exists).length
  const activeCount = paginatedSettings.filter((item) => item.status === 'ON').length

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
        <div className="entity-list-summary">
          <div className="entity-summary-card">
            <div className="entity-summary-label">Schedulers</div>
            <div className="entity-summary-value">{totalData}</div>
            <div className="entity-summary-note">Available scheduler configurations in this module.</div>
          </div>
          <div className="entity-summary-card">
            <div className="entity-summary-label">Configured</div>
            <div className="entity-summary-value">{configuredCount}</div>
            <div className="entity-summary-note">Scheduler entries that already have saved configuration.</div>
          </div>
          <div className="entity-summary-card">
            <div className="entity-summary-label">Active</div>
            <div className="entity-summary-value">{activeCount}</div>
            <div className="entity-summary-note">Schedulers currently running with an active status.</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Master Settings Table</h3>
          <button className="btn-ghost" onClick={() => void onRefresh()} disabled={loading}>Refresh</button>
        </div>
        <Table
          className="table-list settings-list-table"
          style={{ marginTop: 10 }}
          data={paginatedSettings}
          keyField="key"
          columns={[
            {
              header: 'Setting',
              accessor: (row) => (
                <div className="entity-list-cell">
                  <div className="entity-list-title">{row.label}</div>
                  <div className="entity-list-note">
                    {row.exists ? 'Configuration available for this scheduler.' : 'Configuration has not been created yet.'}
                  </div>
                </div>
              ),
              className: 'settings-list-col-setting',
              headerClassName: 'settings-list-col-setting',
            },
            {
              header: 'Status',
              accessor: (row) => (
                <div className="entity-list-cell">
                  <div className="entity-list-title">
                    <span className={`badge ${row.status === 'ON' ? 'success' : 'pending'}`}>
                      {row.status === '-' ? 'Not Configured' : row.status === 'ON' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="entity-list-note">
                    {row.status === 'ON'
                      ? 'Scheduler is enabled and ready to run.'
                      : row.exists
                        ? 'Scheduler is saved but currently disabled.'
                        : 'Create a scheduler configuration first.'}
                  </div>
                </div>
              ),
              className: 'settings-list-col-status',
              headerClassName: 'settings-list-col-status',
            },
            {
              header: 'Interval',
              accessor: (row) => (
                <div className="entity-list-cell">
                  <div className="entity-list-title">{row.interval}</div>
                  <div className="entity-list-note">
                    {row.key === 'news' ? 'Runs in minute-based intervals.' : 'Runs in day-based intervals.'}
                  </div>
                </div>
              ),
              className: 'settings-list-col-interval',
              headerClassName: 'settings-list-col-interval',
            },
            {
              header: 'Updated',
              accessor: (row) => (
                <div className="entity-list-cell">
                  <div className="entity-list-title">{row.updatedAt}</div>
                </div>
              ),
              className: 'settings-list-col-updated',
              headerClassName: 'settings-list-col-updated',
            },
            {
              header: 'Action',
              accessor: (row) => (
                <ActionMenu
                  items={[
                    {
                      key: 'create',
                      label: 'Create',
                      onClick: () => navigate(`/master-settings/form?action=create&option=${row.key}`),
                      hidden: row.exists || !canCreate,
                    },
                    {
                      key: 'edit',
                      label: 'Edit',
                      onClick: () => navigate(`/master-settings/form?action=edit&option=${row.key}`),
                      hidden: !row.exists || !canUpdate,
                    },
                    {
                      key: 'delete',
                      label: 'Delete',
                      onClick: () => void remove(row.key),
                      hidden: !row.exists || !canDelete,
                      danger: true,
                    },
                  ]}
                />
              ),
              className: 'action-cell',
              headerClassName: 'settings-list-col-action',
              ignoreRowClick: true,
              style: { width: '1%' },
            },
          ]}
          emptyState={
            <tr>
              <td colSpan={5}>
                <div className="entity-empty-state">
                  <div className="entity-empty-icon">
                    <i className="bi bi-sliders"></i>
                  </div>
                  <div className="entity-empty-title">No scheduler settings found</div>
                  <div className="entity-empty-note">Refresh the data or create a scheduler configuration to get started.</div>
                </div>
              </td>
            </tr>
          }
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
