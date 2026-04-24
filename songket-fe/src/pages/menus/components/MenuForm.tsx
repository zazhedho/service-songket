import { AppIcon, ICON_LABELS, MENU_ICON_OPTIONS } from '../../../components/common/AppIcon'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { sanitizeDigits } from '../../../utils/input'

type MenuFormProps = {
  canUpdate: boolean
  error: string
  form: any
  loading: boolean
  navigate: (path: string) => void
  parentOptions: any[]
  save: () => Promise<void>
  selectedParentInOptions: boolean
  selectedParentLabel: string
  set: (key: string, value: any) => void
}

export default function MenuForm({
  canUpdate,
  error,
  form,
  loading,
  navigate,
  parentOptions,
  save,
  selectedParentInOptions,
  selectedParentLabel,
  set,
}: MenuFormProps) {
  const parentMenuOptions = [
    { value: '', label: 'None (Root Menu)' },
    ...(!selectedParentInOptions && form.parent_id
      ? [{ value: String(form.parent_id), label: selectedParentLabel || 'Current Parent' }]
      : []),
    ...parentOptions.map((parent: any) => ({
      value: String(parent.id || ''),
      label: String(parent.label || parent.name || parent.id || '-'),
    })),
  ]

  const statusOptions = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ]

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Edit Menu</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/menus')}>Back to Table</button>
      </div>

      <div className="page">
        <div className="card" style={{ width: '100%' }}>
          {!canUpdate && <div className="alert">No permission to update menu.</div>}

          <div className="grid" style={{ gap: 10 }}>
            <div><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter menu name" /></div>
            <div><label>Display Name</label><input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="Enter display name" /></div>
            <div><label>Path</label><input value={form.path} onChange={(e) => set('path', e.target.value)} placeholder="/example-path" /></div>
            <div>
              <label>Parent Menu</label>
              <SearchableSelect
                value={String(form.parent_id || '')}
                onChange={(value) => set('parent_id', value)}
                options={parentMenuOptions}
                placeholder="Select parent menu"
                searchPlaceholder="Search parent menu..."
              />
            </div>
            <div>
              <label>Order Index</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.order_index}
                onChange={(e) => set('order_index', Number(sanitizeDigits(e.target.value) || '0'))}
                placeholder="Enter order index"
              />
            </div>
            <div>
              <label>Status</label>
              <SearchableSelect
                value={form.is_active ? 'true' : 'false'}
                onChange={(value) => set('is_active', value === 'true')}
                options={statusOptions}
                placeholder="Select menu status"
                searchPlaceholder="Search status..."
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Icon</label>
              <div className="icon-picker-grid">
                {MENU_ICON_OPTIONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    className={`icon-picker-item ${form.icon === iconName ? 'selected' : ''}`}
                    onClick={() => set('icon', iconName)}
                    aria-label={`Select ${ICON_LABELS[iconName]} icon`}
                    title={ICON_LABELS[iconName]}
                  >
                    <AppIcon name={iconName} className="icon-picker-svg" />
                    <span>{ICON_LABELS[iconName]}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => void save()} disabled={loading}>
                {loading ? 'Saving...' : 'Update Menu'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/menus')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
