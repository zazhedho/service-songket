import SearchableSelect from '../../../components/common/SearchableSelect'

type ScrapeSourceFormProps = {
  canCreate: boolean
  canUpdate: boolean
  form: any
  isCreate: boolean
  isEdit: boolean
  loading: boolean
  navigate: (path: string) => void
  save: () => Promise<void>
  set: (key: string, value: any) => void
}

export default function ScrapeSourceForm({
  canCreate,
  canUpdate,
  form,
  isCreate,
  isEdit,
  loading,
  navigate,
  save,
  set,
}: ScrapeSourceFormProps) {
  const typeOptions = [
    { value: 'prices', label: 'Commodity Prices' },
    { value: 'news', label: 'News Portal' },
  ]

  const statusOptions = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ]

  return (
    <div className="scrape-source-shell">
      <div className="header scrape-source-header">
        <div className="scrape-source-heading">
          <div className="scrape-source-eyebrow">Source Setup</div>
          <div className="scrape-source-title">{isEdit ? 'Edit Scrape Source' : 'Create Scrape Source'}</div>
          <div className="scrape-source-subtitle">Define source identity, target URL, type, and availability status.</div>
        </div>
        <div className="scrape-source-actions">
          <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Back to Table</button>
        </div>
      </div>

      <div className="page scrape-source-page">
        <div className="card form-section scrape-source-form-card">
          {!canCreate && isCreate && <div className="alert">No permission to create sources.</div>}
          {!canUpdate && isEdit && <div className="alert">No permission to update sources.</div>}

          <div className="form-section-head">
            <div>
              <h3>Source Information</h3>
              <div className="form-section-note">Use clear source names so operators can identify scrape targets quickly.</div>
            </div>
          </div>

          <div className="form-section-grid">
            <div data-field="name"><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} minLength={3} placeholder="Enter source name" required /></div>
            <div className="form-field-span-full" data-field="url"><label>URL</label><input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://example.com/source" required /></div>
            <div data-field="type">
              <label>Type</label>
              <SearchableSelect
                value={form.type}
                onChange={(value) => set('type', value)}
                options={typeOptions}
                placeholder="Select source type"
                searchPlaceholder="Search source type..."
              />
            </div>
            <div><label>Category</label><input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Enter source category" /></div>
            <div>
              <label>Active</label>
              <SearchableSelect
                value={form.is_active ? 'true' : 'false'}
                onChange={(value) => set('is_active', value === 'true')}
                options={statusOptions}
                placeholder="Select source status"
                searchPlaceholder="Search status..."
              />
            </div>

            <div className="form-actions-row scrape-source-form-actions">
              <button className="btn" type="button" onClick={() => void save()} disabled={loading || (!canCreate && !canUpdate)}>
                {loading ? 'Saving...' : isEdit ? 'Update Source' : 'Save Source'}
              </button>
              <button className="btn-ghost" type="button" onClick={() => navigate('/scrape-sources')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
