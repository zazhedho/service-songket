import dayjs from 'dayjs'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { formatRupiah } from '../../../utils/currency'
import { BarLineChart, DashboardEmptyState, DonutCard, KpiCard, colorBySign, formatFixed, formatGrowthPercent, formatInteger, formatPercent } from './dashboardHelpers'

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
  priceTrend: { labels: string[]; values: number[] }
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
        <KpiCard label="Total Order In" value={formatInteger(summary.total_orders)} note="Filtered data" />
        <KpiCard label="Lead Time" value={`${summary.lead_time_avg_hours.toFixed(2)} hours`} note={`${summary.lead_time_avg_seconds.toFixed(0)} seconds`} />
        <KpiCard label="Approval Rate" value={`${(summary.approval_rate * 100).toFixed(2)}%`} note={`${formatInteger(summary.approved_orders)} approved`} />
        <KpiCard
          label="Growth"
          value={`${summary.growth_percent >= 0 ? '+' : ''}${summary.growth_percent.toFixed(2)}%`}
          note={growthNote}
          valueColor={summary.growth_percent >= 0 ? '#166534' : '#b91c1c'}
        />
      </div>

      <div className="dashboard-panel-grid">
        <div className="card">
          <div className="dashboard-card-head">
            <div>
              <h3>Daily Order In Trend</h3>
              <div className="dashboard-card-note">Daily order-in trend based on pooling date.</div>
            </div>
            <span className="dashboard-card-tag">Trend</span>
          </div>
          <div style={{ marginTop: 10 }}>
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

        <div className="card">
          <div className="dashboard-card-head">
            <div>
              <h3>Daily Finance Approve</h3>
              <div className="dashboard-card-note">
                Daily approve/reject data from the order finance attempts table, based on the current dashboard filter.
              </div>
            </div>
            <span className="dashboard-card-tag">Finance</span>
          </div>
          <div style={{ marginTop: 10 }}>
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

      <div className="card">
        <div className="dashboard-card-head">
          <div>
            <h3>Order In Approve/Reject Summary</h3>
            <div className="dashboard-card-note">Comparison between the active period and the previous period.</div>
          </div>
          <span className="dashboard-card-tag">{growthNote}</span>
        </div>
        <div className="dashboard-table-shell">
          <table className="table responsive-stack">
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

      <div className="card">
        <div className="dashboard-card-head">
          <div>
            <h3>Range DP</h3>
            <div className="dashboard-card-note">DP range distribution from &lt;10% to &gt;=40%.</div>
          </div>
          <span className="dashboard-card-tag">DP Mix</span>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {summary.dp_range.map((item: any) => (
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
          {summary.dp_range.length === 0 && <DashboardEmptyState title="No DP range data" note="DP distribution will appear when finance data is available." compact />}
        </div>
      </div>

      <div className="dashboard-panel-grid dashboard-panel-grid-secondary">
        <div className="card">
          <div className="dashboard-card-head">
            <div>
              <h3>Latest News</h3>
              <div className="dashboard-card-note">Latest news summary slideshow.</div>
            </div>
            <span className="dashboard-card-tag">News</span>
          </div>
          <div style={{ marginTop: 10 }}>
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
                    <img src={activeNewsThumb} alt={activeNewsItem.title || 'News thumbnail'} style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }} />
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
                    <button className="btn-ghost" onClick={() => setActiveNewsIndex((prev) => (prev - 1 + latestNews.length) % latestNews.length)}>
                      Prev
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {latestNews.map((_: any, idx: number) => (
                        <button
                          key={`news-dot-${idx}`}
                          type="button"
                          onClick={() => setActiveNewsIndex(idx)}
                          aria-label={`Slide ${idx + 1}`}
                          style={{ width: 8, height: 8, borderRadius: 999, border: '0', cursor: 'pointer', background: idx === activeNewsIndex ? '#2563eb' : '#cbd5e1' }}
                        />
                      ))}
                    </div>
                    <button className="btn-ghost" onClick={() => setActiveNewsIndex((prev) => (prev + 1) % latestNews.length)}>
                      Next
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                  {latestNews.map((item: any, idx: number) => (
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
                      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>{item.title || '-'}</div>
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
          <div className="dashboard-card-head">
            <div>
              <h3>Latest Commodity Prices</h3>
              <div className="dashboard-card-note">Latest commodity price updates.</div>
            </div>
            <span className="dashboard-card-tag">Commodity</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>Commodity Chart</label>
            <SearchableSelect
              value={selectedTrendCommodity}
              onChange={setSelectedTrendCommodity}
              options={commodityChartOptions}
              placeholder="Select commodity"
              searchPlaceholder="Search commodity..."
              disabled={trendCommodityOptions.length === 0}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <BarLineChart labels={priceTrend.labels} barValues={priceTrend.values} barName="Daily Commodity Prices" />
          </div>
          <div className="dashboard-table-shell">
            <table className="table dashboard-latest-prices-table metric-table">
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
                      <td>
                        <div className="table-stack-cell">
                          <div className="table-stack-primary" title={item.commodity?.name || '-'}>
                            {item.commodity?.name || '-'}
                          </div>
                          <div className="table-stack-secondary" title={item.commodity?.unit || '-'}>
                            {item.commodity?.unit ? `Unit: ${item.commodity.unit}` : 'Unit not available'}
                          </div>
                        </div>
                      </td>
                      <td className="table-metric-cell">
                        <span className="table-metric-pill total">{formatRupiah(Number(item.price || 0))}</span>
                      </td>
                      <td>
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
