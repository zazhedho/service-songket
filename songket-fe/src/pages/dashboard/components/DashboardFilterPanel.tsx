import dayjs from 'dayjs'

type DashboardAnalysis = 'yearly' | 'monthly' | 'daily' | 'custom'

type DashboardFilters = {
  area: string
  result_status: string
  analysis: DashboardAnalysis
  month: string
  year: string
  date: string
  from: string
  to: string
  dealer_id: string
  finance_company_id: string
}

type Option = {
  value: string
  label: string
}

type DashboardFilterPanelProps = {
  applyFilters: () => void
  areaOptions: Option[]
  buildAnchorDateByAnalysis: (analysis: DashboardAnalysis, yearRaw: string, monthRaw: string, currentDateRaw: string) => string
  dealerOptions: Option[]
  filtersInput: DashboardFilters
  financeOptions: Option[]
  resetFilters: () => void
  setFiltersInput: React.Dispatch<React.SetStateAction<DashboardFilters>>
  yearOptions: string[]
}

export default function DashboardFilterPanel({
  applyFilters,
  areaOptions,
  buildAnchorDateByAnalysis,
  dealerOptions,
  filtersInput,
  financeOptions,
  resetFilters,
  setFiltersInput,
  yearOptions,
}: DashboardFilterPanelProps) {
  return (
    <div className="card">
      <div className="filter-panel">
        <div className="filter-panel-head">
          <div>
            <h3 className="filter-panel-title">Filter Dashboard</h3>
            <div className="filter-panel-subtitle">Atur area, periode analisa, dealer, dan finance company dalam layout yang rapi.</div>
          </div>
        </div>
        <div className="filter-grid tight">
        <div className="filter-field">
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

        <div className="filter-field">
          <label>Status</label>
          <select value={filtersInput.result_status} onChange={(e) => setFiltersInput((prev) => ({ ...prev, result_status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="filter-field">
          <label>Analysis</label>
          <select
            value={filtersInput.analysis}
            onChange={(e) => {
              const nextAnalysis = e.target.value as DashboardAnalysis
              const now = dayjs()
              setFiltersInput((prev) => ({
                ...prev,
                analysis: nextAnalysis,
                year: prev.year || String(now.year()),
                month: prev.month || String(now.month() + 1),
                date: buildAnchorDateByAnalysis(
                  nextAnalysis,
                  prev.year || String(now.year()),
                  prev.month || String(now.month() + 1),
                  prev.date || now.format('YYYY-MM-DD'),
                ),
                from: prev.from || now.format('YYYY-MM-DD'),
                to: prev.to || now.format('YYYY-MM-DD'),
              }))
            }}
          >
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {(filtersInput.analysis === 'yearly' || filtersInput.analysis === 'monthly') && (
          <div className="filter-field">
            <label>Tahun</label>
            <select
              value={filtersInput.year}
              onChange={(e) =>
                setFiltersInput((prev) => {
                  const nextYear = e.target.value
                  return {
                    ...prev,
                    year: nextYear,
                    date: buildAnchorDateByAnalysis(prev.analysis, nextYear, prev.month, prev.date),
                  }
                })
              }
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}

        {filtersInput.analysis === 'monthly' && (
          <div className="filter-field">
            <label>Bulan</label>
            <select
              value={filtersInput.month}
              onChange={(e) =>
                setFiltersInput((prev) => {
                  const nextMonth = e.target.value
                  return {
                    ...prev,
                    month: nextMonth,
                    date: buildAnchorDateByAnalysis(prev.analysis, prev.year, nextMonth, prev.date),
                  }
                })
              }
            >
              {Array.from({ length: 12 }, (_, idx) => (
                <option key={idx + 1} value={String(idx + 1)}>
                  {String(idx + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        )}

        {(filtersInput.analysis === 'yearly' || filtersInput.analysis === 'monthly') && (
          <div className="filter-field">
            <label>Reference Date</label>
            <input
              type="date"
              value={filtersInput.date}
              onChange={(e) =>
                setFiltersInput((prev) => ({
                  ...prev,
                  date: buildAnchorDateByAnalysis(prev.analysis, prev.year, prev.month, e.target.value),
                }))
              }
            />
          </div>
        )}

        {filtersInput.analysis === 'daily' && (
          <div className="filter-field">
            <label>Date</label>
            <input type="date" value={filtersInput.date} onChange={(e) => setFiltersInput((prev) => ({ ...prev, date: e.target.value }))} />
          </div>
        )}

        {filtersInput.analysis === 'custom' && (
          <>
            <div className="filter-field">
              <label>From</label>
              <input type="date" value={filtersInput.from} onChange={(e) => setFiltersInput((prev) => ({ ...prev, from: e.target.value }))} />
            </div>
            <div className="filter-field">
              <label>To</label>
              <input type="date" value={filtersInput.to} onChange={(e) => setFiltersInput((prev) => ({ ...prev, to: e.target.value }))} />
            </div>
          </>
        )}

        <div className="filter-field">
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

        <div className="filter-field">
          <label>Finance Company</label>
          <select value={filtersInput.finance_company_id} onChange={(e) => setFiltersInput((prev) => ({ ...prev, finance_company_id: e.target.value }))}>
            <option value="">All Finance Company</option>
            {financeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        </div>

        <div className="filter-actions">
          <button className="btn" onClick={applyFilters}>Apply</button>
          <button className="btn-ghost" onClick={resetFilters}>Reset</button>
        </div>
      </div>
    </div>
  )
}
