import Pagination from '../../../components/common/Pagination'
import { formatNumber, formatPercent, rateCellStyle } from './creditHelpers'

type CreditMatrixProps = {
  limit: number
  matrixPagination: {
    pageItems: any[]
    safePage: number
    totalPages: number
    totalData: number
  }
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
}

export default function CreditMatrix({
  limit,
  matrixPagination,
  setLimit,
  setPage,
}: CreditMatrixProps) {
  return (
    <>
      <div className="credit-matrix-table">
        <table className="table compact-table metric-table credit-matrix-enhanced-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Job</th>
              <th>Motor Type</th>
              <th>Credit Capability</th>
              <th>Program Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {matrixPagination.pageItems.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="credit-table-empty">
                    <div className="credit-empty-title">No credit matrix rows</div>
                    <div className="credit-empty-note">Adjust the job, area, motor type, or date filter to explore more results.</div>
                  </div>
                </td>
              </tr>
            )}

            {matrixPagination.pageItems.map((row, idx) => {
              const style = row.cell ? rateCellStyle(row.cell.capability_rate) : undefined
              const rate = row.cell ? formatPercent(row.cell.capability_rate) : '-'
              const suggestion = row.cell ? formatNumber(row.cell.program_suggestion) : '-'
              return (
                <tr key={`${row.area_key}-${row.job_id || 'all'}-${row.motor_type_id || 'empty'}-${idx}`}>
                  <td>
                    <div className="credit-matrix-area table-stack-cell">
                      <div className="table-stack-primary" title={row.area_regency || row.area_name || '-'}>
                        {row.area_regency || row.area_name || '-'}
                      </div>
                      {row.area_province && row.area_province !== '-' && (
                        <div className="table-stack-secondary" title={row.area_province}>{row.area_province}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="credit-matrix-job-cell">
                      <div className="table-stack-primary" title={row.job_name || '-'}>
                        {row.job_name || '-'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="credit-matrix-motor-cell">
                      <span className="credit-matrix-motor-text" title={row.motor_type_name || '-'}>
                        {row.motor_type_name || '-'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="credit-matrix-metric-cell">
                      <span className="credit-matrix-rate-badge" style={style}>{rate}</span>
                    </div>
                  </td>
                  <td>
                    <div className="credit-matrix-metric-cell">
                      <span className="table-metric-pill warning credit-matrix-suggestion-pill">{suggestion}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8 }}>
        <Pagination
          page={matrixPagination.safePage}
          totalPages={matrixPagination.totalPages}
          totalData={matrixPagination.totalData}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setLimit(value)
            setPage(1)
          }}
          limitOptions={[5, 10, 20]}
        />
      </div>
    </>
  )
}
