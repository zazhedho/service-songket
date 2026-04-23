type Props = {
  page: number
  totalPages: number
  totalData?: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  limitOptions?: number[]
  disabled?: boolean
}

const DEFAULT_LIMIT_OPTIONS = [5, 10, 20, 50, 100]

export default function Pagination({
  page,
  totalPages,
  totalData,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = DEFAULT_LIMIT_OPTIONS,
  disabled,
}: Props) {
  const safePage = page > 0 ? page : 1
  const safeTotalPages = totalPages > 0 ? totalPages : 1

  const go = (next: number) => {
    if (disabled) return
    if (next < 1 || next > safeTotalPages) return
    if (next === safePage) return
    onPageChange(next)
  }

  return (
    <div className="pagination-wrap">
      <div className="pagination-meta">
        <span>Total: {typeof totalData === 'number' ? totalData : '-'}</span>
        <span>Page {safePage} of {safeTotalPages}</span>
      </div>

      <div className="pagination-actions">
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={disabled}
            style={{ width: 90 }}
          >
            {limitOptions.map((item) => (
              <option key={item} value={item}>{item} / page</option>
            ))}
          </select>
        )}

        <button className="btn-ghost" onClick={() => go(1)} disabled={disabled || safePage <= 1}>≪</button>
        <button className="btn-ghost" onClick={() => go(safePage - 1)} disabled={disabled || safePage <= 1}>Prev</button>
        <button className="btn-ghost" onClick={() => go(safePage + 1)} disabled={disabled || safePage >= safeTotalPages}>Next</button>
        <button className="btn-ghost" onClick={() => go(safeTotalPages)} disabled={disabled || safePage >= safeTotalPages}>≫</button>
      </div>
    </div>
  )
}
