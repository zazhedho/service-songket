import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { fetchDashboardSummary, fetchLookups, listDashboardNewsItems, listDashboardPrices } from '../api'
import { formatRupiah } from '../utils/currency'

type DashboardFilters = {
  area: string
  month: string
  day: string
  year: string
  dealer_id: string
  finance_company_id: string
}

type SeriesItem = {
  label: string
  total: number
  percent: number
}

type DailyItem = {
  date: string
  total: number
}

type MonthlyItem = {
  month: string
  total: number
  working_days: number
  avg_daily: number
}

type DashboardSummary = {
  total_orders: number
  approved_orders: number
  approval_rate: number
  lead_time_avg_seconds: number
  lead_time_avg_hours: number
  growth: number
  growth_percent: number
  growth_month: string
  growth_prev_month: string
  avg_order_in_daily_m: number
  avg_order_in_daily_prev_m: number
  daily_order_in: DailyItem[]
  monthly_order_in: MonthlyItem[]
  job_proportion: SeriesItem[]
  product_proportion: SeriesItem[]
  finance_company_proportion: SeriesItem[]
  dp_range: SeriesItem[]
}

type DashboardNewsItem = {
  id: string
  title: string
  source_name: string
  published_at: string
  url: string
  images?: unknown
}

type DashboardPriceItem = {
  id: string
  commodity_id?: string
  commodity?: {
    name?: string
    unit?: string
  }
  price: number
  collected_at: string
}

type DonutSlice = {
  label: string
  total: number
  percent: number
  color: string
}

const defaultFilters: DashboardFilters = {
  area: '',
  month: '',
  day: '',
  year: '',
  dealer_id: '',
  finance_company_id: '',
}

const emptySummary: DashboardSummary = {
  total_orders: 0,
  approved_orders: 0,
  approval_rate: 0,
  lead_time_avg_seconds: 0,
  lead_time_avg_hours: 0,
  growth: 0,
  growth_percent: 0,
  growth_month: '',
  growth_prev_month: '',
  avg_order_in_daily_m: 0,
  avg_order_in_daily_prev_m: 0,
  daily_order_in: [],
  monthly_order_in: [],
  job_proportion: [],
  product_proportion: [],
  finance_company_proportion: [],
  dp_range: [],
}

