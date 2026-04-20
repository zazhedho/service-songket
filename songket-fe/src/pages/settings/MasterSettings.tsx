import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  createNewsScrapeCronSetting,
  createPriceScrapeCronSetting,
  deleteNewsScrapeCronSetting,
  deletePriceScrapeCronSetting,
  getNewsScrapeCronSetting,
  getPriceScrapeCronSetting,
  listNewsScrapeCronSettingHistory,
  listPriceScrapeCronSettingHistory,
  updateNewsScrapeCronSetting,
  updatePriceScrapeCronSetting,
} from '../../services/masterSettingService'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuth } from '../../store'

type SettingOption = 'news' | 'prices'
type PageMode = 'list' | 'form'
type FormAction = 'create' | 'edit'
type ListTab = 'settings' | 'history'

type CronMinuteSetting = {
  exists: boolean
  id?: string
  key?: string
  is_active: boolean
  interval_minutes: number
  description?: string
  updated_at?: string
}

type CronDaySetting = {
  exists: boolean
  id?: string
  key?: string
  is_active: boolean
  interval_days: number
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

type SettingRow = {
  key: SettingOption
  label: string
  exists: boolean
  status: string
  interval: string
  updatedAt: string
}

const MAX_INTERVAL_MINUTES = 43200
const MIN_INTERVAL_MINUTES = 1
const MAX_INTERVAL_DAYS = 31
const MIN_INTERVAL_DAYS = 1
const MINUTES_PER_DAY = 24 * 60
const SETTINGS_PAGE_SIZE = 10
const HISTORY_PAGE_SIZE = 10

function parseMode(pathname: string): PageMode {
  if (pathname.endsWith('/form')) return 'form'
  return 'list'
}

function clamp(value: number, min: number, max: number) {
  if (value < min) return min
  if (value > max) return max
  return value
}

function minutesToDays(minutes: number) {
  const safe = Number.isFinite(minutes) ? Math.max(1, minutes) : MINUTES_PER_DAY
  const days = Math.ceil(safe / MINUTES_PER_DAY)
  return clamp(days, MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS)
}

function formatDay(value: number) {
  return `${value} day${value === 1 ? '' : 's'}`
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
  return d.toLocaleString('en-US')
}

function formatSettingLabel(key?: string) {
  if (key === 'cron_scrape_prices') return 'Commodity Price Scrape Scheduler'
  return 'News Scrape Scheduler'
}

function formatHistoryInterval(minutes: number, key?: string) {
  if (key !== 'cron_scrape_prices') return `${minutes} min`
  return formatDay(minutesToDays(minutes))
}

function defaultNewsSetting(): CronMinuteSetting {
  return {
    exists: false,
    is_active: false,
    interval_minutes: 5,
  }
}

function defaultPriceSetting(): CronDaySetting {
  return {
    exists: false,
    is_active: false,
    interval_days: 1,
  }
}

export default function MasterSettingsPage() {
  const role = useAuth((s) => s.role)
  const confirm = useConfirm()
  const navigate = useNavigate()
  const location = useLocation()

  const mode = parseMode(location.pathname)
  const isFormMode = mode === 'form'

  const query = useMemo(() => new URLSearchParams(location.search), [location.search])
  const queryOption = query.get('option')
  const formAction: FormAction = query.get('action') === 'create' ? 'create' : 'edit'

  const [selectedOption, setSelectedOption] = useState<SettingOption>('news')
  const [activeTab, setActiveTab] = useState<ListTab>('settings')
  const [settingsPage, setSettingsPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [newsSetting, setNewsSetting] = useState<CronMinuteSetting>(defaultNewsSetting)
  const [priceSetting, setPriceSetting] = useState<CronDaySetting>(defaultPriceSetting)
  const [newsHistories, setNewsHistories] = useState<SettingHistory[]>([])
  const [priceHistories, setPriceHistories] = useState<SettingHistory[]>([])

  const loadNewsHistory = async () => {
    const res = await listNewsScrapeCronSettingHistory({ limit: 200 })
    const data = res.data?.data || res.data || []
    setNewsHistories(Array.isArray(data) ? data : [])
  }

  const loadPriceHistory = async () => {
    const res = await listPriceScrapeCronSettingHistory({ limit: 200 })
    const data = res.data?.data || res.data || []
    setPriceHistories(Array.isArray(data) ? data : [])
  }

  const loadHistories = async () => {
    setHistoryLoading(true)
    try {
      await Promise.all([loadNewsHistory(), loadPriceHistory()])
    } catch {
      setNewsHistories([])
      setPriceHistories([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadNewsSetting = async () => {
    try {
      const res = await getNewsScrapeCronSetting()
      const data = res.data?.data || res.data || {}
      setNewsSetting({
        exists: true,
        id: data.id,
        key: data.key,
        is_active: Boolean(data.is_active),
        interval_minutes: Number(data.interval_minutes) || 5,
        description: data.description,
        updated_at: data.updated_at,
      })
    } catch {
      setNewsSetting(defaultNewsSetting())
    }
  }

  const loadPriceSetting = async () => {
    try {
      const res = await getPriceScrapeCronSetting()
      const data = res.data?.data || res.data || {}
      setPriceSetting({
        exists: true,
        id: data.id,
        key: data.key,
        is_active: Boolean(data.is_active),
        interval_days: minutesToDays(Number(data.interval_minutes) || MINUTES_PER_DAY),
        description: data.description,
        updated_at: data.updated_at,
      })
    } catch {
      setPriceSetting(defaultPriceSetting())
    }
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadNewsSetting(), loadPriceSetting(), loadHistories()])
    } catch (err: any) {
      setError(parseError(err, 'Failed to load master settings'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [location.pathname, location.search])

  useEffect(() => {
    if (isFormMode) return
    setActiveTab('settings')
  }, [isFormMode])

  useEffect(() => {
    if (!isFormMode) return
    if (queryOption === 'prices') {
      setSelectedOption('prices')
      return
    }
    if (queryOption === 'news') {
      setSelectedOption('news')
    }
  }, [isFormMode, queryOption])

  const isNews = selectedOption === 'news'
  const currentStatus = isNews ? newsSetting.is_active : priceSetting.is_active
  const currentInterval = isNews ? newsSetting.interval_minutes : priceSetting.interval_days
  const currentUpdatedAt = isNews ? newsSetting.updated_at : priceSetting.updated_at
  const currentExists = isNews ? newsSetting.exists : priceSetting.exists
  const intervalLabel = isNews ? 'Interval (minutes)' : 'Interval (days)'
  const intervalMax = isNews ? MAX_INTERVAL_MINUTES : MAX_INTERVAL_DAYS

  const settingRows = useMemo<SettingRow[]>(
    () => [
      {
        key: 'news',
        label: 'News Scrape Scheduler',
        exists: newsSetting.exists,
        status: newsSetting.exists ? (newsSetting.is_active ? 'ON' : 'OFF') : '-',
        interval: newsSetting.exists ? `${newsSetting.interval_minutes} min` : '-',
        updatedAt: newsSetting.exists ? formatDate(newsSetting.updated_at) : '-',
      },
      {
        key: 'prices',
        label: 'Commodity Price Scrape Scheduler',
        exists: priceSetting.exists,
        status: priceSetting.exists ? (priceSetting.is_active ? 'ON' : 'OFF') : '-',
        interval: priceSetting.exists ? formatDay(priceSetting.interval_days) : '-',
        updatedAt: priceSetting.exists ? formatDate(priceSetting.updated_at) : '-',
      },
    ],
    [newsSetting, priceSetting],
  )

  const allHistories = useMemo(
    () =>
      [...newsHistories, ...priceHistories].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return tb - ta
      }),
    [newsHistories, priceHistories],
  )

  const settingsTotalPages = Math.max(1, Math.ceil(settingRows.length / SETTINGS_PAGE_SIZE))
  const historiesTotalPages = Math.max(1, Math.ceil(allHistories.length / HISTORY_PAGE_SIZE))
  const settingsStart = (settingsPage - 1) * SETTINGS_PAGE_SIZE
  const historyStart = (historyPage - 1) * HISTORY_PAGE_SIZE

  const paginatedSettings = useMemo(
    () => settingRows.slice(settingsStart, settingsStart + SETTINGS_PAGE_SIZE),
    [settingRows, settingsStart],
  )
  const paginatedHistories = useMemo(
    () => allHistories.slice(historyStart, historyStart + HISTORY_PAGE_SIZE),
    [allHistories, historyStart],
  )

  useEffect(() => {
    if (settingsPage > settingsTotalPages) setSettingsPage(settingsTotalPages)
  }, [settingsPage, settingsTotalPages])

  useEffect(() => {
    if (historyPage > historiesTotalPages) setHistoryPage(historiesTotalPages)
  }, [historyPage, historiesTotalPages])

  const save = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (isNews) {
        let nextInterval = Number(newsSetting.interval_minutes)
        if (!Number.isFinite(nextInterval)) nextInterval = 0

        let nextActive = newsSetting.is_active
        if (nextInterval <= 0) {
          nextInterval = MIN_INTERVAL_MINUTES
          nextActive = false
        }
        if (nextInterval > MAX_INTERVAL_MINUTES) nextInterval = MAX_INTERVAL_MINUTES

        if (formAction === 'create') {
          if (newsSetting.exists) throw new Error('News scrape scheduler already exists.')
          await createNewsScrapeCronSetting({
            is_active: nextActive,
            interval_minutes: nextInterval,
          })
          setSuccess('News scrape scheduler created successfully.')
        } else {
          if (!newsSetting.exists) throw new Error('News scrape scheduler does not exist. Please create first.')
          await updateNewsScrapeCronSetting({
            is_active: nextActive,
            interval_minutes: nextInterval,
          })
          setSuccess('News scrape scheduler updated successfully.')
        }
      } else {
        let nextDays = Number(priceSetting.interval_days)
        if (!Number.isFinite(nextDays)) nextDays = 0

        let nextActive = priceSetting.is_active
        if (nextDays <= 0) {
          nextDays = MIN_INTERVAL_DAYS
          nextActive = false
        }
        nextDays = clamp(nextDays, MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS)

        if (formAction === 'create') {
          if (priceSetting.exists) throw new Error('Commodity price scrape scheduler already exists.')
          await createPriceScrapeCronSetting({
            is_active: nextActive,
            interval_days: nextDays,
          })
          setSuccess('Commodity price scrape scheduler created successfully.')
        } else {
          if (!priceSetting.exists) throw new Error('Commodity price scrape scheduler does not exist. Please create first.')
          await updatePriceScrapeCronSetting({
            is_active: nextActive,
            interval_days: nextDays,
          })
          setSuccess('Commodity price scrape scheduler updated successfully.')
        }
      }

      await load()
      navigate('/master-settings')
    } catch (err: any) {
      setError(parseError(err, 'Failed to save setting'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (option: SettingOption) => {
    const ok = await confirm({
      title: 'Delete Setting',
      description: 'Are you sure you want to delete this master setting?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    })
    if (!ok) return

    setError('')
    setSuccess('')
    try {
      if (option === 'news') {
        await deleteNewsScrapeCronSetting()
        setSuccess('News scrape scheduler deleted successfully.')
      } else {
        await deletePriceScrapeCronSetting()
        setSuccess('Commodity price scrape scheduler deleted successfully.')
      }
      await load()
    } catch (err: any) {
      setError(parseError(err, 'Failed to delete setting'))
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
          <div style={{ color: '#64748b' }}>Scheduler control and change history</div>
        </div>
        {isFormMode ? (
          <button className="btn-ghost" onClick={() => navigate('/master-settings')}>Back</button>
        ) : (
          <button className="btn" onClick={() => navigate('/master-settings/form?action=create')}>Setting</button>
        )}
      </div>

      <div className="page">
        {loading && <div className="card"><div style={{ color: '#64748b' }}>Loading settings...</div></div>}
        {error && <div className="card"><div className="alert">{error}</div></div>}
        {success && (
          <div className="card">
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #86efac',
                background: '#f0fdf4',
                color: '#166534',
              }}
            >
              {success}
            </div>
          </div>
        )}

        {isFormMode ? (
          <div className="card" style={{ maxWidth: 860 }}>
            <h3 style={{ marginBottom: 10 }}>
              {formAction === 'create' ? 'Create Scheduler Setting' : 'Edit Scheduler Setting'}
            </h3>

            <div style={{ marginBottom: 10 }}>
              <label>Setting Option</label>
              <select
                value={selectedOption}
                onChange={(e) => setSelectedOption(e.target.value as SettingOption)}
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
                onChange={(e) => {
                  const next = e.target.value === 'on'
                  if (isNews) {
                    setNewsSetting((prev) => ({ ...prev, is_active: next }))
                    return
                  }
                  setPriceSetting((prev) => ({ ...prev, is_active: next }))
                }}
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
                  const safe = Number.isFinite(next) ? next : 0
                  if (isNews) {
                    setNewsSetting((prev) => ({
                      ...prev,
                      interval_minutes: safe,
                      is_active: safe <= 0 ? false : prev.is_active,
                    }))
                    return
                  }
                  setPriceSetting((prev) => ({
                    ...prev,
                    interval_days: safe,
                    is_active: safe <= 0 ? false : prev.is_active,
                  }))
                }}
                disabled={loading || saving}
              />
            </div>

            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
              {isNews
                ? `Valid range: ${MIN_INTERVAL_MINUTES} - ${MAX_INTERVAL_MINUTES} minutes (1 month). Input 0 will automatically switch scheduler status to OFF.`
                : `Valid range: ${MIN_INTERVAL_DAYS} - ${MAX_INTERVAL_DAYS} days. Input 0 will automatically switch scheduler status to OFF.`}
            </div>

            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
              Current state: {currentExists ? 'Exists' : 'Not created yet'} | Last updated: {formatDate(currentUpdatedAt)}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => void save()} disabled={loading || saving}>
                {saving ? 'Saving...' : formAction === 'create' ? 'Create Setting' : 'Save Setting'}
              </button>
              <button className="btn-ghost" onClick={() => navigate('/master-settings')}>
                Back to Table
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="card">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className={activeTab === 'settings' ? 'btn' : 'btn-ghost'}
                  onClick={() => setActiveTab('settings')}
                  disabled={loading}
                >
                  Settings
                </button>
                <button
                  className={activeTab === 'history' ? 'btn' : 'btn-ghost'}
                  onClick={() => setActiveTab('history')}
                  disabled={loading}
                >
                  History
                </button>
              </div>
            </div>

            {activeTab === 'settings' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Master Settings Table</h3>
                  <button className="btn-ghost" onClick={() => void load()} disabled={loading}>Refresh</button>
                </div>
                <table className="table" style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>Setting</th>
                      <th>Status</th>
                      <th>Interval</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSettings.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td>{row.status}</td>
                        <td>{row.interval}</td>
                        <td>{row.updatedAt}</td>
                        <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {row.exists ? (
                            <>
                              <button className="btn-ghost" onClick={() => navigate(`/master-settings/form?action=edit&option=${row.key}`)}>Edit</button>
                              <button className="btn-ghost" onClick={() => void remove(row.key)}>Delete</button>
                            </>
                          ) : (
                            <button className="btn-ghost" onClick={() => navigate(`/master-settings/form?action=create&option=${row.key}`)}>Create</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    Page {settingsPage} of {settingsTotalPages}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-ghost"
                      disabled={settingsPage <= 1}
                      onClick={() => setSettingsPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </button>
                    <button
                      className="btn-ghost"
                      disabled={settingsPage >= settingsTotalPages}
                      onClick={() => setSettingsPage((prev) => Math.min(settingsTotalPages, prev + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Master Settings History</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {historyLoading && <div style={{ color: '#64748b', fontSize: 12 }}>Loading...</div>}
                    <button className="btn-ghost" onClick={() => void loadHistories()} disabled={historyLoading || loading}>
                      Refresh History
                    </button>
                  </div>
                </div>

                <table className="table" style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>Setting</th>
                      <th>Time</th>
                      <th>Changed By</th>
                      <th>Previous Status</th>
                      <th>Previous Interval</th>
                      <th>New Status</th>
                      <th>New Interval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistories.map((item) => (
                      <tr key={item.id}>
                        <td>{formatSettingLabel(item.key)}</td>
                        <td>{formatDate(item.created_at)}</td>
                        <td>{item.changed_by_name || '-'}</td>
                        <td>{item.previous_is_active ? 'ON' : 'OFF'}</td>
                        <td>{formatHistoryInterval(item.previous_interval_minutes, item.key)}</td>
                        <td>{item.new_is_active ? 'ON' : 'OFF'}</td>
                        <td>{formatHistoryInterval(item.new_interval_minutes, item.key)}</td>
                      </tr>
                    ))}
                    {!historyLoading && allHistories.length === 0 && (
                      <tr>
                        <td colSpan={7}>No history yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    Page {historyPage} of {historiesTotalPages}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-ghost"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </button>
                    <button
                      className="btn-ghost"
                      disabled={historyPage >= historiesTotalPages}
                      onClick={() => setHistoryPage((prev) => Math.min(historiesTotalPages, prev + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
