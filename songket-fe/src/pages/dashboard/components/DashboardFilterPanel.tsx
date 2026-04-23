import dayjs from 'dayjs'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { buildMonthOptions } from '../../../utils/yearOptions'

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
  const monthOptions = buildMonthOptions()
  const areaSelectOptions = [{ value: '', label: 'All Areas' }, ...areaOptions]
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'approve', label: 'Approved' },
    { value: 'reject', label: 'Rejected' },
    { value: 'pending', label: 'Pending' },
  ]
  const analysisOptions = [
    { value: 'yearly', label: 'Yearly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'daily', label: 'Daily' },
    { value: 'custom', label: 'Custom' },
  ]
  const yearSelectOptions = yearOptions.map((year) => ({ value: year, label: year }))
  const monthSelectOptions = monthOptions
  const dealerSelectOptions = [{ value: '', label: 'All Dealers' }, ...dealerOptions]
  const financeSelectOptions = [{ value: '', label: 'All Finance Companies' }, ...financeOptions]

  return (
    <div className="card">
      <div className="compact-filter-toolbar">
        <div className="compact-filter-item narrow">
          <SearchableSelect
            id="dashboard-area-filter"
            value={filtersInput.area}
            options={areaSelectOptions}
            onChange={(value) => setFiltersInput((prev) => ({ ...prev, area: value }))}
            placeholder="All Areas"
            searchPlaceholder="Search area..."
            emptyMessage="Area not found."
          />
        </div>

        <div className="compact-filter-item narrow">
          <SearchableSelect
            id="dashboard-status-filter"
            value={filtersInput.result_status}
            options={statusOptions}
            onChange={(value) => setFiltersInput((prev) => ({ ...prev, result_status: value }))}
            placeholder="All Statuses"
            searchPlaceholder="Search status..."
            emptyMessage="Status not found."
          />
        </div>

        <div className="compact-filter-item narrow">
          <SearchableSelect
            id="dashboard-analysis-filter"
            value={filtersInput.analysis}
            options={analysisOptions}
            onChange={(value) => {
              const nextAnalysis = value as DashboardAnalysis
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
            placeholder="Select Analysis"
            searchPlaceholder="Search analysis..."
            emptyMessage="Analysis not found."
          />
        </div>

        {(filtersInput.analysis === 'yearly' || filtersInput.analysis === 'monthly') && (
          <div className="compact-filter-item narrow">
            <SearchableSelect
              id="dashboard-year-filter"
              value={filtersInput.year}
              options={yearSelectOptions}
              onChange={(value) =>
                setFiltersInput((prev) => {
                  const nextYear = value
                  return {
                    ...prev,
                    year: nextYear,
                    date: buildAnchorDateByAnalysis(prev.analysis, nextYear, prev.month, prev.date),
                  }
                })
              }
              placeholder="Select Year"
              searchPlaceholder="Search year..."
              emptyMessage="Year not found."
            />
          </div>
        )}

        {filtersInput.analysis === 'monthly' && (
          <div className="compact-filter-item narrow">
            <SearchableSelect
              id="dashboard-month-filter"
              value={filtersInput.month}
              options={monthSelectOptions}
              onChange={(value) =>
                setFiltersInput((prev) => {
                  const nextMonth = value
                  return {
                    ...prev,
                    month: nextMonth,
                    date: buildAnchorDateByAnalysis(prev.analysis, prev.year, nextMonth, prev.date),
                  }
                })
              }
              placeholder="Select Month"
              searchPlaceholder="Search month..."
              emptyMessage="Month not found."
            />
          </div>
        )}

        {(filtersInput.analysis === 'yearly' || filtersInput.analysis === 'monthly') && (
          <div className="compact-filter-item narrow">
            <div className="credit-date-field">
              <span className="credit-date-label">Cutoff Date</span>
              <input
                type="date"
                value={buildAnchorDateByAnalysis(filtersInput.analysis, filtersInput.year, filtersInput.month, filtersInput.date)}
                onChange={(e) =>
                  setFiltersInput((prev) => ({
                    ...prev,
                    date: buildAnchorDateByAnalysis(prev.analysis, prev.year, prev.month, e.target.value),
                  }))
                }
                aria-label="Cutoff date"
                title="Cutoff date determines the last day included in the selected period."
              />
            </div>
          </div>
        )}

        {filtersInput.analysis === 'daily' && (
          <div className="compact-filter-item narrow">
            <div className="credit-date-field">
              <span className="credit-date-label">Date</span>
              <input type="date" value={filtersInput.date} onChange={(e) => setFiltersInput((prev) => ({ ...prev, date: e.target.value }))} />
            </div>
          </div>
        )}

        {filtersInput.analysis === 'custom' && (
          <>
            <div className="compact-filter-item narrow">
              <div className="credit-date-field">
                <span className="credit-date-label">From</span>
                <input type="date" value={filtersInput.from} onChange={(e) => setFiltersInput((prev) => ({ ...prev, from: e.target.value }))} />
              </div>
            </div>
            <div className="compact-filter-item narrow">
              <div className="credit-date-field">
                <span className="credit-date-label">To</span>
                <input type="date" value={filtersInput.to} onChange={(e) => setFiltersInput((prev) => ({ ...prev, to: e.target.value }))} />
              </div>
            </div>
          </>
        )}

        <div className="compact-filter-item narrow">
          <SearchableSelect
            id="dashboard-dealer-filter"
            value={filtersInput.dealer_id}
            options={dealerSelectOptions}
            onChange={(value) => setFiltersInput((prev) => ({ ...prev, dealer_id: value }))}
            placeholder="All Dealers"
            searchPlaceholder="Search dealer..."
            emptyMessage="Dealer not found."
          />
        </div>

        <div className="compact-filter-item narrow">
          <SearchableSelect
            id="dashboard-finance-filter"
            value={filtersInput.finance_company_id}
            options={financeSelectOptions}
            onChange={(value) => setFiltersInput((prev) => ({ ...prev, finance_company_id: value }))}
            placeholder="All Finance Companies"
            searchPlaceholder="Search finance company..."
            emptyMessage="Finance company not found."
          />
        </div>

        <div className="compact-filter-action">
          <button className="btn" onClick={applyFilters}>Apply</button>
          <button className="btn-ghost" onClick={resetFilters}>Reset</button>
        </div>
      </div>
    </div>
  )
}
