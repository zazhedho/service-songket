import { useEffect, useState } from 'react'
import { getNewsScrapeCronSetting, updateNewsScrapeCronSetting } from '../api'
import { useAuth } from '../store'

type CronSetting = {
  id?: string
  key?: string
  is_active: boolean
  interval_minutes: number
  description?: string
  updated_at?: string
}

function parseError(err: any, fallback: string) {
  const raw = err?.response?.data?.error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object' && typeof raw.message === 'string' && raw.message.trim()) return raw.message
  if (typeof err?.response?.data?.message === 'string' && err.response.data.message.trim()) return err.response.data.message
  return fallback
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}

export default function MasterSettingsPage() {
  const role = useAuth((s) => s.role)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [setting, setSetting] = useState<CronSetting>({
    is_active: false,
    interval_minutes: 5,
  })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getNewsScrapeCronSetting()
      const data = res.data?.data || res.data || {}
      setSetting({
        id: data.id,
        key: data.key,
        is_active: Boolean(data.is_active),
        interval_minutes: Number(data.interval_minutes) || 5,
        description: data.description,
        updated_at: data.updated_at,
      })
    } catch (err: any) {
      setError(parseError(err, 'Gagal memuat master setting'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    const interval = Number(setting.interval_minutes)
    if (!Number.isFinite(interval) || interval <= 0) {
      setSaving(false)
      setError('Interval menit harus lebih dari 0')
      return
    }

    try {
      const res = await updateNewsScrapeCronSetting({
        is_active: setting.is_active,
        interval_minutes: interval,
      })
      const data = res.data?.data || res.data || {}
      setSetting((prev) => ({
        ...prev,
        id: data.id || prev.id,
        key: data.key || prev.key,
        is_active: Boolean(data.is_active),
        interval_minutes: Number(data.interval_minutes) || interval,
        description: data.description || prev.description,
        updated_at: data.updated_at || prev.updated_at,
      }))
      setSuccess('Master setting berhasil diperbarui')
    } catch (err: any) {
      setError(parseError(err, 'Gagal menyimpan master setting'))
    } finally {
      setSaving(false)
    }
  }

  if (role !== 'superadmin') {
    return (
      <div className="page">
        <div className="card">
          <div className="alert">Menu ini hanya untuk superadmin.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Master Setting</div>
          <div style={{ color: '#64748b' }}>Pengaturan cron otomatis scrape portal berita</div>
        </div>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 760 }}>
          {loading && <div style={{ color: '#64748b' }}>Loading setting...</div>}
          {error && <div className="alert" style={{ marginBottom: 10 }}>{error}</div>}
          {success && (
            <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #86efac', background: '#f0fdf4', color: '#166534' }}>
              {success}
            </div>
          )}

          <div className="grid" style={{ gap: 12 }}>
            <div>
              <label>Scheduler Status</label>
              <select
                value={setting.is_active ? 'on' : 'off'}
                onChange={(e) => setSetting((prev) => ({ ...prev, is_active: e.target.value === 'on' }))}
                disabled={loading || saving}
              >
                <option value="on">ON</option>
                <option value="off">OFF</option>
              </select>
            </div>

            <div>
              <label>Interval (menit)</label>
              <input
                type="number"
                min={1}
                max={10080}
                value={setting.interval_minutes}
                onChange={(e) => setSetting((prev) => ({ ...prev, interval_minutes: Number(e.target.value) || 0 }))}
                disabled={loading || saving}
              />
            </div>

            <div style={{ color: '#64748b', fontSize: 13 }}>
              Contoh: interval 5 berarti cron scrape berjalan setiap 5 menit.
            </div>

            <div style={{ color: '#64748b', fontSize: 13 }}>
              Last updated: {formatDate(setting.updated_at)}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={() => void save()} disabled={loading || saving}>
                {saving ? 'Saving...' : 'Save Setting'}
              </button>
              <button className="btn-ghost" onClick={() => void load()} disabled={loading || saving}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
