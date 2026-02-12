import { useEffect, useMemo, useState } from 'react'
import { fetchCreditWorksheet } from '../api'
import { useAuth } from '../store'

export default function CreditPage() {
  const [worksheet, setWorksheet] = useState<any>({ areas: [], jobs_master: [], motor_types_master: [] })

  const perms = useAuth((s) => s.permissions)
  const canList = perms.includes('list_credit')

  useEffect(() => {
    if (!canList) return
    fetchCreditWorksheet()
      .then((res) => setWorksheet(res.data.data || res.data || { areas: [], jobs_master: [], motor_types_master: [] }))
      .catch(() => setWorksheet({ areas: [], jobs_master: [], motor_types_master: [] }))
  }, [canList])

  const areas = useMemo(() => (Array.isArray(worksheet?.areas) ? worksheet.areas : []), [worksheet?.areas])
  const jobsMaster = useMemo(
    () => (Array.isArray(worksheet?.jobs_master) ? worksheet.jobs_master : []),
    [worksheet?.jobs_master],
  )
  const motorTypesMaster = useMemo(
    () => (Array.isArray(worksheet?.motor_types_master) ? worksheet.motor_types_master : []),
    [worksheet?.motor_types_master],
  )

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0))

  const formatPercent = (value: number) => `${(Number(value || 0) * 100).toFixed(2)}%`

  const capabilityCellStyle = (value: number) => {
    const rate = Number(value || 0)
    if (rate > 0.4) {
      return { background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }
    }
    if (rate > 0.35) {
      return { background: '#fef3c7', color: '#b45309', fontWeight: 700 }
    }
    return { background: '#dcfce7', color: '#166534', fontWeight: 700 }
  }

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Credit Capability</div>
        </div>
      </div>

      <div className="page">
        <div className="card">
          <h3>Credit Capability Worksheet</h3>
          {!canList && <div className="alert">No permission to view data.</div>}

          {canList && (
            <>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12, marginTop: 10 }}>
                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ marginBottom: 8 }}>Pekerjaan</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nama Pekerjaan</th>
                        <th>Net Income</th>
                        <th>Kabupaten</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobsMaster.map((job: any) => (
                        <tr key={`${job.job_id}-${job.regency_code}`}>
                          <td>{job.job_name || '-'}</td>
                          <td>{formatCurrency(job.net_income)}</td>
                          <td>{job.regency_name || job.regency_code || '-'}</td>
                        </tr>
                      ))}
                      {jobsMaster.length === 0 && (
                        <tr>
                          <td colSpan={3}>No job data.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ marginBottom: 8 }}>Tipe Motor</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tipe Motor</th>
                        <th>Angsuran</th>
                        <th>Kabupaten</th>
                      </tr>
                    </thead>
                    <tbody>
                      {motorTypesMaster.map((motor: any) => (
                        <tr key={`${motor.motor_type_id}-${motor.regency_code}`}>
                          <td>{motor.motor_type_name || '-'}</td>
                          <td>{formatCurrency(motor.installment)}</td>
                          <td>{motor.regency_name || motor.regency_code || '-'}</td>
                        </tr>
                      ))}
                      {motorTypesMaster.length === 0 && (
                        <tr>
                          <td colSpan={3}>No motor/installment data.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {areas.map((area: any) => (
                <div key={area.area_key} className="card" style={{ marginTop: 12 }}>
                  <h3 style={{ marginBottom: 8 }}>
                    Area: {area.regency_name || area.regency_code || '-'}
                  </h3>

                  <h3 style={{ marginBottom: 8, marginTop: 8 }}>Credit Capability</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Pekerjaan</th>
                        {Array.isArray(area.motor_types) &&
                          area.motor_types.map((motor: any) => (
                            <th key={`cap-head-${area.area_key}-${motor.motor_type_id}`}>{motor.motor_type_name}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(area.matrix) &&
                        area.matrix.map((row: any) => (
                          <tr key={`cap-row-${area.area_key}-${row.job_id}`}>
                            <td>{row.job_name}</td>
                            {Array.isArray(row.cells) &&
                              row.cells.map((cell: any) => (
                                <td
                                  key={`cap-value-${area.area_key}-${row.job_id}-${cell.motor_type_id}`}
                                  style={capabilityCellStyle(cell.capability_rate)}
                                >
                                  {formatPercent(cell.capability_rate)}
                                </td>
                              ))}
                          </tr>
                        ))}
                      {(!Array.isArray(area.matrix) || area.matrix.length === 0) && (
                        <tr>
                          <td colSpan={Math.max(1, (Array.isArray(area.motor_types) ? area.motor_types.length : 0) + 1)}>
                            No capability data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <h3 style={{ marginBottom: 8, marginTop: 14 }}>Program Suggestion</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Pekerjaan</th>
                        {Array.isArray(area.motor_types) &&
                          area.motor_types.map((motor: any) => (
                            <th key={`sug-head-${area.area_key}-${motor.motor_type_id}`}>{motor.motor_type_name}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(area.matrix) &&
                        area.matrix.map((row: any) => (
                          <tr key={`sug-row-${area.area_key}-${row.job_id}`}>
                            <td>{row.job_name}</td>
                            {Array.isArray(row.cells) &&
                              row.cells.map((cell: any) => (
                                <td key={`sug-value-${area.area_key}-${row.job_id}-${cell.motor_type_id}`}>
                                  {formatCurrency(cell.program_suggestion)}
                                </td>
                              ))}
                          </tr>
                        ))}
                      {(!Array.isArray(area.matrix) || area.matrix.length === 0) && (
                        <tr>
                          <td colSpan={Math.max(1, (Array.isArray(area.motor_types) ? area.motor_types.length : 0) + 1)}>
                            No suggestion data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}

              {areas.length === 0 && (
                <div className="card" style={{ marginTop: 12 }}>
                  <div>No area matrix data yet.</div>
                </div>
              )}

              <div className="card" style={{ marginTop: 12 }}>
                <div style={{ marginTop: 4, fontSize: 13 }}>
                  <div><strong>Warna</strong></div>
                  <div style={{ color: '#b91c1c' }}>Merah &gt; 40%</div>
                  <div style={{ color: '#b45309' }}>Kuning 35% - 40%</div>
                  <div style={{ color: '#166534' }}>Hijau &lt;= 35%</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
