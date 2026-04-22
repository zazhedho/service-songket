import SearchableSelect from '../../../components/common/SearchableSelect'

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
  const jobSelectOptions = [{ value: '', label: 'All Jobs' }, ...jobOptions.map((job: any) => ({
    value: String(job.job_id || ''),
    label: String(job.job_name || job.job_id || '-'),
  }))]

  const areaSelectOptions = [{ value: '', label: 'All Areas' }, ...areaOptions.map((area: any) => ({
    value: String(area.area_key || ''),
    label: String(area.area_name || area.area_key || '-'),
  }))]

  const motorSelectOptions = [{ value: '', label: 'All Motor Types' }, ...motorOptions.map((motor: any) => ({
    value: String(motor.motor_type_id || ''),
    label: String(motor.motor_type_name || motor.motor_type_id || '-'),
  }))]

  return (
    <div className="filter-panel">
      <div className="filter-panel-head">
        <div>
          <div className="filter-panel-title">Filter Credit Worksheet</div>
          <div className="filter-panel-subtitle">Pilih kombinasi job, area, motor, dan periode tanpa mengubah hasil perhitungan.</div>
        </div>
      </div>

      <div className="filter-grid">
        <div className="filter-field">
          <label htmlFor="credit-job-select">Job</label>
          <SearchableSelect
            id="credit-job-select"
            value={selectedJobId}
            options={jobSelectOptions}
            onChange={setSelectedJobId}
            placeholder="All Jobs"
            searchPlaceholder="Search job..."
            emptyMessage="Job not found."
          />
        </div>

        <div className="filter-field">
          <label htmlFor="credit-area-select">Area</label>
          <SearchableSelect
            id="credit-area-select"
            value={selectedAreaKey}
            options={areaSelectOptions}
            onChange={setSelectedAreaKey}
            placeholder="All Areas"
            searchPlaceholder="Search area..."
            emptyMessage="Area not found."
          />
        </div>

        <div className="filter-field">
          <label htmlFor="credit-motor-select">Motor Type</label>
          <SearchableSelect
            id="credit-motor-select"
            value={selectedMotorTypeId}
            options={motorSelectOptions}
            onChange={setSelectedMotorTypeId}
            placeholder="All Motor Types"
            searchPlaceholder="Search motor type..."
            emptyMessage="Motor type not found."
          />
        </div>

        <div className="filter-field">
          <label htmlFor="credit-time-from">Time From</label>
          <input id="credit-time-from" type="date" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
        </div>

        <div className="filter-field">
          <label htmlFor="credit-time-to">Time To</label>
          <input id="credit-time-to" type="date" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
        </div>
      </div>
    </div>
  )
}
