import { useEffect, useState } from 'react'
import {
  getNewsScrapeCronSetting,
  listNewsScrapeCronSettingHistory,
  updateNewsScrapeCronSetting,
} from '../api'
import { useAuth } from '../store'

type CronSetting = {
  id?: string
  key?: string
  is_active: boolean
  interval_minutes: number
  description?: string
  updated_at?: string
}

type SettingHistory = {
  id: string
  setting_id: string
  key: string
  previous_is_active: boolean
  previous_interval_minutes: number
  new_is_active: boolean
  new_interval_minutes: number
  changed_by_name?: string
  created_at?: string
}

const MAX_INTERVAL_MINUTES = 43200
const MIN_INTERVAL_MINUTES = 1

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
  return d.toLocaleString('en-US')
}

export default function MasterSettingsPage() {
  const role = useAuth((s) => s.role)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [setting, setSetting] = useState<CronSetting>({
    is_active: false,
    interval_minutes: 5,
  })
  const [histories, setHistories] = useState<SettingHistory[]>([])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await listNewsScrapeCronSettingHistory({ limit: 200 })
      const data = res.data?.data || res.data || []
      setHistories(Array.isArray(data) ? data : [])
    } catch {
      setHistories([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [settingRes] = await Promise.all([getNewsScrapeCronSetting(), loadHistory()])
      const data = settingRes.data?.data || settingRes.data || {}
      setSetting({
        id: data.id,
        key: data.key,
        is_active: Boolean(data.is_active),
        interval_minutes: Number(data.interval_minutes) || 5,
        description: data.description,
        updated_at: data.updated_at,
      })
    } catch (err: any) {
      setError(parseError(err, 'Failed to load master settings'))
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

    let nextInterval = Number(setting.interval_minutes)
    if (!Number.isFinite(nextInterval)) nextInterval = 0

    let nextActive = setting.is_active
    if (nextInterval <= 0) {
      nextInterval = MIN_INTERVAL_MINUTES
      nextActive = false
    }
    if (nextInterval > MAX_INTERVAL_MINUTES) nextInterval = MAX_INTERVAL_MINUTES

    try {
      const res = await updateNewsScrapeCronSetting({
        is_active: nextActive,
        interval_minutes: nextInterval,
      })
      const data = res.data?.data || res.data || {}
      setSetting((prev) => ({
        ...prev,
        id: data.id || prev.id,
        key: data.key || prev.key,
        is_active: Boolean(data.is_active),
        interval_minutes: Number(data.interval_minutes) || nextInterval,
        description: data.description || prev.description,
        updated_at: data.updated_at || prev.updated_at,
      }))
      setSuccess('Master setting updated successfully.')
      await loadHistory()
    } catch (err: any) {
      setError(parseError(err, 'Failed to save master settings'))
    } finally {
      setSaving(false)
    }
  }

  if (role !== 'superadmin') {
    return (
      <div className="page">
        <div className="card">
          <div className="alert">This page is only available for superadmin.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Master Settings</div>
          <div style={{ color: '#64748b' }}>News scrape scheduler control and change history</div>
        </div>
      </div>

      <div className="page">
        <div className="card" style={{ maxWidth: 860 }}>
          {loading && <div style={{ color: '#64748b' }}>Loading settings...</div>}
          {error && <div className="alert" style={{ marginBottom: 10 }}>{error}</div>}
          {success && (
            <div
              style={{
                marginBottom: 10,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #86efac',
                background: '#f0fdf4',
                color: '#166534',
              }}
            >
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
              <label>Interval (minutes)</label>
              <input
                type="number"
                min={0}
                max={MAX_INTERVAL_MINUTES}
                step={1}
                value={setting.interval_minutes}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  const safe = Number.isFinite(next) ? next : 0
                  setSetting((prev) => ({
                    ...prev,
                    interval_minutes: safe,
                    is_active: safe <= 0 ? false : prev.is_active,
                  }))
                }}
                disabled={loading || saving}
              />
            </div>

            <div style={{ color: '#64748b', fontSize: 13 }}>
              Valid range: {MIN_INTERVAL_MINUTES} - {MAX_INTERVAL_MINUTES} minutes (1 month).
              Input `0` will automatically switch scheduler status to OFF.
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

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Master Setting History</h3>
            {historyLoading && <div style={{ color: '#64748b', fontSize: 12 }}>Loading...</div>}
          </div>
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Changed By</th>
                <th>Previous Status</th>
                <th>Previous Interval</th>
                <th>New Status</th>
                <th>New Interval</th>
              </tr>
            </thead>
            <tbody>
              {histories.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.created_at)}</td>
                  <td>{item.changed_by_name || '-'}</td>
                  <td>{item.previous_is_active ? 'ON' : 'OFF'}</td>
                  <td>{item.previous_interval_minutes} min</td>
                  <td>{item.new_is_active ? 'ON' : 'OFF'}</td>
                  <td>{item.new_interval_minutes} min</td>
                </tr>
              ))}
              {!historyLoading && histories.length === 0 && (
                <tr>
                  <td colSpan={6}>No history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
