import { usePermissions } from '../../../hooks/usePermissions'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { sanitizeDigits } from '../../../utils/input'

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
  const settingOptions = [
    { value: 'news', label: 'News Scrape Scheduler' },
    { value: 'prices', label: 'Commodity Price Scrape Scheduler' },
  ]
  const statusOptions = [
    { value: 'on', label: 'ON' },
    { value: 'off', label: 'OFF' },
  ]

  return (
    <div className="card master-settings-form-card">
      <div className="master-settings-section-head">
        <div>
          <h3>{formAction === 'create' ? 'Create Scheduler Setting' : 'Edit Scheduler Setting'}</h3>
          <span>Choose scheduler type, active state, and interval.</span>
        </div>
      </div>

      <div className="master-settings-form-grid">
        <div>
          <label>Setting Option</label>
          <SearchableSelect
            value={selectedOption}
            onChange={(value) => setSelectedOption(value as 'news' | 'prices')}
            options={settingOptions}
            placeholder="Select setting option"
            searchPlaceholder="Search setting option..."
            disabled={loading || saving}
          />
        </div>

        <div>
          <label>Scheduler Status</label>
          <SearchableSelect
            value={currentStatus ? 'on' : 'off'}
            onChange={(value) => onStatusChange(value === 'on')}
            options={statusOptions}
            placeholder="Select scheduler status"
            searchPlaceholder="Search scheduler status..."
            disabled={loading || saving}
          />
        </div>

        <div>
          <label>{intervalLabel}</label>
          <input
            type="text"
            inputMode="numeric"
            value={currentInterval}
            onChange={(e) => {
              const next = Math.min(intervalMax, Number(sanitizeDigits(e.target.value) || '0'))
              onIntervalChange(Number.isFinite(next) ? next : 0)
            }}
            disabled={loading || saving}
            maxLength={String(intervalMax).length}
            placeholder={`Enter ${intervalLabel.toLowerCase()}`}
          />
        </div>
      </div>

      <div className="master-settings-help">
        {isNews
          ? 'Valid range: 1 - 43200 minutes (1 month). Input 0 will automatically switch scheduler status to OFF.'
          : 'Valid range: 1 - 31 days. Input 0 will automatically switch scheduler status to OFF.'}
      </div>

      <div className="master-settings-current-state">
        Current state: {currentExists ? 'Exists' : 'Not created yet'} | Last updated: {currentUpdatedAt}
      </div>

      <div className="master-settings-form-actions">
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
