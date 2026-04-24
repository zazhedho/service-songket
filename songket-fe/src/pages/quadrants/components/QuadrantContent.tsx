import { useState } from 'react'
import Pagination from '../../../components/common/Pagination'
import SearchableSelect from '../../../components/common/SearchableSelect'
import { buildAnalysisText, formatAxisPercent, getOrderInGrowth, quadrantColor } from './quadrantHelpers'
import { buildMonthOptions } from '../../../utils/yearOptions'

type QuadrantContentProps = {
  activePoint: any
  activePointId: string
  chart: any
  currentYear: number
  filter: { province: string; regency: string; search: string }
  filtered: any[]
  isLoading: boolean
  isMobile: boolean
  limit: number
  loadError: string
  page: number
  paged: any[]
  provinceOptions: Array<{ value: string; label: string }>
  referencePeriod: string
  regencyOptions: Array<{ value: string; label: string }>
  selectedMonth: string
  selectedYear: string
  setActivePointId: React.Dispatch<React.SetStateAction<string>>
  setFilter: React.Dispatch<React.SetStateAction<{ province: string; regency: string; search: string }>>
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setSelectedMonth: React.Dispatch<React.SetStateAction<string>>
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>
  tooltip: any
  totalPages: number
  yearOptions: string[]
}

