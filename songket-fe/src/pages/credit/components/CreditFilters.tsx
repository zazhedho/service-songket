type CreditFiltersProps = {
  areaOptions: any[]
  jobOptions: any[]
  motorOptions: any[]
  selectedAreaKey: string
  selectedJobId: string
  selectedMotorTypeId: string
  setSelectedAreaKey: React.Dispatch<React.SetStateAction<string>>
  setSelectedJobId: React.Dispatch<React.SetStateAction<string>>
  setSelectedMotorTypeId: React.Dispatch<React.SetStateAction<string>>
  setTimeFrom: React.Dispatch<React.SetStateAction<string>>
  setTimeTo: React.Dispatch<React.SetStateAction<string>>
  timeFrom: string
  timeTo: string
}

export default function CreditFilters({
  areaOptions,
  jobOptions,
  motorOptions,
  selectedAreaKey,
  selectedJobId,
  selectedMotorTypeId,
  setSelectedAreaKey,
  setSelectedJobId,
  setSelectedMotorTypeId,
  setTimeFrom,
  setTimeTo,
  timeFrom,
  timeTo,
}: CreditFiltersProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 8,
        marginBottom: 10,
      }}
    >
      <div>
        <label htmlFor="credit-job-select">Job</label>
        <select id="credit-job-select" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
          <option value="">All Jobs</option>
          {jobOptions.map((job: any) => (
            <option key={job.job_id} value={job.job_id}>
              {job.job_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="credit-area-select">Area</label>
        <select id="credit-area-select" value={selectedAreaKey} onChange={(e) => setSelectedAreaKey(e.target.value)}>
          <option value="">All Areas</option>
          {areaOptions.map((area: any) => (
            <option key={area.area_key} value={area.area_key}>
              {area.area_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="credit-motor-select">Motor Type</label>
        <select id="credit-motor-select" value={selectedMotorTypeId} onChange={(e) => setSelectedMotorTypeId(e.target.value)}>
          <option value="">All Motor Types</option>
          {motorOptions.map((motor: any) => (
            <option key={motor.motor_type_id} value={motor.motor_type_id}>
              {motor.motor_type_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="credit-time-from">Time From</label>
        <input id="credit-time-from" type="date" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
      </div>

      <div>
        <label htmlFor="credit-time-to">Time To</label>
        <input id="credit-time-to" type="date" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
      </div>
    </div>
  )
}
