type ScrapeSourceFormProps = {
  canCreate: boolean
  canUpdate: boolean
  form: any
  isCreate: boolean
  isEdit: boolean
  loading: boolean
  message: { text: string; ok: boolean } | null
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
  message,
  navigate,
  save,
  set,
}: ScrapeSourceFormProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Scrape Source' : 'Input Scrape Source Baru'}</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Kembali ke Tabel</button>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 860 }}>
          {!canCreate && isCreate && <div className="alert">Tidak ada izin tambah sumber.</div>}
          {!canUpdate && isEdit && <div className="alert">Tidak ada izin ubah sumber.</div>}

          <div className="grid" style={{ gap: 10 }}>
            <div><label>Nama</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div><label>URL</label><input value={form.url} onChange={(e) => set('url', e.target.value)} /></div>
            <div>
              <label>Type</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="prices">Harga Pangan</option>
                <option value="news">Portal Berita</option>
              </select>
            </div>
            <div><label>Kategori</label><input value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
            <div>
              <label>Aktif</label>
              <select value={form.is_active ? 'true' : 'false'} onChange={(e) => set('is_active', e.target.value === 'true')}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>

            {message && !message.ok && <div style={{ color: '#b91c1c', fontSize: 13 }}>{message.text}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => void save()} disabled={loading || (!canCreate && !canUpdate)}>
                {loading ? 'Saving...' : isEdit ? 'Update Source' : 'Simpan Source'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/scrape-sources')}>Batal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
