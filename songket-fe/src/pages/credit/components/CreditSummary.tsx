import { formatApprovalRate, formatInstallmentRangeLabel } from './creditHelpers'

type CreditSummaryProps = {
  dpRanges: any[]
  installmentRanges: any[]
  maxDPRangeTotal: number
  maxInstallmentTotal: number
}

export default function CreditSummary({
  dpRanges,
  installmentRanges,
  maxDPRangeTotal,
  maxInstallmentTotal,
}: CreditSummaryProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 12,
          background: '#fff',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Installment Range</div>
        <div style={{ color: '#475569', fontSize: 12, marginBottom: 10 }}>
          Highlighted bars represent product installment ranges.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
          <div>
            {installmentRanges.map((item: any) => {
              const total = Number(item.total || 0)
              const width = Math.max(total > 0 ? 3 : 0, (total / maxInstallmentTotal) * 100)
              const isHighlighted = Boolean(item.is_product_range)
              return (
                <div key={`${item.range_start}-${item.range_end}`} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: '#334155' }}>
                    <span>{formatInstallmentRangeLabel(item)}</span>
                    <span>{total}</span>
                  </div>
                  <div style={{ marginTop: 4, height: 12, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${width}%`,
                        height: '100%',
                        background: isHighlighted ? '#1d4ed8' : '#94a3b8',
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {installmentRanges.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>No installment range data.</div>}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table compact-table">
              <thead>
                <tr>
                  <th>Range</th>
                  <th>Approval Rate</th>
                </tr>
              </thead>
              <tbody>
                {installmentRanges.map((item: any) => (
                  <tr key={`installment-rate-${item.range_start}-${item.range_end}`}>
                    <td>{formatInstallmentRangeLabel(item)}</td>
                    <td>{formatApprovalRate(item.approval_rate)}</td>
                  </tr>
                ))}
                {installmentRanges.length === 0 && (
                  <tr>
                    <td colSpan={2}>No data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 12,
          background: '#fff',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>DP Range</div>
        <div style={{ color: '#475569', fontSize: 12, marginBottom: 10 }}>
          Approval rate by DP percentage range.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
          <div>
            {dpRanges.map((item: any) => {
              const total = Number(item.total || 0)
              const width = Math.max(total > 0 ? 3 : 0, (total / maxDPRangeTotal) * 100)
              return (
                <div key={`dp-range-${item.label}`} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: '#334155' }}>
                    <span>{item.label}</span>
                    <span>{total}</span>
                  </div>
                  <div style={{ marginTop: 4, height: 12, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${width}%`,
                        height: '100%',
                        background: '#0ea5e9',
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {dpRanges.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>No DP range data.</div>}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table compact-table">
              <thead>
                <tr>
                  <th>Range</th>
                  <th>Approval Rate</th>
                </tr>
              </thead>
              <tbody>
                {dpRanges.map((item: any) => (
                  <tr key={`dp-rate-${item.label}`}>
                    <td>{item.label}</td>
                    <td>{formatApprovalRate(item.approval_rate)}</td>
                  </tr>
                ))}
                {dpRanges.length === 0 && (
                  <tr>
                    <td colSpan={2}>No data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
