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
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Dashboard Songket</div>
          <div style={{ color: '#64748b' }}>Monitoring Order In, komposisi data, dan performa.</div>
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
