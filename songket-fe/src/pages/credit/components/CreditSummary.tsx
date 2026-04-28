import { formatApprovalRate, formatInstallmentRangeLabel } from './creditHelpers'

type CreditSummaryProps = {
  dpRanges: any[]
  installmentRanges: any[]
  maxDPRangeTotal: number
  maxInstallmentTotal: number
}

function CreditEmptyState({ title, note }: { title: string; note: string }) {
  return (
    <div className="credit-empty-state">
      <div className="credit-empty-icon">i</div>
      <div>
        <div className="credit-empty-title">{title}</div>
        <div className="credit-empty-note">{note}</div>
      </div>
    </div>
  )
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function CreditRangeRow({
  label,
  total,
  maxTotal,
  approvalRate,
  accentColor,
  tag,
  highlighted = false,
}: {
  label: string
  total: number
  maxTotal: number
  approvalRate: number
  accentColor: string
  tag?: string
  highlighted?: boolean
}) {
  const distributionWidth = maxTotal > 0
    ? Math.max(total > 0 ? 4 : 0, (total / maxTotal) * 100)
    : 0
  const approvalWidth = clampPercent(approvalRate)

  return (
    <div className={`credit-range-row${highlighted ? ' highlighted' : ''}`}>
      <div className="credit-range-row-head">
        <div className="credit-range-copy">
          <div className="credit-range-label" title={label}>{label}</div>
          {tag && <div className="credit-range-tag">{tag}</div>}
        </div>
        <span className="table-metric-pill total">{total}</span>
      </div>

      <div className="credit-range-bars">
        <div className="credit-range-bar-group">
          <div className="credit-range-bar-head">
            <span>Distribution</span>
            <strong>{total} records</strong>
          </div>
          <div className="credit-range-track" aria-hidden="true">
            <div className="credit-range-fill" style={{ width: `${distributionWidth}%`, background: accentColor }} />
          </div>
        </div>

        <div className="credit-range-bar-group">
          <div className="credit-range-bar-head">
            <span>Approval Rate</span>
            <strong>{formatApprovalRate(approvalRate)}</strong>
          </div>
          <div className="table-rate-track" aria-hidden="true">
            <div className="table-rate-fill" style={{ width: `${approvalWidth}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreditSummary({
  dpRanges,
  installmentRanges,
  maxDPRangeTotal,
  maxInstallmentTotal,
}: CreditSummaryProps) {
  return (
    <div className="credit-summary-grid">
      <div className="credit-summary-panel">
        <div className="credit-summary-panel-head">
          <h3>Installment Range</h3>
          <span>Product ranges are highlighted.</span>
        </div>
        <div className="credit-range-list">
          {installmentRanges.map((item: any) => {
            const total = Number(item.total || 0)
            const isHighlighted = Boolean(item.is_product_range)
            return (
              <CreditRangeRow
                key={`${item.range_start}-${item.range_end}`}
                label={formatInstallmentRangeLabel(item)}
                total={total}
                maxTotal={maxInstallmentTotal}
                approvalRate={Number(item.approval_rate || 0)}
                accentColor={isHighlighted ? '#1d4ed8' : '#94a3b8'}
                tag={isHighlighted ? 'Product range' : 'Outside product range'}
                highlighted={isHighlighted}
              />
            )
          })}
          {installmentRanges.length === 0 && (
            <CreditEmptyState title="No installment range data" note="Installment distribution will appear when matching order data is available." />
          )}
        </div>
      </div>

      <div className="credit-summary-panel">
        <div className="credit-summary-panel-head">
          <h3>DP Range</h3>
          <span>Approval rate by DP percentage range.</span>
        </div>
        <div className="credit-range-list">
          {dpRanges.map((item: any) => {
            const total = Number(item.total || 0)
            return (
              <CreditRangeRow
                key={`dp-range-${item.label}`}
                label={item.label || '-'}
                total={total}
                maxTotal={maxDPRangeTotal}
                approvalRate={Number(item.approval_rate || 0)}
                accentColor="#0ea5e9"
              />
            )
          })}
          {dpRanges.length === 0 && (
            <CreditEmptyState title="No DP range data" note="DP distribution will appear when matching finance data is available." />
          )}
        </div>
      </div>
    </div>
  )
}