export default function QuadrantContent({
  activePoint,
  activePointId,
  chart,
  currentYear,
  filter,
  filtered,
  isLoading,
  isMobile,
  limit,
  loadError,
  page,
  paged,
  provinceOptions,
  referencePeriod,
  regencyOptions,
  selectedMonth,
  selectedYear,
  setActivePointId,
  setFilter,
  setLimit,
  setPage,
  setSelectedMonth,
  setSelectedYear,
  tooltip,
  totalPages,
  yearOptions,
}: QuadrantContentProps) {
  const [expandedAnalysisIds, setExpandedAnalysisIds] = useState<Record<string, boolean>>({})
  const monthOptions = buildMonthOptions()
  const provinceSelectOptions = [{ value: '', label: 'All Provinces' }, ...provinceOptions]
  const regencySelectOptions = [{ value: '', label: 'All Regencies' }, ...regencyOptions]
  const yearSelectOptions = [{ value: '', label: 'Latest Year' }, ...yearOptions.map((year) => ({ value: year, label: year }))]
  const monthSelectOptions = [{ value: '', label: 'Latest Month' }, ...monthOptions]

  return (
    <div className="page">
      <div className="card">
        <h3>Quadrant Flow</h3>
        <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
          Backend-computed job and area points. Vertical axis: Order In Growth (%) vs previous month. Horizontal axis: Credit Capability (%). Period: {referencePeriod}.
        </div>

        <div className="compact-filter-toolbar" style={{ marginTop: 12 }}>
          <div className="compact-filter-item narrow">
            <SearchableSelect
              id="quadrant-province-filter"
              value={filter.province}
              options={provinceSelectOptions}
              onChange={(value) => setFilter((prev) => ({ ...prev, province: value, regency: '' }))}
              placeholder="All Provinces"
              searchPlaceholder="Search province..."
              emptyMessage="Province not found."
            />
          </div>

          <div className="compact-filter-item narrow">
            <SearchableSelect
              id="quadrant-regency-filter"
              value={filter.regency}
              options={regencySelectOptions}
              onChange={(value) => setFilter((prev) => ({ ...prev, regency: value }))}
              placeholder="All Regencies"
              searchPlaceholder="Search regency..."
              emptyMessage="Regency not found."
              disabled={!regencyOptions.length}
            />
          </div>

          <div className="compact-filter-item grow-2">
            <input value={filter.search} onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))} placeholder="Search job, province, or regency" aria-label="Search quadrant job or area" />
          </div>

          <div className="compact-filter-item narrow">
            <SearchableSelect
              id="quadrant-year-filter"
              value={selectedYear}
              options={yearSelectOptions}
              onChange={(nextYear) => {
                setSelectedYear(nextYear)
                if (!nextYear) {
                  setSelectedMonth('')
                }
              }}
              placeholder="Latest Year"
              searchPlaceholder="Search year..."
              emptyMessage="Year not found."
            />
          </div>

          <div className="compact-filter-item narrow">
            <SearchableSelect
              id="quadrant-month-filter"
              value={selectedMonth}
              options={monthSelectOptions}
              onChange={(nextMonth) => {
                setSelectedMonth(nextMonth)
                if (nextMonth && !selectedYear) {
                  setSelectedYear(String(currentYear))
                }
              }}
              placeholder="Latest Month"
              searchPlaceholder="Search month..."
              emptyMessage="Month not found."
            />
          </div>

          <div className="compact-filter-action">
            <button
              className="btn-ghost"
              onClick={() => {
                setFilter({ province: '', regency: '', search: '' })
                setSelectedMonth('')
                setSelectedYear('')
              }}
              disabled={!filter.province && !filter.regency && !filter.search.trim() && !selectedMonth && !selectedYear}
              title="Clear all filters"
              aria-label="Clear all filters"
              style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
            >
              ×
            </button>
          </div>
        </div>

        {loadError && <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 12 }}>{loadError}</div>}

        <div style={{ marginTop: 14 }}>
          {isLoading && <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>Loading quadrant points...</div>}
          {!isLoading && filtered.length === 0 && <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>No quadrant points for selected period/filter.</div>}
          <svg
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            width="100%"
            style={{ display: 'block', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14 }}
          >
            <rect x={chart.left} y={chart.top} width={chart.right - chart.left} height={chart.bottom - chart.top} fill="#f8fafc" stroke="#111827" strokeWidth={1.8} strokeDasharray="2 8" rx={10} />

            <line x1={chart.xSplit} y1={chart.top} x2={chart.xSplit} y2={chart.bottom} stroke="#111827" strokeWidth={1.8} shapeRendering="crispEdges" />
            <line x1={chart.left} y1={chart.ySplit} x2={chart.right} y2={chart.ySplit} stroke="#111827" strokeWidth={1.8} shapeRendering="crispEdges" />

            {chart.borderTicks.map((value: number) => (
              <text key={`bottom-${value}`} x={chart.toX(value)} y={chart.bottom + (isMobile ? 12 : 16)} textAnchor="middle" fontSize={isMobile ? 7.5 : 10} fontWeight={700} fill="#111827">
                {value}%
              </text>
            ))}

            {chart.yTicks.map((value: number) => (
              <text key={`left-${value}`} x={chart.left - (isMobile ? 4 : 8)} y={chart.toY(value) + 3} textAnchor="end" fontSize={isMobile ? 7.5 : 10} fontWeight={700} fill="#111827">
                {formatAxisPercent(value)}
              </text>
            ))}

            <text x={chart.xSplit} y={chart.bottom + (isMobile ? 24 : 28)} textAnchor="middle" fontSize={isMobile ? 8 : 11} fontWeight={700} fill="#111827">
              {chart.splitXPercent}%
            </text>

            <text x={chart.left - (isMobile ? 16 : 20)} y={chart.ySplit + 4} textAnchor="end" fontSize={isMobile ? 8 : 11} fontWeight={700} fill="#111827">
              {chart.splitYGrowthPercent}%
            </text>

            <text x={chart.xSplit} y={chart.top - (isMobile ? 6 : 10)} textAnchor="middle" fontSize={isMobile ? 12 : 16} fontWeight={700} fill="#111827">
              Order In Growth
            </text>
            <text x={chart.right - 6} y={chart.ySplit - (isMobile ? 10 : 12)} textAnchor="end" fontSize={isMobile ? 12 : 16} fontWeight={700} fill="#111827">
              Credit Capability
            </text>

            <text x={(chart.left + chart.xSplit) / 2} y={(chart.top + chart.ySplit) / 2} textAnchor="middle" fontSize={isMobile ? 11 : 20} fontWeight={700} fill="#16a34a">Quadrant 1</text>
            <text x={(chart.xSplit + chart.right) / 2} y={(chart.top + chart.ySplit) / 2} textAnchor="middle" fontSize={isMobile ? 11 : 20} fontWeight={700} fill="#f97316">Quadrant 3</text>
            <text x={(chart.left + chart.xSplit) / 2} y={(chart.ySplit + chart.bottom) / 2} textAnchor="middle" fontSize={isMobile ? 11 : 20} fontWeight={700} fill="#f59e0b">Quadrant 2</text>
            <text x={(chart.xSplit + chart.right) / 2} y={(chart.ySplit + chart.bottom) / 2} textAnchor="middle" fontSize={isMobile ? 11 : 20} fontWeight={700} fill="#ef4444">Quadrant 4</text>

            {chart.points.map((point: any) => (
              <g key={point.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={point.id === activePointId ? (isMobile ? 7 : 8) : isMobile ? 5 : 6}
                  fill={quadrantColor(point.quadrant)}
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ cursor: 'default' }}
                  onMouseEnter={() => setActivePointId(point.id)}
                  onMouseLeave={() => setActivePointId('')}
                />
              </g>
            ))}

            {activePoint && tooltip && (
              <g pointerEvents="none">
                <rect x={tooltip.x} y={tooltip.y} width={tooltip.width} height={tooltip.height} rx={6} fill="#0f172a" opacity={0.94} />
                <text x={tooltip.x + 10} y={tooltip.y + 22} fontSize={isMobile ? 11 : 12} fill="#fff" fontWeight={700}>
                  {`${activePoint.jobName}`}
                </text>
                <text x={tooltip.x + 10} y={tooltip.y + 40} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                  {`Total Order In: ${Number(activePoint.totalOrders || 0).toLocaleString('id-ID')}`}
                </text>
                <text x={tooltip.x + 10} y={tooltip.y + 56} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                  {`Order In Growth: ${activePoint.orderInGrowthPercent >= 0 ? '+' : ''}${activePoint.orderInGrowthPercent.toFixed(2)}%`}
                </text>
                <text x={tooltip.x + 10} y={tooltip.y + 72} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                  {`Area: ${activePoint.areaLabel || '-'}`}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="card">
        <h3>Job Points</h3>
        <div className="table-responsive">
          <table className="table quadrant-job-points-table" style={{ marginTop: 10, minWidth: 980 }}>
            <thead>
              <tr>
                <th>Job</th>
                <th>Area</th>
                <th>Total Order In</th>
                <th>Order In Growth %</th>
                <th>Credit Capability %</th>
                <th>Quadrant</th>
                <th>Analysis</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, idx) => {
                const orderInGrowth = getOrderInGrowth(row)
                const rowKey = `${row.job_id || row.job_name}-${idx}`
                const analysisText = buildAnalysisText(row)
                const isExpanded = Boolean(expandedAnalysisIds[rowKey])
                const analysisPreviewLimit = 52
                const shouldCollapse = analysisText.length > analysisPreviewLimit
                const previewText = shouldCollapse
                  ? `${analysisText.slice(0, analysisPreviewLimit).trimEnd()}...`
                  : analysisText

                return (
                  <tr key={rowKey}>
                    <td className="quadrant-job-cell">{row.job_name || '-'}</td>
                    <td className="quadrant-area-cell">
                      <div className="quadrant-area-primary">{row.regency_label || '-'}</div>
                      <div className="quadrant-area-secondary">{row.province_label || '-'}</div>
                    </td>
                    <td className="quadrant-metric-cell">{Number(row.order_in_current_total ?? row.total_orders ?? 0).toLocaleString('id-ID')}</td>
                    <td className="quadrant-metric-cell">{`${orderInGrowth >= 0 ? '+' : ''}${orderInGrowth.toFixed(2)}%`}</td>
                    <td className="quadrant-metric-cell">{row.credit_capability.toFixed(2)}%</td>
                    <td className="quadrant-badge-cell">
                      <span className="badge" style={{ background: quadrantColor(row.quadrant), color: '#fff' }}>
                        Q{row.quadrant}
                      </span>
                    </td>
                    <td className="quadrant-analysis-cell">
                      <div className={isExpanded ? 'quadrant-analysis-text expanded' : 'quadrant-analysis-text'}>
                        {isExpanded ? analysisText : previewText}
                      </div>
                      {shouldCollapse && (
                        <button
                          type="button"
                          className="quadrant-analysis-toggle"
                          onClick={() => setExpandedAnalysisIds((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                        >
                          {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={7}>No data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalData={filtered.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(next) => {
            setLimit(next)
            setPage(1)
          }}
          limitOptions={[10, 20, 50]}
        />
      </div>
    </div>
  )
}
