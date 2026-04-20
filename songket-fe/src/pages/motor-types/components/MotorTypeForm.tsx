type MotorTypeFormProps = {
  canCreate: boolean
  canUpdate: boolean
  error: string
  form: any
  formatRupiah: (value: number) => string
  isCreate: boolean
  isEdit: boolean
  loading: boolean
  navigate: (path: string) => void
  parseRupiahInput: (value: string) => number
  provinces: any[]
  regencies: any[]
  save: () => Promise<void>
  setForm: React.Dispatch<React.SetStateAction<any>>
  updateProvince: (code: string) => void
  updateRegency: (code: string) => void
}

export default function MotorTypeForm({
  canCreate,
  canUpdate,
  error,
  form,
  formatRupiah,
  isCreate,
  isEdit,
  loading,
  navigate,
  parseRupiahInput,
  provinces,
  regencies,
  save,
  setForm,
  updateProvince,
  updateRegency,
}: MotorTypeFormProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Jenis Motor' : 'Input Jenis Motor'}</div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Kembali ke Tabel</button>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 980 }}>
          {!canCreate && isCreate && <div className="alert">Tidak ada izin membuat data.</div>}
          {!canUpdate && isEdit && <div className="alert">Tidak ada izin mengubah data.</div>}

          <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div>
              <label>Jenis Motor</label>
              <input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} />
            </div>

            <div>
              <label>Merek</label>
              <input value={form.brand} onChange={(e) => setForm((prev: any) => ({ ...prev, brand: e.target.value }))} />
            </div>

            <div>
              <label>Model</label>
              <input value={form.model} onChange={(e) => setForm((prev: any) => ({ ...prev, model: e.target.value }))} />
            </div>

            <div>
              <label>Type</label>
              <input value={form.type} onChange={(e) => setForm((prev: any) => ({ ...prev, type: e.target.value }))} />
            </div>

            <div>
              <label>OTR</label>
              <input
                type="text"
                value={formatRupiah(form.otr)}
                onChange={(e) => setForm((prev: any) => ({ ...prev, otr: parseRupiahInput(e.target.value) }))}
                inputMode="numeric"
              />
            </div>

            <div>
              <label>Provinsi</label>
              <select value={form.province_code} onChange={(e) => updateProvince(e.target.value)}>
                <option value="">Pilih</option>
                {provinces.map((province: any) => (
                  <option key={province.code} value={province.code}>{province.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Kabupaten/Kota</label>
              <select value={form.regency_code} onChange={(e) => updateRegency(e.target.value)} disabled={!form.province_code}>
                <option value="">Pilih</option>
                {regencies.map((regency: any) => (
                  <option key={regency.code} value={regency.code}>{regency.name}</option>
                ))}
              </select>
            </div>

            {error && <div style={{ color: '#b91c1c', fontSize: 13, gridColumn: '1 / -1' }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, gridColumn: '1 / -1' }}>
              <button className="btn" onClick={() => void save()} disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/motor-types')}>Batal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
