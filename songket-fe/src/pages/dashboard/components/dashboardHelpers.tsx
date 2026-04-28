import { useMemo, useState } from 'react'

type SeriesItem = {
  label: string
  total: number
  percent: number
}

type DonutSlice = {
  label: string
  total: number
  percent: number
  color: string
}

export function formatInteger(value: number) {
  return Number(value || 0).toLocaleString('id-ID')
}

export function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(2)}%`
}

export function formatFixed(value: number) {
  return Number(value || 0).toFixed(2)
}

export function formatGrowthPercent(value: number) {
  const safe = Number(value || 0)
  return `${safe >= 0 ? '+' : ''}${safe.toFixed(2)}%`
}

export function colorBySign(value: number) {
  if (value > 0) return '#166534'
  if (value < 0) return '#b91c1c'
  return '#334155'
}

function formatChartNumber(value: number) {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('id-ID')
  if (Math.abs(value) >= 100) return Math.round(value).toString()
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(1)
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

export function KpiCard({
  label,
  value,
  note,
  tone = 'blue',
  icon,
  valueColor,
}: {
  label: string
  value: string
  note?: string
  tone?: 'blue' | 'cyan' | 'green' | 'emerald' | 'red' | 'slate'
  icon?: string
  valueColor?: string
}) {
  const cardClassName = ['card', 'dashboard-kpi-card', `dashboard-kpi-card-${tone}`].join(' ')
  return (
    <div className={cardClassName}>
      <div className="dashboard-kpi-top">
        <div className="dashboard-kpi-label">{label}</div>
        {icon && <div className="dashboard-kpi-icon">{icon}</div>}
      </div>
      <div className="dashboard-kpi-value" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      {note && <div className="dashboard-kpi-note">{note}</div>}
    </div>
  )
}

export function DashboardEmptyState({
  title,
  note,
  icon = 'i',
  compact = false,
}: {
  title: string
  note: string
  icon?: string
  compact?: boolean
}) {
  return (
    <div className={compact ? 'dashboard-empty-state with-icon compact' : 'dashboard-empty-state with-icon'}>
      <div className="dashboard-empty-icon">{icon}</div>
      <div>
        <div className="dashboard-empty-title">{title}</div>
        <div className="dashboard-empty-note">{note}</div>
      </div>
    </div>
  )
}

export function PriceTrendChart({ labels, values, dates }: { labels: string[]; values: number[]; dates?: string[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!labels.length || !values.length) {
    return <DashboardEmptyState title="No price trend data" note="Select another commodity or period to populate the trend line." compact />
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
  const hoveredLabel = hoveredDate ? hoveredDate : (hoveredIndex != null ? labels[hoveredIndex] : '')
  const tooltipPrice = hoveredPoint ? Number(hoveredPoint.value || 0).toLocaleString('id-ID') : ''
  const tooltipWidth = 150
  const tooltipX = hoveredPoint ? Math.min(Math.max(left + 4, hoveredPoint.x + 8), right - tooltipWidth) : left
  const tooltipY = top + 6

  return (
    <div className="chart-scroll-shell">
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
              onClick={() => setHoveredIndex(idx)}
              onTouchStart={() => setHoveredIndex(idx)}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={idx === hoveredIndex ? 4 : 3}
              fill="#0ea5e9"
              stroke="#ffffff"
              strokeWidth={1.6}
              pointerEvents="none"
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
            <line x1={hoveredPoint.x} y1={top} x2={hoveredPoint.x} y2={bottom} stroke="#38bdf8" strokeWidth={1} strokeDasharray="4 3" />
            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={42} rx={8} fill="#ffffff" stroke="#dbe3ef" />
            <text x={tooltipX + 8} y={tooltipY + 16} fontSize={11} fill="#0f172a" fontWeight={700}>
              {tooltipPrice}
            </text>
            <text x={tooltipX + 8} y={tooltipY + 31} fontSize={10} fill="#64748b">
              {hoveredLabel}
            </text>
          </>
        )}

        <text x={left} y={11} fontSize={11} fill="#0f172a" fontWeight={700}>Daily Price Trend</text>
      </svg>
    </div>
  )
}

export function BarLineChart({
  labels,
  barValues,
  secondaryBarValues,
  lineValues,
  barName,
  secondaryBarName,
  lineName,
  xAxisLabel,
  tooltipDetails,
  tooltipExtraLines,
  barColor,
  barHoverColor,
  secondaryBarColor,
  secondaryBarHoverColor,
  lineColor,
}: {
  labels: string[]
  barValues: number[]
  secondaryBarValues?: number[]
  lineValues?: number[]
  barName: string
  secondaryBarName?: string
  lineName?: string
  xAxisLabel?: string
  tooltipDetails?: string[]
  tooltipExtraLines?: string[][]
  barColor?: string
  barHoverColor?: string
  secondaryBarColor?: string
  secondaryBarHoverColor?: string
  lineColor?: string
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!labels.length || !barValues.length) {
    return <DashboardEmptyState title="Chart is waiting for data" note="Adjust the period or filters to show daily movement." compact />
  }

  const maxLabel = labels.length
  const paddedLabels = labels.slice(0, maxLabel)
  const paddedBarValues = barValues.slice(0, maxLabel)
  const paddedSecondaryBarValues = Array.isArray(secondaryBarValues) ? secondaryBarValues.slice(0, maxLabel) : []
  const paddedLineValues = Array.isArray(lineValues) ? lineValues.slice(0, maxLabel) : []
  const hasSecondaryBars = paddedSecondaryBarValues.length > 0
  const resolvedBarColor = barColor || '#22d3ee'
  const resolvedBarHoverColor = barHoverColor || '#0891b2'
  const resolvedSecondaryBarColor = secondaryBarColor || '#ef4444'
  const resolvedSecondaryBarHoverColor = secondaryBarHoverColor || '#dc2626'
  const resolvedLineColor = lineColor || '#f97316'

  const width = Math.max(520, paddedLabels.length * 54 + 110)
  const height = 250
  const left = 52
  const right = width - 24
  const top = 20
  const bottom = height - 54
  const plotWidth = right - left
  const maxSlotWidth = hasSecondaryBars ? 58 : 54
  const effectivePlotWidth = Math.min(plotWidth, maxSlotWidth * paddedLabels.length)
  const plotStartX = left
  const plotHeight = bottom - top
  const slotWidth = effectivePlotWidth / paddedLabels.length
  const barWidth = hasSecondaryBars ? Math.min(22, Math.max(7, (slotWidth - 4) / 2)) : Math.min(34, Math.max(12, slotWidth * 0.72))
  const groupGap = hasSecondaryBars ? 2 : 0
  const groupWidth = hasSecondaryBars ? barWidth * 2 + groupGap : barWidth
  const maxValue = Math.max(1, ...paddedBarValues, ...paddedSecondaryBarValues, ...paddedLineValues)
  const showStep = paddedLabels.length <= 10 ? 1 : Math.ceil(paddedLabels.length / 8)
  const yTicks = Array.from({ length: 6 }, (_, idx) => (maxValue / 5) * idx)

  const linePoints = paddedLineValues.map((value, idx) => {
    const centerX = plotStartX + slotWidth * idx + slotWidth / 2
    const y = bottom - (value / maxValue) * plotHeight
    return { x: centerX, y }
  })
  const linePath = linePoints.map((point, idx) => `${idx === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const hoverIdx = hoveredIndex != null && hoveredIndex >= 0 && hoveredIndex < paddedLabels.length ? hoveredIndex : null
  const hoverCenterX = hoverIdx != null ? plotStartX + slotWidth * hoverIdx + slotWidth / 2 : null
  const tooltipExtra = hoverIdx != null ? tooltipExtraLines?.[hoverIdx] || [] : []
  const tooltipWidth = tooltipExtra.length > 0 ? 280 : 188
  const tooltipBarValue = hoverIdx != null ? paddedBarValues[hoverIdx] : 0
  const tooltipSecondaryBarValue = hoverIdx != null && hasSecondaryBars ? paddedSecondaryBarValues[hoverIdx] : null
  const tooltipLineValue = hoverIdx != null && paddedLineValues.length > 0 ? paddedLineValues[hoverIdx] : null
  const coreRows = 1 + (secondaryBarName && tooltipSecondaryBarValue != null ? 1 : 0) + (lineName && tooltipLineValue != null ? 1 : 0)
  const totalRows = coreRows + tooltipExtra.length
  const tooltipHeight = 28 + totalRows * 14
  const tooltipX = hoverCenterX != null ? Math.min(Math.max(left + 6, hoverCenterX + 10), right - tooltipWidth) : left + 6
  const tooltipY = top + 8
  const tooltipTitle = hoverIdx != null ? (tooltipDetails?.[hoverIdx] || paddedLabels[hoverIdx]) : ''
  const secondaryLegendX = left + 90
  const lineLegendX = left + (hasSecondaryBars ? 208 : 70)

  return (
    <div className="chart-scroll-shell">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ minWidth: width, display: 'block' }}>
        {yTicks.map((tick, idx) => {
          const y = bottom - (tick / maxValue) * plotHeight
          return (
            <g key={`y-tick-${idx}`}>
              <line x1={left} y1={y} x2={right} y2={y} stroke={idx === 0 ? '#94a3b8' : '#e2e8f0'} strokeWidth={idx === 0 ? 1 : 0.9} />
              <text x={left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#475569">
                {formatChartNumber(tick)}
              </text>
            </g>
          )
        })}

        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#94a3b8" strokeWidth={1} />
        <line x1={left} y1={top} x2={left} y2={bottom} stroke="#94a3b8" strokeWidth={1} />

        {paddedBarValues.map((value, idx) => {
          const groupStartX = plotStartX + slotWidth * idx + (slotWidth - groupWidth) / 2
          const primaryX = groupStartX
          const secondaryX = groupStartX + barWidth + groupGap
          const h = (value / maxValue) * plotHeight
          const y = bottom - h
          const secondaryValue = hasSecondaryBars ? paddedSecondaryBarValues[idx] || 0 : 0
          const secondaryH = (secondaryValue / maxValue) * plotHeight
          const secondaryY = bottom - secondaryH
          const slotX = plotStartX + slotWidth * idx
          return (
            <g key={`${paddedLabels[idx]}-${idx}`}>
              <rect
                x={slotX}
                y={top}
                width={slotWidth}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex((current) => (current === idx ? null : current))}
                onClick={() => setHoveredIndex(idx)}
                onTouchStart={() => setHoveredIndex(idx)}
              />
              <rect
                x={primaryX}
                y={y}
                width={barWidth}
                height={Math.max(1, h)}
                rx={4}
                fill={idx === hoverIdx ? resolvedBarHoverColor : resolvedBarColor}
              />
              {hasSecondaryBars && (
                <rect
                  x={secondaryX}
                  y={secondaryY}
                  width={barWidth}
                  height={Math.max(1, secondaryH)}
                  rx={4}
                  fill={idx === hoverIdx ? resolvedSecondaryBarHoverColor : resolvedSecondaryBarColor}
                />
              )}
              {idx % showStep === 0 || idx === paddedLabels.length - 1 ? (
                <text
                  x={slotX + slotWidth / 2}
                  y={bottom + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#334155"
                  transform={`rotate(-28 ${slotX + slotWidth / 2} ${bottom + 14})`}
                >
                  {paddedLabels[idx]}
                </text>
              ) : null}
            </g>
          )
        })}

        {paddedLineValues.length > 0 && linePath && (
          <g>
            <path d={linePath} fill="none" stroke={resolvedLineColor} strokeWidth={2} />
            {linePoints.map((point, idx) => (
              <circle key={`line-${idx}`} cx={point.x} cy={point.y} r={idx === hoverIdx ? 4 : 3} fill={resolvedLineColor} />
            ))}
          </g>
        )}

        {hoverIdx != null && hoverCenterX != null && (
          <>
            <line x1={hoverCenterX} y1={top} x2={hoverCenterX} y2={bottom} stroke="#38bdf8" strokeWidth={1} strokeDasharray="4 3" />
            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx={8} fill="#ffffff" stroke="#dbe3ef" />
            <text x={tooltipX + 8} y={tooltipY + 15} fontSize={10.5} fill="#475569">
              {tooltipTitle}
            </text>
            <text x={tooltipX + 8} y={tooltipY + 29} fontSize={11} fill="#0f172a" fontWeight={700}>
              {barName}: {formatChartNumber(tooltipBarValue)}
            </text>
            {(() => {
              let nextY = tooltipY + 43
              const nodes: JSX.Element[] = []
              if (secondaryBarName && tooltipSecondaryBarValue != null) {
                nodes.push(<text key="tooltip-secondary-bar" x={tooltipX + 8} y={nextY} fontSize={10.5} fill={resolvedSecondaryBarColor} fontWeight={700}>{secondaryBarName}: {formatChartNumber(tooltipSecondaryBarValue)}</text>)
                nextY += 14
              }
              if (lineName && tooltipLineValue != null) {
                nodes.push(<text key="tooltip-line" x={tooltipX + 8} y={nextY} fontSize={10.5} fill={resolvedLineColor} fontWeight={700}>{lineName}: {formatChartNumber(tooltipLineValue)}</text>)
                nextY += 14
              }
              tooltipExtra.forEach((line, idx) => {
                nodes.push(<text key={`tooltip-extra-${idx}`} x={tooltipX + 8} y={nextY} fontSize={10} fill="#475569">{line}</text>)
                nextY += 14
              })
              return nodes
            })()}
          </>
        )}

        <text x={left} y={12} fontSize={11} fill="#0f172a" fontWeight={700}>{barName}</text>
        {secondaryBarName && hasSecondaryBars && <text x={secondaryLegendX} y={12} fontSize={11} fill={resolvedSecondaryBarColor} fontWeight={700}>{secondaryBarName}</text>}
        {lineName && paddedLineValues.length > 0 && <text x={lineLegendX} y={12} fontSize={11} fill={resolvedLineColor} fontWeight={700}>{lineName}</text>}
        {xAxisLabel && (
          <text x={(left + right) / 2} y={height - 8} textAnchor="middle" fontSize={10.5} fill="#475569" fontWeight={600}>
            {xAxisLabel}
          </text>
        )}
      </svg>
    </div>
  )
}

