import dayjs from 'dayjs'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { formatRupiah } from '../../../utils/currency'
import { BarLineChart, DashboardEmptyState, DonutCard, KpiCard, PriceTrendChart, colorBySign, formatFixed, formatGrowthPercent, formatInteger, formatPercent } from './dashboardHelpers'

type DashboardContentProps = {
  activeNewsIndex: number
  activeNewsItem: any
  activeNewsThumb: string
  dailyDistributionTrend: any
  dailyFinanceDecisionTrend: any
  error: string
  filtersApplied: { analysis: string }
  growthNote: string
  latestCardsLoading: boolean
  latestNews: any[]
  latestPriceTableRows: any[]
  loading: boolean
  priceTrend: { labels: string[]; values: number[]; dates?: string[] }
  resolveSnapshotPeriodLabel: (analysisRaw: string, rowType: 'value' | 'growth', index: number) => string
  selectedTrendCommodity: string
  setActiveNewsIndex: React.Dispatch<React.SetStateAction<number>>
  setSelectedTrendCommodity: React.Dispatch<React.SetStateAction<string>>
  summary: any
  trendCommodityOptions: Array<{ value: string; label: string }>
}

export default function DashboardContent({
  activeNewsIndex,
  activeNewsItem,
  activeNewsThumb,
  dailyDistributionTrend,
  dailyFinanceDecisionTrend,
  error,
  filtersApplied,
  growthNote,
  latestCardsLoading,
  latestNews,
  latestPriceTableRows,
  loading,
  priceTrend,
  resolveSnapshotPeriodLabel,
  selectedTrendCommodity,
  setActiveNewsIndex,
  setSelectedTrendCommodity,
  summary,
  trendCommodityOptions,
}: DashboardContentProps) {
  const hasSummaryData =
    Number(summary.total_orders || 0) > 0 ||
    summary.order_decision_snapshot.length > 0 ||
    summary.job_proportion.length > 0 ||
    summary.product_proportion.length > 0 ||
    summary.finance_company_proportion.length > 0 ||
    summary.dp_range.length > 0

  const commodityChartOptions = trendCommodityOptions.length > 0
    ? trendCommodityOptions
    : [{ value: '', label: 'No commodity' }]

  if (loading && !hasSummaryData) {
    return (
      <div className="dashboard-loading-shell">
        <div className="dashboard-skeleton-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`dashboard-kpi-skeleton-${index}`} className="dashboard-skeleton-card dashboard-skeleton-short" />
          ))}
        </div>
        <div className="dashboard-skeleton-grid dashboard-skeleton-grid-wide">
          <div className="dashboard-skeleton-card dashboard-skeleton-tall" />
          <div className="dashboard-skeleton-card dashboard-skeleton-tall" />
        </div>
        <div className="dashboard-skeleton-card dashboard-skeleton-block" />
      </div>
    )
  }

  return (
    <>
      {error && <div className="alert">{error}</div>}

      <div className="dashboard-kpi-grid">
        <KpiCard label="Total Order In" value={formatInteger(summary.total_orders)} note="Orders in the active filter" tone="blue" icon="OI" />
        <KpiCard label="Lead Time" value={`${summary.lead_time_avg_hours.toFixed(2)} hours`} note={`${summary.lead_time_avg_seconds.toFixed(0)} seconds average`} tone="cyan" icon="LT" />
        <KpiCard label="Approval Rate" value={`${(summary.approval_rate * 100).toFixed(2)}%`} note={`${formatInteger(summary.approved_orders)} approved orders`} tone="green" icon="AR" />
        <KpiCard
          label="Growth"
          value={`${summary.growth_percent >= 0 ? '+' : ''}${summary.growth_percent.toFixed(2)}%`}
          note={growthNote}
          tone={summary.growth_percent >= 0 ? 'emerald' : 'red'}
          icon="GR"
          valueColor={summary.growth_percent >= 0 ? '#166534' : '#b91c1c'}
        />
      </div>

      <div className="dashboard-panel-grid">
        <div className="card dashboard-chart-card">
          <div className="dashboard-card-head">
            <div>
              <h3>Daily Order In Trend</h3>
              <div className="dashboard-card-note">Order-in movement by pooling date.</div>
            </div>
            <span className="dashboard-card-tag">Trend</span>
          </div>
          <div className="dashboard-chart-shell">
            <BarLineChart
              labels={dailyDistributionTrend.labels}
              barValues={dailyDistributionTrend.values}
              barName="Order In"
              xAxisLabel="Date"
              tooltipDetails={dailyDistributionTrend.tooltipDetails}
              barColor="#f97316"
              barHoverColor="#ea580c"
            />
          </div>
        </div>

        <div className="card dashboard-chart-card">
          <div className="dashboard-card-head">
            <div>
              <h3>Daily Finance Approve</h3>
              <div className="dashboard-card-note">Approved and rejected finance outcomes by day.</div>
            </div>
            <span className="dashboard-card-tag">Finance</span>
          </div>
          <div className="dashboard-chart-shell">
            <BarLineChart
              labels={dailyFinanceDecisionTrend.labels}
              barValues={dailyFinanceDecisionTrend.approveValues}
              secondaryBarValues={dailyFinanceDecisionTrend.rejectValues}
              barName="Finance Approve"
              secondaryBarName="Finance Reject"
              xAxisLabel="Date"
              tooltipDetails={dailyFinanceDecisionTrend.tooltipDetails}
              tooltipExtraLines={dailyFinanceDecisionTrend.tooltipExtraLines}
              barColor="#3b82f6"
              barHoverColor="#2563eb"
              secondaryBarColor="#ef4444"
              secondaryBarHoverColor="#dc2626"
            />
          </div>
        </div>
      </div>

      <div className="card dashboard-summary-card">
        <div className="dashboard-card-head">
          <div>
            <h3>Order In Approve/Reject Summary</h3>
            <div className="dashboard-card-note">Comparison between the active period and the previous period.</div>
          </div>
          <span className="dashboard-card-tag">{growthNote}</span>
        </div>
        <div className="dashboard-table-shell">
          <table className="table responsive-stack dashboard-summary-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Order In</th>
                <th>Approve</th>
                <th>Reject</th>
                <th>Avg Daily Sales</th>
                <th>Approve Rate</th>
                <th>Reject Rate</th>
              </tr>
            </thead>
            <tbody>
              {summary.order_decision_snapshot.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <DashboardEmptyState title="No summary data" note="Order decision comparison will appear when the selected period has data." compact />
                  </td>
                </tr>
              )}
              {summary.order_decision_snapshot.map((row: any, idx: number) => {
                const isGrowth = row.row_type === 'growth'
                const periodLabel = resolveSnapshotPeriodLabel(summary.analysis_applied || filtersApplied.analysis, row.row_type, idx)
                return (
                  <tr key={`decision-row-${row.label}-${idx}`}>
                    <td data-label="Period" style={{ fontWeight: 700 }}>{periodLabel}</td>
                    <td data-label="Order In" style={{ color: isGrowth ? colorBySign(row.order_in) : undefined }}>
                      {isGrowth ? formatGrowthPercent(row.order_in) : formatInteger(row.order_in)}
                    </td>
                    <td data-label="Approve" style={{ color: isGrowth ? colorBySign(row.approve) : undefined }}>
                      {isGrowth ? formatGrowthPercent(row.approve) : formatInteger(row.approve)}
                    </td>
                    <td data-label="Reject" style={{ color: isGrowth ? colorBySign(row.reject) : undefined }}>
                      {isGrowth ? formatGrowthPercent(row.reject) : formatInteger(row.reject)}
                    </td>
                    <td data-label="Avg Daily Sales" style={{ color: isGrowth ? colorBySign(row.avg_daily_sales) : undefined }}>
                      {isGrowth ? formatGrowthPercent(row.avg_daily_sales) : formatFixed(row.avg_daily_sales)}
                    </td>
                    <td data-label="Approve Rate" style={{ color: isGrowth ? colorBySign(row.approve_rate_percent) : undefined }}>
                      {isGrowth ? formatGrowthPercent(row.approve_rate_percent) : formatPercent(row.approve_rate_percent)}
                    </td>
                    <td data-label="Reject Rate" style={{ color: isGrowth ? colorBySign(row.reject_rate_percent) : undefined }}>
                      {isGrowth ? formatGrowthPercent(row.reject_rate_percent) : formatPercent(row.reject_rate_percent)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-donut-grid">
        <DonutCard title="Job Proportion" subtitle="Order-in distribution by job" items={summary.job_proportion} />
        <DonutCard title="Product Proportion" subtitle="Order-in distribution by product" items={summary.product_proportion} />
        <DonutCard title="Finance Company Proportion" subtitle="Order-in distribution by finance company" items={summary.finance_company_proportion} />
      </div>

      <div className="card dashboard-range-card">
        <div className="dashboard-card-head">
          <div>
            <h3>DP Range</h3>
            <div className="dashboard-card-note">Down payment distribution across the active filter.</div>
          </div>
          <span className="dashboard-card-tag">DP Mix</span>
        </div>
        <div className="dashboard-range-list">
          {summary.dp_range.map((item: any) => {
            const percent = Math.min(100, Math.max(0, Number(item.percent || 0)))
            return (
              <div
                key={item.label}
                className="dashboard-range-row"
                style={{ '--range-percent': `${percent}%` } as React.CSSProperties}
              >
                <div className="dashboard-range-label">{item.label}</div>
                <div className="dashboard-range-track" aria-hidden="true">
                  <div className="dashboard-range-fill" />
                </div>
                <div className="dashboard-range-value">{formatInteger(item.total)}</div>
                <div className="dashboard-range-percent">{Number(item.percent || 0).toFixed(1)}%</div>
              </div>
            )
          })}
          {summary.dp_range.length === 0 && <DashboardEmptyState title="No DP range data" note="DP distribution will appear when finance data is available." compact />}
        </div>
      </div>

      <div className="dashboard-panel-grid dashboard-panel-grid-secondary">
        <div className="card dashboard-news-panel">
          <div className="dashboard-card-head">
            <div>
              <h3>Latest News</h3>
              <div className="dashboard-card-note">Recent headlines related to the monitored market.</div>
            </div>
            <span className="dashboard-card-tag">News</span>
          </div>
          <div className="dashboard-news-body">
            {latestCardsLoading && <div className="dashboard-inline-state">Loading news...</div>}
            {!latestCardsLoading && latestNews.length === 0 && (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-title">No news data</div>
                <div className="dashboard-empty-note">Latest external headlines will appear here when source data is available.</div>
              </div>
            )}
            {!latestCardsLoading && activeNewsItem && (
              <>
                <a
                  href={activeNewsItem.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="dashboard-news-feature"
                >
                  {activeNewsThumb && (
                    <img src={activeNewsThumb} alt={activeNewsItem.title || 'News thumbnail'} className="dashboard-news-image" />
                  )}
                  <div className="dashboard-news-feature-content">
                    <div className="dashboard-news-title">{activeNewsItem.title || '-'}</div>
                    <div className="dashboard-news-meta">
                      {activeNewsItem.source_name || '-'} • {activeNewsItem.published_at ? dayjs(activeNewsItem.published_at).format('DD MMM YYYY HH:mm') : '-'}
                    </div>
                  </div>
                </a>

                {latestNews.length > 1 && (
                  <div className="dashboard-news-controls">
                    <button className="btn-ghost" onClick={() => setActiveNewsIndex((prev) => (prev - 1 + latestNews.length) % latestNews.length)}>
                      Prev
                    </button>
                    <div className="dashboard-news-dots">
                      {latestNews.map((_: any, idx: number) => (
                        <button
                          key={`news-dot-${idx}`}
                          type="button"
                          onClick={() => setActiveNewsIndex(idx)}
                          aria-label={`Slide ${idx + 1}`}
                          className={`dashboard-news-dot${idx === activeNewsIndex ? ' active' : ''}`}
                        />
                      ))}
                    </div>
                    <button className="btn-ghost" onClick={() => setActiveNewsIndex((prev) => (prev + 1) % latestNews.length)}>
                      Next
                    </button>
                  </div>
                )}

                <div className="dashboard-news-list">
                  {latestNews.map((item: any, idx: number) => (
                    <a
                      key={`news-list-${item.id || idx}`}
                      href={item.url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      onMouseEnter={() => setActiveNewsIndex(idx)}
                      onFocus={() => setActiveNewsIndex(idx)}
                      className={`dashboard-news-list-item${idx === activeNewsIndex ? ' active' : ''}`}
                    >
                      <div className="dashboard-news-list-title">{item.title || '-'}</div>
                      <div className="dashboard-news-meta">
                        {item.source_name || '-'} • {item.published_at ? dayjs(item.published_at).format('DD MMM YYYY HH:mm') : '-'}
                      </div>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card dashboard-commodity-panel">
          <div className="dashboard-card-head">
            <div>
              <h3>Latest Commodity Prices</h3>
              <div className="dashboard-card-note">Recent price movement for the selected commodity.</div>
            </div>
            <span className="dashboard-card-tag">Commodity</span>
          </div>
          <div className="dashboard-commodity-filter">
            <label className="dashboard-field-label">Price Trend</label>
            <SearchableSelect
              value={selectedTrendCommodity}
              onChange={setSelectedTrendCommodity}
              options={commodityChartOptions}
              placeholder="Select commodity"
              searchPlaceholder="Search commodity..."
              disabled={trendCommodityOptions.length === 0}
            />
          </div>
          <div className="dashboard-chart-shell dashboard-price-chart-shell">
            <PriceTrendChart labels={priceTrend.labels} values={priceTrend.values} dates={priceTrend.dates} />
          </div>
          <div className="dashboard-table-shell">
            <table className="table responsive-stack dashboard-latest-prices-table metric-table">
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th>Price</th>
                  <th>Collected</th>
                </tr>
              </thead>
              <tbody>
                {latestCardsLoading && (
                  <tr>
                    <td colSpan={3}>
                      <DashboardEmptyState title="Loading prices" note="Fetching the latest commodity price snapshot." compact />
                    </td>
                  </tr>
                )}
                {!latestCardsLoading && latestPriceTableRows.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <DashboardEmptyState title="No price data" note="Commodity prices will appear after scrape or manual entry data is available." compact />
                    </td>
                  </tr>
                )}
                {!latestCardsLoading && latestPriceTableRows.map((item: any) => {
                  const collectedAt = item.collected_at ? dayjs(item.collected_at) : null
                  return (
                    <tr key={item.id}>
                      <td data-label="Commodity">
                        <div className="table-stack-cell">
                          <div className="table-stack-primary" title={item.commodity?.name || '-'}>
                            {item.commodity?.name || '-'}
                          </div>
                          <div className="table-stack-secondary" title={item.commodity?.unit || '-'}>
                            {item.commodity?.unit ? `Unit: ${item.commodity.unit}` : 'Unit not available'}
                          </div>
                        </div>
                      </td>
                      <td data-label="Price" className="table-metric-cell">
                        <span className="table-metric-pill total">{formatRupiah(Number(item.price || 0))}</span>
                      </td>
                      <td data-label="Collected">
                        <div className="table-stack-cell">
                          <div className="table-stack-primary">{collectedAt ? collectedAt.format('DD MMM YYYY') : '-'}</div>
                          <div className="table-stack-tertiary">{collectedAt ? collectedAt.format('HH:mm') : 'No timestamp'}</div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {loading && hasSummaryData && <div className="dashboard-inline-state">Refreshing dashboard data...</div>}
    </>
  )
}
