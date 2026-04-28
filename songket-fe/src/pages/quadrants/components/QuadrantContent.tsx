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
  const quadrantLegend = [
    { key: 1, label: 'Q1', name: 'Growth focus', color: quadrantColor(1) },
    { key: 3, label: 'Q3', name: 'High capability', color: quadrantColor(3) },
    { key: 2, label: 'Q2', name: 'Needs lift', color: quadrantColor(2) },
    { key: 4, label: 'Q4', name: 'Priority risk', color: quadrantColor(4) },
  ]
  const quadrantRegions = [
    {
      key: 1,
      label: 'Quadrant 1',
      shortLabel: 'Q1',
      description: 'Growth focus',
      color: quadrantColor(1),
      x: chart.left,
      y: chart.top,
      width: chart.xSplit - chart.left,
      height: chart.ySplit - chart.top,
      labelX: (chart.left + chart.xSplit) / 2,
      labelY: (chart.top + chart.ySplit) / 2,
    },
    {
      key: 3,
      label: 'Quadrant 3',
      shortLabel: 'Q3',
      description: 'High capability',
      color: quadrantColor(3),
      x: chart.xSplit,
      y: chart.top,
      width: chart.right - chart.xSplit,
      height: chart.ySplit - chart.top,
      labelX: (chart.xSplit + chart.right) / 2,
      labelY: (chart.top + chart.ySplit) / 2,
    },
    {
      key: 2,
      label: 'Quadrant 2',
      shortLabel: 'Q2',
      description: 'Needs lift',
      color: quadrantColor(2),
      x: chart.left,
      y: chart.ySplit,
      width: chart.xSplit - chart.left,
      height: chart.bottom - chart.ySplit,
      labelX: (chart.left + chart.xSplit) / 2,
      labelY: (chart.ySplit + chart.bottom) / 2,
    },
    {
      key: 4,
      label: 'Quadrant 4',
      shortLabel: 'Q4',
      description: 'Priority risk',
      color: quadrantColor(4),
      x: chart.xSplit,
      y: chart.ySplit,
      width: chart.right - chart.xSplit,
      height: chart.bottom - chart.ySplit,
      labelX: (chart.xSplit + chart.right) / 2,
      labelY: (chart.ySplit + chart.bottom) / 2,
    },
  ]

  return (
    <div className="page quadrant-page">
      <div className="card quadrant-card quadrant-map-card">
        <div className="quadrant-page-head">
          <div>
            <div className="quadrant-eyebrow">Performance Map</div>
            <h3>Order Growth vs Credit Capability</h3>
            <span>Selected period: {referencePeriod}</span>
          </div>
        </div>

        <div className="compact-filter-toolbar quadrant-filter-toolbar">
          <div className="compact-filter-item narrow quadrant-filter-province">
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

          <div className="compact-filter-item narrow quadrant-filter-regency">
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

          <div className="compact-filter-item grow-2 quadrant-filter-search">
            <input value={filter.search} onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))} placeholder="Search job, province, or regency" aria-label="Search quadrant job or area" />
          </div>

          <div className="compact-filter-item narrow quadrant-filter-year">
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

          <div className="compact-filter-item narrow quadrant-filter-month">
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

          <div className="compact-filter-action quadrant-filter-reset">
            <button
              className="btn-ghost quadrant-clear-btn"
              onClick={() => {
                setFilter({ province: '', regency: '', search: '' })
                setSelectedMonth('')
                setSelectedYear('')
              }}
              disabled={!filter.province && !filter.regency && !filter.search.trim() && !selectedMonth && !selectedYear}
              title="Clear all filters"
              aria-label="Clear all filters"
            >
              ×
            </button>
          </div>
        </div>

        {loadError && (
          <div className="quadrant-status-card error">
            <div className="quadrant-status-icon">!</div>
            <div>
              <div className="quadrant-status-title">Unable to load data</div>
              <div className="quadrant-status-copy">{loadError}</div>
            </div>
          </div>
        )}

        <div className="quadrant-chart-panel">
          {isLoading && (
            <div className="quadrant-status-card">
              <div className="quadrant-status-icon">•</div>
              <div>
                <div className="quadrant-status-title">Loading points</div>
                <div className="quadrant-status-copy">Preparing the latest position for each area and job.</div>
              </div>
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="quadrant-status-card">
              <div className="quadrant-status-icon">•</div>
              <div>
                <div className="quadrant-status-title">No points found</div>
                <div className="quadrant-status-copy">Adjust the period, area, or search keyword to explore more results.</div>
              </div>
            </div>
          )}
          <div className="quadrant-chart-head">
            <div className="quadrant-chart-title-group">
              <div className="quadrant-chart-title">Interactive View</div>
              <div className="quadrant-chart-subtitle">Tap or hover a point to see job, area, and metrics.</div>
            </div>
            <div className="quadrant-chart-legend" aria-label="Quadrant legend">
              {quadrantLegend.map((item) => (
                <span key={item.key} className="quadrant-legend-item">
                  <span className="quadrant-legend-swatch" style={{ background: item.color }} />
                  <span>{item.label}</span>
                  <span className="quadrant-legend-name">{item.name}</span>
                </span>
              ))}
            </div>
          </div>
          <svg
            className="quadrant-flow-chart"
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            width="100%"
            role="img"
            aria-label="Quadrant flow chart"
            onClick={() => setActivePointId('')}
          >
            <defs>
              <filter id="quadrant-point-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.18" />
              </filter>
              <filter id="quadrant-tooltip-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.28" />
              </filter>
              <linearGradient id="quadrant-chart-surface" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f8fbff" />
              </linearGradient>
            </defs>

            <rect
              x={chart.left - 10}
              y={chart.top - 10}
              width={chart.right - chart.left + 20}
              height={chart.bottom - chart.top + 20}
              rx={18}
              fill="url(#quadrant-chart-surface)"
            />

            {quadrantRegions.map((region) => (
              <rect
                key={`region-${region.key}`}
                x={region.x}
                y={region.y}
                width={Math.max(0, region.width)}
                height={Math.max(0, region.height)}
                fill={region.color}
                opacity={0.075}
              />
            ))}

            <rect
              x={chart.left}
              y={chart.top}
              width={chart.right - chart.left}
              height={chart.bottom - chart.top}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={1.4}
              rx={12}
            />

            {chart.borderTicks.map((value: number) => (
              <line
                key={`grid-x-${value}`}
                x1={chart.toX(value)}
                y1={chart.top}
                x2={chart.toX(value)}
                y2={chart.bottom}
                stroke="#dbe3ef"
                strokeWidth={1}
                opacity={value === chart.splitXPercent ? 0 : 0.72}
                shapeRendering="crispEdges"
              />
            ))}

            {chart.yTicks.map((value: number) => (
              <line
                key={`grid-y-${value}`}
                x1={chart.left}
                y1={chart.toY(value)}
                x2={chart.right}
                y2={chart.toY(value)}
                stroke="#dbe3ef"
                strokeWidth={1}
                opacity={value === chart.splitYGrowthPercent ? 0 : 0.72}
                shapeRendering="crispEdges"
              />
            ))}

            <line x1={chart.xSplit} y1={chart.top} x2={chart.xSplit} y2={chart.bottom} stroke="#334155" strokeWidth={1.6} strokeDasharray="6 6" shapeRendering="crispEdges" />
            <line x1={chart.left} y1={chart.ySplit} x2={chart.right} y2={chart.ySplit} stroke="#334155" strokeWidth={1.6} strokeDasharray="6 6" shapeRendering="crispEdges" />

            {chart.borderTicks.map((value: number) => (
              <text key={`bottom-${value}`} x={chart.toX(value)} y={chart.bottom + (isMobile ? 12 : 16)} textAnchor="middle" fontSize={isMobile ? 7.5 : 10} fontWeight={700} fill="#111827">
                {value}%
              </text>
            ))}

            {chart.yLabelTicks.map((value: number) => (
              <text key={`left-${value}`} x={chart.left - (isMobile ? 4 : 8)} y={chart.toY(value) + 3} textAnchor="end" fontSize={isMobile ? 7.5 : 10} fontWeight={700} fill="#111827">
                {formatAxisPercent(value)}
              </text>
            ))}

            <g>
              <rect
                x={chart.xSplit - (isMobile ? 30 : 44)}
                y={chart.bottom + (isMobile ? 19 : 24)}
                width={isMobile ? 60 : 88}
                height={isMobile ? 18 : 22}
                rx={999}
                fill="#f8fafc"
                stroke="#cbd5e1"
              />
              <text
                x={chart.xSplit}
                y={chart.bottom + (isMobile ? 31 : 39)}
                textAnchor="middle"
                fontSize={isMobile ? 8 : 10}
                fontWeight={850}
                fill="#334155"
              >
                {isMobile ? `${chart.splitXPercent}%` : `Threshold ${chart.splitXPercent}%`}
              </text>
            </g>

            <text
              x={chart.left - (isMobile ? 38 : 54)}
              y={(chart.top + chart.bottom) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(-90 ${chart.left - (isMobile ? 38 : 54)} ${(chart.top + chart.bottom) / 2})`}
              fontSize={isMobile ? 9 : 11}
              fontWeight={850}
              fill="#334155"
            >
              Y-axis: Order In Growth
            </text>
            <text
              x={(chart.left + chart.right) / 2}
              y={chart.bottom + (isMobile ? 53 : 62)}
              textAnchor="middle"
              fontSize={isMobile ? 9 : 11}
              fontWeight={850}
              fill="#334155"
            >
              X-axis: Credit Capability
            </text>

            {quadrantRegions.map((region) => (
              <g key={`label-${region.key}`} opacity={0.96}>
                <text
                  x={region.labelX}
                  y={region.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isMobile ? 9 : 13}
                  fontWeight={850}
                  fill={region.color}
                  opacity={0.72}
                >
                  {isMobile ? region.shortLabel : `${region.shortLabel} ${region.description}`}
                </text>
              </g>
            ))}

            {chart.points.map((point: any) => (
              <g key={point.id}>
                <title>{`${point.jobName} - ${point.areaLabel || '-'}`}</title>
                {point.id === activePointId && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isMobile ? 13 : 16}
                    fill={quadrantColor(point.quadrant)}
                    opacity={0.16}
                  />
                )}
                {point.isCreditBoundary && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.id === activePointId ? (isMobile ? 10 : 12) : isMobile ? 8 : 9}
                    fill="none"
                    stroke={quadrantColor(point.quadrant)}
                    strokeWidth={1.6}
                    strokeOpacity={0.36}
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  className="quadrant-hit-area"
                  cx={point.x}
                  cy={point.y}
                  r={isMobile ? 15 : 11}
                  fill="transparent"
                  onClick={(event) => {
                    event.stopPropagation()
                    setActivePointId(point.id)
                  }}
                />
                <circle
                  className="quadrant-point"
                  cx={point.x}
                  cy={point.y}
                  r={point.id === activePointId ? (isMobile ? 7 : 8) : isMobile ? 5 : 6}
                  fill={quadrantColor(point.quadrant)}
                  stroke="#ffffff"
                  strokeWidth={point.id === activePointId ? 2.6 : 2}
                  opacity={point.id === activePointId ? 1 : 0.86}
                  filter={point.id === activePointId ? 'url(#quadrant-point-shadow)' : undefined}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${point.jobName} in ${point.areaLabel || 'selected area'}`}
                  onMouseEnter={() => setActivePointId(point.id)}
                  onMouseLeave={() => {
                    if (!isMobile) setActivePointId('')
                  }}
                  onFocus={() => {
                    if (!isMobile) setActivePointId(point.id)
                  }}
                  onBlur={() => {
                    if (!isMobile) setActivePointId('')
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    setActivePointId((current) => {
                      if (isMobile) return point.id
                      return current === point.id ? '' : point.id
                    })
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    event.stopPropagation()
                    setActivePointId((current) => current === point.id ? '' : point.id)
                  }}
                />
              </g>
            ))}

            {activePoint && tooltip && (
              <g pointerEvents="none">
                <rect x={tooltip.x} y={tooltip.y} width={tooltip.width} height={tooltip.height} rx={12} fill="#0f172a" opacity={0.96} filter="url(#quadrant-tooltip-shadow)" />
                <circle cx={tooltip.x + 14} cy={tooltip.y + 18} r={4} fill={quadrantColor(activePoint.quadrant)} />
                <text x={tooltip.x + 24} y={tooltip.y + 22} fontSize={isMobile ? 11 : 12} fill="#fff" fontWeight={800}>
                  {`${activePoint.jobName}`}
                </text>
                <text x={tooltip.x + 10} y={tooltip.y + 40} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                  {`Total Order In: ${Number(activePoint.totalOrders || 0).toLocaleString('id-ID')}`}
                </text>
                <text x={tooltip.x + 10} y={tooltip.y + 56} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                  {`Order In Growth: ${activePoint.orderInGrowthPercent >= 0 ? '+' : ''}${activePoint.orderInGrowthPercent.toFixed(2)}%`}
                </text>
                <text x={tooltip.x + 10} y={tooltip.y + 72} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                  {`Credit Capability: ${Number(activePoint.creditCapability || 0).toFixed(2)}%`}
                </text>
                <text x={tooltip.x + 10} y={tooltip.y + 88} fontSize={isMobile ? 10 : 11} fill="#e2e8f0" fontWeight={600}>
                  {`Area: ${activePoint.areaLabel || '-'}`}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="card quadrant-card">
        <div className="quadrant-page-head">
          <div>
            <div className="quadrant-eyebrow">Point Details</div>
            <h3>Area and Job Positions</h3>
            <span>Sorted by growth and credit capability.</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table quadrant-job-points-table">
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
                  <td colSpan={7}>
                    <div className="quadrant-table-empty">
                      <div className="quadrant-status-title">No table rows</div>
                      <div className="quadrant-status-copy">The current filters do not return any row.</div>
                    </div>
                  </td>
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