export default function DashboardPage() {
  const [filtersInput, setFiltersInput] = useState<DashboardFilters>(defaultFilters)
  const [filtersApplied, setFiltersApplied] = useState<DashboardFilters>(defaultFilters)
  const [lookups, setLookups] = useState<any>({})
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [latestNews, setLatestNews] = useState<DashboardNewsItem[]>([])
  const [latestPrices, setLatestPrices] = useState<DashboardPriceItem[]>([])
  const [latestCardsLoading, setLatestCardsLoading] = useState(false)
  const [activeNewsIndex, setActiveNewsIndex] = useState(0)
  const [selectedTrendCommodity, setSelectedTrendCommodity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLookups()
      .then((res) => setLookups(res.data?.data || res.data || {}))
      .catch(() => setLookups({}))
  }, [])

  useEffect(() => {
    setLatestCardsLoading(true)
    Promise.all([
      listDashboardNewsItems({ page: 1, limit: 5, order_by: 'published_at', order_direction: 'desc' }),
      listDashboardPrices({ page: 1, limit: 200, order_by: 'collected_at', order_direction: 'desc' }),
    ])
      .then(([newsRes, priceRes]) => {
        const newsPayload = newsRes?.data || {}
        const pricePayload = priceRes?.data || {}
        const newsRows = Array.isArray(newsPayload?.data) ? newsPayload.data : []
        const priceRows = Array.isArray(pricePayload?.data) ? pricePayload.data : []
        setLatestNews(newsRows as DashboardNewsItem[])
        setLatestPrices(priceRows as DashboardPriceItem[])
      })
      .catch(() => {
        setLatestNews([])
        setLatestPrices([])
      })
      .finally(() => setLatestCardsLoading(false))
  }, [])

  useEffect(() => {
    if (latestNews.length === 0) {
      setActiveNewsIndex(0)
      return
    }
    if (activeNewsIndex >= latestNews.length) {
      setActiveNewsIndex(0)
    }
  }, [activeNewsIndex, latestNews.length])

  useEffect(() => {
    if (latestNews.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveNewsIndex((prev) => (prev + 1) % latestNews.length)
    }, 5000)
    return () => {
      window.clearInterval(timer)
    }
  }, [latestNews.length])

  useEffect(() => {
    const params: Record<string, unknown> = {}
    if (filtersApplied.area) params.area = filtersApplied.area
    if (filtersApplied.dealer_id) params.dealer_id = filtersApplied.dealer_id
    if (filtersApplied.finance_company_id) params.finance_company_id = filtersApplied.finance_company_id
    if (filtersApplied.month) params.month = Number(filtersApplied.month)
    if (filtersApplied.year) params.year = Number(filtersApplied.year)

    if (filtersApplied.day && filtersApplied.month && filtersApplied.year) {
      const yyyy = Number(filtersApplied.year)
      const mm = Number(filtersApplied.month)
      const dd = Number(filtersApplied.day)
      if (yyyy > 0 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        params.date = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
      }
    }

    setLoading(true)
    setError('')
    fetchDashboardSummary(params)
      .then((res) => {
        const payload = res.data?.data || res.data || {}
        setSummary(normalizeSummary(payload))
      })
      .catch((err: any) => {
        setSummary(emptySummary)
        setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard summary.')
      })
      .finally(() => setLoading(false))
  }, [filtersApplied])

  const areaOptions = useMemo(() => {
    const dealers = Array.isArray(lookups?.dealers) ? lookups.dealers : []
    const map = new Map<string, string>()
    dealers.forEach((dealer: any) => {
      const regency = String(dealer?.regency || '').trim()
      const district = String(dealer?.district || '').trim()
      if (district) {
        const key = district.toLowerCase()
        if (!map.has(key)) map.set(key, `${regency || '-'} / ${district}`)
      }
      if (regency) {
        const key = regency.toLowerCase()
        if (!map.has(key)) map.set(key, regency)
      }
    })

    return Array.from(map.entries())
      .map(([key, label]) => ({ value: key, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [lookups?.dealers])

  const dealerOptions = useMemo(() => {
    const dealers = Array.isArray(lookups?.dealers) ? lookups.dealers : []
    return dealers
      .map((dealer: any) => ({ value: String(dealer?.id || ''), label: String(dealer?.name || '') }))
      .filter((item) => item.value && item.label)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [lookups?.dealers])

  const financeOptions = useMemo(() => {
    const rows = Array.isArray(lookups?.finance_companies) ? lookups.finance_companies : []
    return rows
      .map((item: any) => ({ value: String(item?.id || ''), label: String(item?.name || '') }))
      .filter((item) => item.value && item.label)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [lookups?.finance_companies])

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, idx) => String(currentYear - idx))
  }, [])

  const dailyLabels = useMemo(
    () => summary.daily_order_in.map((item) => dayjs(item.date).format('DD MMM')),
    [summary.daily_order_in],
  )
  const dailyValues = useMemo(() => summary.daily_order_in.map((item) => Number(item.total || 0)), [summary.daily_order_in])

  const monthlyLabels = useMemo(
    () => summary.monthly_order_in.map((item) => dayjs(`${item.month}-01`).format('MMM YY')),
    [summary.monthly_order_in],
  )
  const monthlyValues = useMemo(() => summary.monthly_order_in.map((item) => Number(item.total || 0)), [summary.monthly_order_in])
  const monthlyAvgValues = useMemo(
    () => summary.monthly_order_in.map((item) => Number(item.avg_daily || 0)),
    [summary.monthly_order_in],
  )

  const activeNewsItem = latestNews[activeNewsIndex] || null
  const activeNewsThumb = useMemo(
    () => (activeNewsItem ? extractNewsThumbnail(activeNewsItem.images) : ''),
    [activeNewsItem],
  )

  const trendCommodityOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>()
    latestPrices.forEach((item) => {
      const key = getCommodityKey(item)
      const label = String(item?.commodity?.name || '').trim()
      if (!key || !label || map.has(key)) return
      map.set(key, { value: key, label })
    })
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [latestPrices])

  useEffect(() => {
    if (trendCommodityOptions.length === 0) {
      setSelectedTrendCommodity('')
      return
    }
    if (!trendCommodityOptions.some((item) => item.value === selectedTrendCommodity)) {
      setSelectedTrendCommodity(trendCommodityOptions[0].value)
    }
  }, [selectedTrendCommodity, trendCommodityOptions])

  const selectedPriceRows = useMemo(() => {
    if (!selectedTrendCommodity) return latestPrices
    return latestPrices.filter((item) => getCommodityKey(item) === selectedTrendCommodity)
  }, [latestPrices, selectedTrendCommodity])

  const latestPriceTableRows = useMemo(() => selectedPriceRows.slice(0, 5), [selectedPriceRows])

  const priceTrend = useMemo(() => {
    const grouped = new Map<string, { date: string; sum: number; count: number }>()
    selectedPriceRows.forEach((item) => {
      const date = item.collected_at ? dayjs(item.collected_at).format('YYYY-MM-DD') : ''
      if (!date) return
      const bucket = grouped.get(date) || { date, sum: 0, count: 0 }
      bucket.sum += Number(item.price || 0)
      bucket.count += 1
      grouped.set(date, bucket)
    })

    const rows = Array.from(grouped.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    return {
      dates: rows.map((item) => item.date),
      labels: rows.map((item) => dayjs(item.date).format('DD MMM')),
      values: rows.map((item) => (item.count > 0 ? item.sum / item.count : 0)),
    }
  }, [selectedPriceRows])

  const applyFilters = () => {
    setFiltersApplied(filtersInput)
  }

  const resetFilters = () => {
    setFiltersInput(defaultFilters)
    setFiltersApplied(defaultFilters)
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Dashboard Songket</div>
          <div style={{ color: '#64748b' }}>Monitoring Order In, komposisi data, dan performa.</div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          <h3>Filter Dashboard</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 10 }}>
            <div>
              <label>Area</label>
              <select value={filtersInput.area} onChange={(e) => setFiltersInput((prev) => ({ ...prev, area: e.target.value }))}>
                <option value="">All Area</option>
                {areaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Bulan</label>
              <select value={filtersInput.month} onChange={(e) => setFiltersInput((prev) => ({ ...prev, month: e.target.value }))}>
                <option value="">All Month</option>
                {Array.from({ length: 12 }, (_, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>
                    {String(idx + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Tanggal</label>
              <select value={filtersInput.day} onChange={(e) => setFiltersInput((prev) => ({ ...prev, day: e.target.value }))}>
                <option value="">All Date</option>
                {Array.from({ length: 31 }, (_, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>
                    {String(idx + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Tahun</label>
              <select value={filtersInput.year} onChange={(e) => setFiltersInput((prev) => ({ ...prev, year: e.target.value }))}>
                <option value="">All Year</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Dealer</label>
              <select value={filtersInput.dealer_id} onChange={(e) => setFiltersInput((prev) => ({ ...prev, dealer_id: e.target.value }))}>
                <option value="">All Dealer</option>
                {dealerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Finance Company</label>
              <select
                value={filtersInput.finance_company_id}
                onChange={(e) => setFiltersInput((prev) => ({ ...prev, finance_company_id: e.target.value }))}
              >
                <option value="">All Finance Company</option>
                {financeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={applyFilters}>Apply</button>
            <button className="btn-ghost" onClick={resetFilters}>Reset</button>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          <KpiCard label="Total Order In" value={formatInteger(summary.total_orders)} note="Filtered data" />
          <KpiCard label="Lead Time" value={`${summary.lead_time_avg_hours.toFixed(2)} jam`} note={`${summary.lead_time_avg_seconds.toFixed(0)} detik`} />
          <KpiCard label="Approval Rate" value={`${(summary.approval_rate * 100).toFixed(2)}%`} note={`${formatInteger(summary.approved_orders)} approved`} />
          <KpiCard
            label="Growth"
            value={`${summary.growth_percent >= 0 ? '+' : ''}${summary.growth_percent.toFixed(2)}%`}
            note={
              summary.growth_month && summary.growth_prev_month
                ? `${summary.growth_month} vs ${summary.growth_prev_month}`
                : 'Avg daily M vs M-1'
            }
            valueColor={summary.growth_percent >= 0 ? '#166534' : '#b91c1c'}
          />
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
          <div className="card">
            <h3>Order In Harian</h3>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Grafik jumlah order in per hari.</div>
            <div style={{ marginTop: 10 }}>
              <BarLineChart labels={dailyLabels} barValues={dailyValues} barName="Order In" />
            </div>
          </div>

          <div className="card">
            <h3>Order In Bulanan + Avg Daily</h3>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              Avg daily = jumlah order in / jumlah hari kerja (hari minggu + hari libur dikurangi).
            </div>
            <div style={{ marginTop: 10 }}>
              <BarLineChart
                labels={monthlyLabels}
                barValues={monthlyValues}
                lineValues={monthlyAvgValues}
                barName="Order In"
                lineName="Avg Daily"
              />
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          <DonutCard title="Proporsi Pekerjaan" subtitle="Distribusi order in per pekerjaan" items={summary.job_proportion} />
          <DonutCard title="Proporsi Produk" subtitle="Distribusi order in per produk" items={summary.product_proportion} />
          <DonutCard
            title="Proporsi Finance Company"
            subtitle="Distribusi order in berdasarkan finance company"
            items={summary.finance_company_proportion}
          />
        </div>

        <div className="card">
          <h3>Range DP</h3>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Distribusi range DP: &lt;10% sampai &gt;=40%.</div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {summary.dp_range.map((item) => (
              <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '130px minmax(0, 1fr) 64px 64px', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                <div style={{ height: 10, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, Number(item.percent || 0)))}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #22d3ee, #2563eb)',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatInteger(item.total)}</div>
                <div style={{ textAlign: 'right', color: '#64748b', fontSize: 12 }}>{Number(item.percent || 0).toFixed(1)}%</div>
              </div>
            ))}
            {summary.dp_range.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>No DP range data.</div>}
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          <div className="card">
            <h3>Latest News</h3>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Ringkasan berita terbaru (slideshow).</div>
            <div style={{ marginTop: 10 }}>
              {latestCardsLoading && <div style={{ color: '#64748b', fontSize: 12 }}>Loading news...</div>}
              {!latestCardsLoading && latestNews.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>No news data.</div>}
              {!latestCardsLoading && activeNewsItem && (
                <>
                  <a
                    href={activeNewsItem.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      border: '1px solid #dbe3ef',
                      borderRadius: 12,
                      color: '#0f172a',
                      textDecoration: 'none',
                      background: '#fff',
                      overflow: 'hidden',
                      display: 'block',
                    }}
                  >
                    {activeNewsThumb && (
                      <img
                        src={activeNewsThumb}
                        alt={activeNewsItem.title || 'News thumbnail'}
                        style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }}
                      />
                    )}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>{activeNewsItem.title || '-'}</div>
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 5 }}>
                        {activeNewsItem.source_name || '-'} • {activeNewsItem.published_at ? dayjs(activeNewsItem.published_at).format('DD MMM YYYY HH:mm') : '-'}
                      </div>
                    </div>
                  </a>

                  {latestNews.length > 1 && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <button
                        className="btn-ghost"
                        onClick={() => setActiveNewsIndex((prev) => (prev - 1 + latestNews.length) % latestNews.length)}
                      >
                        Prev
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {latestNews.map((_, idx) => (
                          <button
                            key={`news-dot-${idx}`}
                            type="button"
                            onClick={() => setActiveNewsIndex(idx)}
                            aria-label={`Slide ${idx + 1}`}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              border: '0',
                              cursor: 'pointer',
                              background: idx === activeNewsIndex ? '#2563eb' : '#cbd5e1',
                            }}
                          />
                        ))}
                      </div>
                      <button
                        className="btn-ghost"
                        onClick={() => setActiveNewsIndex((prev) => (prev + 1) % latestNews.length)}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                    {latestNews.map((item, idx) => (
                      <a
                        key={`news-list-${item.id || idx}`}
                        href={item.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        onMouseEnter={() => setActiveNewsIndex(idx)}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '7px 9px',
                          color: '#0f172a',
                          textDecoration: 'none',
                          background: idx === activeNewsIndex ? '#eff6ff' : '#fff',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
                          {item.title || '-'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>
                          {item.source_name || '-'} • {item.published_at ? dayjs(item.published_at).format('DD MMM YYYY HH:mm') : '-'}
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Harga Pangan Terbaru</h3>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Update harga komoditas terbaru.</div>
            <div style={{ marginTop: 8 }}>
              <label>Grafik Komoditas</label>
              <select
                value={selectedTrendCommodity}
                onChange={(e) => setSelectedTrendCommodity(e.target.value)}
                disabled={trendCommodityOptions.length === 0}
              >
                {trendCommodityOptions.length === 0 && <option value="">No commodity</option>}
                {trendCommodityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 10 }}>
              <BarLineChart labels={priceTrend.labels} barValues={priceTrend.values} barName="Harga Pangan Harian" />
            </div>
            <div style={{ marginTop: 10, overflowX: 'auto' }}>
              <table className="table dashboard-latest-prices-table">
                <thead>
                  <tr>
                    <th>Komoditas</th>
                    <th>Harga</th>
                    <th>Satuan</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {latestCardsLoading && (
                    <tr>
                      <td colSpan={4}>Loading prices...</td>
                    </tr>
                  )}
                  {!latestCardsLoading && latestPriceTableRows.length === 0 && (
                    <tr>
                      <td colSpan={4}>No price data.</td>
                    </tr>
                  )}
                  {!latestCardsLoading && latestPriceTableRows.map((item) => (
                    <tr key={item.id}>
                      <td>{item.commodity?.name || '-'}</td>
                      <td>{formatRupiah(Number(item.price || 0))}</td>
                      <td>{item.commodity?.unit || '-'}</td>
                      <td>{item.collected_at ? dayjs(item.collected_at).format('DD MMM YYYY HH:mm') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {loading && <div className="card"><div style={{ color: '#64748b' }}>Loading dashboard data...</div></div>}
      </div>
    </div>
  )
}

function normalizeSummary(raw: any): DashboardSummary {
  const safeArray = (value: any) => (Array.isArray(value) ? value : [])
  const toNumber = (value: any) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }

  return {
    total_orders: toNumber(raw?.total_orders),
    approved_orders: toNumber(raw?.approved_orders),
    approval_rate: toNumber(raw?.approval_rate),
    lead_time_avg_seconds: toNumber(raw?.lead_time_avg_seconds),
    lead_time_avg_hours: toNumber(raw?.lead_time_avg_hours),
    growth: toNumber(raw?.growth),
    growth_percent: toNumber(raw?.growth_percent),
    growth_month: String(raw?.growth_month || ''),
    growth_prev_month: String(raw?.growth_prev_month || ''),
    avg_order_in_daily_m: toNumber(raw?.avg_order_in_daily_m),
    avg_order_in_daily_prev_m: toNumber(raw?.avg_order_in_daily_prev_m),
    daily_order_in: safeArray(raw?.daily_order_in).map((item: any) => ({
      date: String(item?.date || ''),
      total: toNumber(item?.total),
    })),
    monthly_order_in: safeArray(raw?.monthly_order_in).map((item: any) => ({
      month: String(item?.month || ''),
      total: toNumber(item?.total),
      working_days: toNumber(item?.working_days),
      avg_daily: toNumber(item?.avg_daily),
    })),
    job_proportion: safeArray(raw?.job_proportion).map((item: any) => ({
      label: String(item?.label || '-'),
      total: toNumber(item?.total),
      percent: toNumber(item?.percent),
    })),
    product_proportion: safeArray(raw?.product_proportion).map((item: any) => ({
      label: String(item?.label || '-'),
      total: toNumber(item?.total),
      percent: toNumber(item?.percent),
    })),
    finance_company_proportion: safeArray(raw?.finance_company_proportion).map((item: any) => ({
      label: String(item?.label || '-'),
      total: toNumber(item?.total),
      percent: toNumber(item?.percent),
    })),
    dp_range: safeArray(raw?.dp_range).map((item: any) => ({
      label: String(item?.label || '-'),
      total: toNumber(item?.total),
      percent: toNumber(item?.percent),
    })),
  }
}

function formatInteger(value: number) {
  return Number(value || 0).toLocaleString('id-ID')
}

function extractNewsThumbnail(raw: unknown): string {
  let data: any = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      data = {}
    }
  }

  const main = typeof data?.foto_utama === 'string' ? data.foto_utama.trim() : ''
  if (main) return main

  const list = Array.isArray(data?.dalam_berita)
    ? data.dalam_berita.filter((item: unknown) => typeof item === 'string' && item.trim())
    : []
  return list.length > 0 ? String(list[0]) : ''
}

function getCommodityKey(item: DashboardPriceItem): string {
  const commodityId = String(item?.commodity_id || '').trim()
  if (commodityId) return commodityId
  return String(item?.commodity?.name || '').trim().toLowerCase()
}

function KpiCard({
  label,
  value,
  note,
  valueColor,
}: {
  label: string
  value: string
  note?: string
  valueColor?: string
}) {
  return (
    <div className="card">
      <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: valueColor || '#0f172a' }}>{value}</div>
      {note && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{note}</div>}
    </div>
  )
}

function PriceTrendChart({ labels, values, dates }: { labels: string[]; values: number[]; dates?: string[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!labels.length || !values.length) {
    return <div style={{ color: '#64748b', fontSize: 12 }}>No price trend data.</div>
  }

  const width = Math.max(420, labels.length * 44 + 84)
  const height = 200
  const left = 40
  const right = width - 18
  const top = 14
  const bottom = height - 40
  const plotWidth = right - left
  const plotHeight = bottom - top
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const pad = Math.max(1, Math.abs(rawMax || rawMin) * 0.05)
  const yMin = rawMin === rawMax ? rawMin - pad : rawMin
  const yMax = rawMin === rawMax ? rawMax + pad : rawMax
  const span = Math.max(0.0001, yMax - yMin)
  const stepX = labels.length > 1 ? plotWidth / (labels.length - 1) : 0
  const showStep = labels.length <= 9 ? 1 : Math.ceil(labels.length / 7)
  const singlePointX = left + plotWidth / 2

  const points = values.map((value, idx) => {
    const x = labels.length === 1 ? singlePointX : left + stepX * idx
    const y = bottom - ((value - yMin) / span) * plotHeight
    return { x, y, value }
  })
  const path = points.map((point, idx) => `${idx === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const hoveredPoint = hoveredIndex != null ? points[hoveredIndex] : null
  const hoveredDate = hoveredIndex != null ? String(dates?.[hoveredIndex] || '') : ''
  const hoveredLabel = hoveredDate ? dayjs(hoveredDate).format('DD MMM YYYY') : (hoveredIndex != null ? labels[hoveredIndex] : '')
  const tooltipPrice = hoveredPoint ? formatRupiah(Number(hoveredPoint.value || 0)) : ''
  const tooltipWidth = 150
  const tooltipX = hoveredPoint ? Math.min(Math.max(left + 4, hoveredPoint.x + 8), right - tooltipWidth) : left
  const tooltipY = top + 6

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ minWidth: width, display: 'block' }}>
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#94a3b8" strokeWidth={1} />
        <line x1={left} y1={top} x2={left} y2={bottom} stroke="#94a3b8" strokeWidth={1} />

        <path d={path} fill="none" stroke="#0ea5e9" strokeWidth={2.2} />
        {points.map((point, idx) => (
          <g key={`price-point-${idx}`}>
            <rect
              x={idx === 0 ? left : (points[idx - 1].x + point.x) / 2}
              y={top}
              width={(idx === points.length - 1 ? right : (point.x + points[idx + 1].x) / 2) - (idx === 0 ? left : (points[idx - 1].x + point.x) / 2)}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex((current) => (current === idx ? null : current))}
            />
            {(idx % showStep === 0 || idx === points.length - 1) && (
              <text x={point.x} y={bottom + 14} textAnchor="middle" fontSize={10} fill="#334155">
                {labels[idx]}
              </text>
            )}
          </g>
        ))}

        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint.x}
              y1={top}
              x2={hoveredPoint.x}
              y2={bottom}
              stroke="#38bdf8"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={42}
              rx={8}
              fill="#ffffff"
              stroke="#dbe3ef"
            />
            <text x={tooltipX + 8} y={tooltipY + 16} fontSize={11} fill="#0f172a" fontWeight={700}>
              {tooltipPrice}
            </text>
            <text x={tooltipX + 8} y={tooltipY + 31} fontSize={10} fill="#64748b">
              {hoveredLabel}
            </text>
          </>
        )}

        <text x={left} y={11} fontSize={11} fill="#0f172a" fontWeight={700}>Tren Harga Harian</text>
      </svg>
    </div>
  )
}

function BarLineChart({
  labels,
  barValues,
  lineValues,
  barName,
  lineName,
}: {
  labels: string[]
  barValues: number[]
  lineValues?: number[]
  barName: string
  lineName?: string
}) {
  if (!labels.length || !barValues.length) {
    return <div style={{ color: '#64748b', fontSize: 12 }}>No chart data.</div>
  }

  const maxLabel = labels.length
  const paddedLabels = labels.slice(0, maxLabel)
  const paddedBarValues = barValues.slice(0, maxLabel)
  const paddedLineValues = Array.isArray(lineValues) ? lineValues.slice(0, maxLabel) : []

  const width = Math.max(520, paddedLabels.length * 54 + 90)
  const height = 250
  const left = 44
  const right = width - 24
  const top = 16
  const bottom = height - 54
  const plotWidth = right - left
  const plotHeight = bottom - top
  const slotWidth = plotWidth / paddedLabels.length
  const barWidth = Math.min(26, Math.max(10, slotWidth * 0.6))
  const maxValue = Math.max(1, ...paddedBarValues, ...paddedLineValues)

  const showStep = paddedLabels.length <= 10 ? 1 : Math.ceil(paddedLabels.length / 8)

  const linePoints = paddedLineValues.map((value, idx) => {
    const centerX = left + slotWidth * idx + slotWidth / 2
    const y = bottom - (value / maxValue) * plotHeight
    return { x: centerX, y }
  })
  const linePath = linePoints.map((point, idx) => `${idx === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ minWidth: width, display: 'block' }}>
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#94a3b8" strokeWidth={1} />
        <line x1={left} y1={top} x2={left} y2={bottom} stroke="#94a3b8" strokeWidth={1} />

        {paddedBarValues.map((value, idx) => {
          const x = left + slotWidth * idx + (slotWidth - barWidth) / 2
          const h = (value / maxValue) * plotHeight
          const y = bottom - h
          return (
            <g key={`${paddedLabels[idx]}-${idx}`}>
              <rect x={x} y={y} width={barWidth} height={Math.max(1, h)} rx={4} fill="#22d3ee" />
              {idx % showStep === 0 || idx === paddedLabels.length - 1 ? (
                <text
                  x={x + barWidth / 2}
                  y={bottom + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#334155"
                  transform={`rotate(-28 ${x + barWidth / 2} ${bottom + 14})`}
                >
                  {paddedLabels[idx]}
                </text>
              ) : null}
            </g>
          )
        })}

        {paddedLineValues.length > 0 && linePath && (
          <g>
            <path d={linePath} fill="none" stroke="#f97316" strokeWidth={2} />
            {linePoints.map((point, idx) => (
              <circle key={`line-${idx}`} cx={point.x} cy={point.y} r={3} fill="#f97316" />
            ))}
          </g>
        )}

        <text x={left} y={12} fontSize={11} fill="#0f172a" fontWeight={700}>{barName}</text>
        {lineName && paddedLineValues.length > 0 && (
          <text x={left + 70} y={12} fontSize={11} fill="#f97316" fontWeight={700}>{lineName}</text>
        )}
      </svg>
    </div>
  )
}

function DonutCard({ title, subtitle, items }: { title: string; subtitle: string; items: SeriesItem[] }) {
  const slices = useMemo(() => buildDonutSlices(items), [items])
  const gradient = useMemo(() => buildDonutGradient(slices), [slices])
  const total = useMemo(() => slices.reduce((sum, item) => sum + item.total, 0), [slices])

  return (
    <div className="card">
      <h3>{title}</h3>
      <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{subtitle}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '130px minmax(0, 1fr)', gap: 10, marginTop: 12, alignItems: 'center' }}>
        {slices.length > 0 && (
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: gradient, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Total</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{formatInteger(total)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 6, maxHeight: 185, overflowY: 'auto', paddingRight: 4 }}>
          {slices.map((slice) => (
            <div key={slice.label} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: slice.color, display: 'inline-block' }} />
              <div title={slice.label} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slice.label}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{slice.percent.toFixed(1)}%</div>
              <div style={{ fontWeight: 700 }}>{formatInteger(slice.total)}</div>
            </div>
          ))}
          {slices.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>No data.</div>}
        </div>
      </div>
    </div>
  )
}

function buildDonutSlices(items: SeriesItem[], maxSlices = 6): DonutSlice[] {
  const palette = ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316']
  const rows = Array.isArray(items) ? [...items] : []
  const filtered = rows
    .map((item) => ({
      label: String(item?.label || '-'),
      total: Number(item?.total || 0),
      percent: Number(item?.percent || 0),
    }))
    .filter((item) => item.total > 0)

  if (filtered.length === 0) return []

  const top = filtered.slice(0, maxSlices)
  const others = filtered.slice(maxSlices)
  const othersTotal = others.reduce((sum, item) => sum + item.total, 0)
  const merged = othersTotal > 0 ? [...top, { label: 'Others', total: othersTotal, percent: 0 }] : top
  const sumTotal = merged.reduce((sum, item) => sum + item.total, 0)

  return merged.map((item, idx) => ({
    label: item.label,
    total: item.total,
    percent: sumTotal > 0 ? (item.total / sumTotal) * 100 : 0,
    color: palette[idx % palette.length],
  }))
}

function buildDonutGradient(slices: DonutSlice[]) {
  if (!slices.length) return '#e2e8f0'
  let start = 0
  const parts = slices.map((slice) => {
    const end = start + slice.percent
    const segment = `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`
    start = end
    return segment
  })
  return `conic-gradient(${parts.join(', ')})`
}
