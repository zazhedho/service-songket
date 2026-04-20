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
            <div><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div><label>URL</label><input value={form.url} onChange={(e) => set('url', e.target.value)} /></div>
            <div>
              <label>Type</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="prices">Commodity Prices</option>
                <option value="news">News Portal</option>
              </select>
            </div>
            <div><label>Category</label><input value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
            <div>
              <label>Active</label>
              <select value={form.is_active ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
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