export function DonutCard({ title, subtitle, items }: { title: string; subtitle: string; items: SeriesItem[] }) {
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null)
  const [selectedSliceIdx, setSelectedSliceIdx] = useState<number | null>(null)
  const slices = useMemo(() => buildDonutSlices(items), [items])
  const total = useMemo(() => slices.reduce((sum, item) => sum + item.total, 0), [slices])
  const ringSize = 120
  const ringStroke = 24
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringSlices = useMemo(() => {
    let consumed = 0
    return slices.map((slice) => {
      const length = (slice.percent / 100) * ringCircumference
      const segment = { ...slice, length, offset: consumed }
      consumed += length
      return segment
    })
  }, [ringCircumference, slices])
  const activeSliceIdx = hoveredSliceIdx ?? selectedSliceIdx
  const activeSlice = activeSliceIdx != null ? slices[activeSliceIdx] : null
  const hasSingleSlice = slices.length === 1
  const layoutClassName = slices.length > 0
    ? 'dashboard-donut-card-layout'
    : 'dashboard-donut-card-layout dashboard-donut-card-layout-empty'

  return (
    <div className="card dashboard-donut-card">
      <div className="dashboard-donut-card-head">
        <h3>{title}</h3>
        <div className="dashboard-card-note">{subtitle}</div>
      </div>
      <div className={layoutClassName}>
        {slices.length > 0 && (
          <div className="dashboard-donut-visual">
            <div className={`dashboard-donut-ring${hasSingleSlice ? ' single' : ''}`}>
              <svg viewBox={`0 0 ${ringSize} ${ringSize}`} width={ringSize} height={ringSize} className="dashboard-donut-svg">
                <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="#e2e8f0" strokeWidth={ringStroke} />
                {ringSlices.map((slice, idx) => (
                  <circle
                    key={`donut-slice-${slice.label}-${idx}`}
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={ringStroke}
                    strokeDasharray={`${slice.length} ${ringCircumference}`}
                    strokeDashoffset={-slice.offset}
                    transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                    className={activeSliceIdx == null || activeSliceIdx === idx ? 'dashboard-donut-slice active' : 'dashboard-donut-slice'}
                    onMouseEnter={() => setHoveredSliceIdx(idx)}
                    onMouseLeave={() => setHoveredSliceIdx((current) => (current === idx ? null : current))}
                    onClick={() => setSelectedSliceIdx((current) => (current === idx ? null : idx))}
                    onTouchStart={() => setSelectedSliceIdx(idx)}
                  >
                    <title>{`${slice.label}: ${formatInteger(slice.total)} (${slice.percent.toFixed(1)}%)`}</title>
                  </circle>
                ))}
              </svg>
              <div className="dashboard-donut-center">
                <div className="dashboard-donut-center-content">
                  <div className="dashboard-donut-center-label">{activeSlice ? 'Selected' : 'Total'}</div>
                  <div className="dashboard-donut-center-value">{activeSlice ? `${activeSlice.percent.toFixed(1)}%` : formatInteger(total)}</div>
                  <div className="dashboard-donut-center-note">{activeSlice ? formatInteger(activeSlice.total) : 'orders'}</div>
                </div>
              </div>
            </div>
            {activeSlice && (
              <div className="dashboard-donut-active-label" title={activeSlice.label}>
                {activeSlice.label}
              </div>
            )}
          </div>
        )}
        <div className="dashboard-donut-legend">
          {slices.map((slice, idx) => (
            <div
              key={slice.label}
              className={activeSliceIdx === idx ? 'dashboard-donut-legend-row active' : 'dashboard-donut-legend-row'}
              onMouseEnter={() => setHoveredSliceIdx(idx)}
              onMouseLeave={() => setHoveredSliceIdx((current) => (current === idx ? null : current))}
              onClick={() => setSelectedSliceIdx((current) => (current === idx ? null : idx))}
            >
              <span className="dashboard-donut-legend-dot" style={{ background: slice.color }} />
              <div className="dashboard-donut-legend-name" title={slice.label}>{slice.label}</div>
              <div className="dashboard-donut-legend-percent">{slice.percent.toFixed(1)}%</div>
              <div className="dashboard-donut-legend-total">{formatInteger(slice.total)}</div>
            </div>
          ))}
          {slices.length === 0 && <DashboardEmptyState title="No breakdown data" note="Segment details will appear when the selected period has data." compact />}
        </div>
      </div>
    </div>
  )
}
