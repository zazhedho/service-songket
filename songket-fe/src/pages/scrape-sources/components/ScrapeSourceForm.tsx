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
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Scrape Source' : 'Create Scrape Source'}</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Back to Table</button>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 860 }}>
          {!canCreate && isCreate && <div className="alert">No permission to create sources.</div>}
          {!canUpdate && isEdit && <div className="alert">No permission to update sources.</div>}

          <div className="grid" style={{ gap: 10 }}>
            <div><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter source name" /></div>
            <div><label>URL</label><input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://example.com/source" /></div>
            <div>
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

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => void save()} disabled={loading || (!canCreate && !canUpdate)}>
                {loading ? 'Saving...' : isEdit ? 'Update Source' : 'Save Source'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
