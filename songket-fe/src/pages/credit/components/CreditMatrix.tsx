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
      <div style={{ overflowX: 'auto' }}>
        <table className="table compact-table">
          <thead>
            <tr>
              <th rowSpan={2}>Area</th>
              <th rowSpan={2}>Pekerjaan</th>
              <th colSpan={2}>Credit Capability</th>
              <th colSpan={2}>Program Suggestion</th>
            </tr>
            <tr>
              <th>Tipe Motor</th>
              <th>Rate</th>
              <th>Tipe Motor</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {matrixPagination.pageItems.length === 0 && (
              <tr>
                <td colSpan={6}>No data for current filter.</td>
              </tr>
            )}

            {matrixPagination.pageItems.map((row, idx) => {
              const style = row.cell ? rateCellStyle(row.cell.capability_rate) : undefined
              return (
                <tr key={`${row.area_key}-${row.job_id || 'all'}-${row.motor_type_id || 'empty'}-${idx}`}>
                  <td>{row.area_name}</td>
                  <td>{row.job_name || '-'}</td>
                  <td>{row.motor_type_name}</td>
                  <td style={style}>{row.cell ? formatPercent(row.cell.capability_rate) : '-'}</td>
                  <td>{row.motor_type_name}</td>
                  <td style={style}>{row.cell ? formatNumber(row.cell.program_suggestion) : '-'}</td>
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
