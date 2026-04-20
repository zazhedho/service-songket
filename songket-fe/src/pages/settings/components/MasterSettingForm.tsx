import { usePermissions } from '../../../hooks/usePermissions'

type MasterSettingFormProps = {
  currentExists: boolean
  currentInterval: number
  currentStatus: boolean
  currentUpdatedAt: string
  formAction: 'create' | 'edit'
  intervalLabel: string
  intervalMax: number
  isNews: boolean
  loading: boolean
  navigate: (path: string) => void
  onIntervalChange: (value: number) => void
  onSave: () => Promise<void>
  onStatusChange: (value: boolean) => void
  saving: boolean
  selectedOption: 'news' | 'prices'
  setSelectedOption: React.Dispatch<React.SetStateAction<'news' | 'prices'>>
}

export default function MasterSettingForm({
  currentExists,
  currentInterval,
  currentStatus,
  currentUpdatedAt,
  formAction,
  intervalLabel,
  intervalMax,
  isNews,
  loading,
  navigate,
  onIntervalChange,
  onSave,
  onStatusChange,
  saving,
  selectedOption,
  setSelectedOption,
}: MasterSettingFormProps) {
  const { hasPermission } = usePermissions()
  const canSave = formAction === 'create'
    ? hasPermission('master_settings', 'create')
    : hasPermission('master_settings', 'update')

  return (
    <div className="card" style={{ maxWidth: 860 }}>
      <h3 style={{ marginBottom: 10 }}>
        {formAction === 'create' ? 'Create Scheduler Setting' : 'Edit Scheduler Setting'}
      </h3>

      <div style={{ marginBottom: 10 }}>
        <label>Setting Option</label>
        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value as 'news' | 'prices')}
          disabled={loading || saving}
        >
          <option value="news">News Scrape Scheduler</option>
          <option value="prices">Commodity Price Scrape Scheduler</option>
        </select>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Scheduler Status</label>
        <select
          value={currentStatus ? 'on' : 'off'}
          onChange={(e) => onStatusChange(e.target.value === 'on')}
          disabled={loading || saving}
        >
          <option value="on">ON</option>
          <option value="off">OFF</option>
        </select>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>{intervalLabel}</label>
        <input
          type="number"
          min={0}
          max={intervalMax}
          step={1}
          value={currentInterval}
          onChange={(e) => {
            const next = Number(e.target.value)
            onIntervalChange(Number.isFinite(next) ? next : 0)
          }}
          disabled={loading || saving}
        />
      </div>

      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
        {isNews
          ? 'Valid range: 1 - 43200 minutes (1 month). Input 0 will automatically switch scheduler status to OFF.'
          : 'Valid range: 1 - 31 days. Input 0 will automatically switch scheduler status to OFF.'}
      </div>

      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
        Current state: {currentExists ? 'Exists' : 'Not created yet'} | Last updated: {currentUpdatedAt}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => void onSave()} disabled={!canSave || loading || saving}>
          {saving ? 'Saving...' : formAction === 'create' ? 'Create Setting' : 'Save Setting'}
        </button>
        <button className="btn-ghost" onClick={() => navigate('/master-settings')}>
          Back to Table
        </button>
      </div>
    </div>
  )
}
