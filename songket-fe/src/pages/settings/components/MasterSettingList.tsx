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
      <div className="card master-settings-tab-card">
        <div className="master-settings-tabs">
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

      <div className="card master-settings-card">
        <div className="entity-list-summary">
          <div className="entity-summary-card master-settings-summary-card tone-blue">
            <div className="entity-summary-label">Schedulers</div>
            <div className="entity-summary-value">{totalData}</div>
            <div className="entity-summary-note">Available configurations.</div>
          </div>
          <div className="entity-summary-card master-settings-summary-card tone-emerald">
            <div className="entity-summary-label">Configured</div>
            <div className="entity-summary-value">{configuredCount}</div>
            <div className="entity-summary-note">Already saved.</div>
          </div>
          <div className="entity-summary-card master-settings-summary-card tone-amber">
            <div className="entity-summary-label">Active</div>
            <div className="entity-summary-value">{activeCount}</div>
            <div className="entity-summary-note">Currently running.</div>
          </div>
        </div>

        <div className="master-settings-section-head">
          <div>
            <h3>Scheduler Settings</h3>
            <span>Manage saved scheduler configuration.</span>
          </div>
          <button className="btn-ghost" onClick={() => void onRefresh()} disabled={loading}>Refresh</button>
        </div>
        <Table
          className="table-list settings-list-table metric-table"
          data={paginatedSettings}
          keyField="key"
          columns={[
            {
              header: 'Setting',
              accessor: (row) => (
                <div className="table-stack-cell">
                  <div className="table-stack-primary">{row.label}</div>
                  <div className="table-stack-secondary">
                    {row.exists ? 'Configured scheduler' : 'Configuration required'}
                  </div>
                </div>
              ),
              className: 'settings-list-col-setting',
              headerClassName: 'settings-list-col-setting',
            },
            {
              header: 'Status',
              accessor: (row) => (
                <div className="table-stack-cell">
                  <div>
                    <span className={`badge ${row.status === 'ON' ? 'success' : 'pending'}`}>
                      {row.status === '-' ? 'Not Configured' : row.status === 'ON' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="table-stack-tertiary">
                    {row.exists ? 'Saved configuration' : 'No saved configuration'}
                  </div>
                </div>
              ),
              className: 'settings-list-col-status',
              headerClassName: 'settings-list-col-status',
            },
            {
              header: 'Interval',
              accessor: (row) => (
                <div className="table-stack-cell">
                  <div>
                    <span className="table-metric-pill warning">{row.interval}</span>
                  </div>
                  <div className="table-stack-tertiary">
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
                <div className="table-stack-cell">
                  <div className="table-stack-primary">{row.updatedAt}</div>
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
