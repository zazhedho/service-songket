import DashboardFilterPanel from './components/DashboardFilterPanel'
import DashboardContent from './components/DashboardContent'
import {
  buildAnchorDateByAnalysis,
  resolveSnapshotPeriodLabel,
  useDashboardData,
} from './hooks/useDashboardData'

export default function DashboardPage() {
  const {
    activeNewsIndex,
    activeNewsItem,
    activeNewsThumb,
    applyFilters,
    areaOptions,
    dailyDistributionTrend,
    dailyFinanceDecisionTrend,
    dealerOptions,
    error,
    filtersApplied,
    filtersInput,
    financeOptions,
    growthNote,
    latestCardsLoading,
    latestNews,
    latestPriceTableRows,
    loading,
    priceTrend,
    resetFilters,
    selectedTrendCommodity,
    setActiveNewsIndex,
    setFiltersInput,
    setSelectedTrendCommodity,
    summary,
    trendCommodityOptions,
    yearOptions,
  } = useDashboardData()

  return (
    <div className="dashboard-shell">
      <div className="header dashboard-hero-panel">
        <div className="dashboard-hero-copy">
          <div className="dashboard-hero-eyebrow">Operations Overview</div>
          <div className="dashboard-hero-title">SONGKET Dashboard</div>
          <div className="dashboard-hero-subtitle">
            Track order inflow, finance outcomes, dealer movement, and commodity updates from one focused view.
          </div>
          <div className="dashboard-context-row">
            <span className="dashboard-context-pill">Order In</span>
            <span className="dashboard-context-pill">Finance Decisions</span>
            <span className="dashboard-context-pill subtle">Cutoff Comparison</span>
          </div>
        </div>
        <div className="dashboard-hero-visual" aria-hidden="true">
          <div className="dashboard-hero-orbit main">Order In</div>
          <div className="dashboard-hero-orbit finance">Finance</div>
          <div className="dashboard-hero-orbit dealer">Dealer</div>
        </div>
      </div>

      <div className="page">
        <DashboardFilterPanel
          applyFilters={applyFilters}
          areaOptions={areaOptions}
          buildAnchorDateByAnalysis={buildAnchorDateByAnalysis}
          dealerOptions={dealerOptions}
          filtersInput={filtersInput}
          financeOptions={financeOptions}
          resetFilters={resetFilters}
          setFiltersInput={setFiltersInput}
          yearOptions={yearOptions}
        />

        <DashboardContent
          activeNewsIndex={activeNewsIndex}
          activeNewsItem={activeNewsItem}
          activeNewsThumb={activeNewsThumb}
          dailyDistributionTrend={dailyDistributionTrend}
          dailyFinanceDecisionTrend={dailyFinanceDecisionTrend}
          error={error}
          filtersApplied={filtersApplied}
          growthNote={growthNote}
          latestCardsLoading={latestCardsLoading}
          latestNews={latestNews}
          latestPriceTableRows={latestPriceTableRows}
          loading={loading}
          priceTrend={priceTrend}
          resolveSnapshotPeriodLabel={resolveSnapshotPeriodLabel}
          selectedTrendCommodity={selectedTrendCommodity}
          setActiveNewsIndex={setActiveNewsIndex}
          setSelectedTrendCommodity={setSelectedTrendCommodity}
          summary={summary}
          trendCommodityOptions={trendCommodityOptions}
        />
      </div>
    </div>
  )
}
