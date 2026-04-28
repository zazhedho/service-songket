import SearchableSelect from '../../../components/common/SearchableSelect'

type CreditFiltersProps = {
  areaOptions: any[]
  hasActiveFilters: boolean
  jobOptions: any[]
  motorOptions: any[]
  onReset: () => void
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
  hasActiveFilters,
  jobOptions,
  motorOptions,
  onReset,
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
    <div className="credit-filter-toolbar">
      <div className="credit-filter-item">
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

      <div className="credit-filter-item">
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

      <div className="credit-filter-item">
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

      <div className="credit-filter-item credit-date-range">
        <div className="credit-date-field">
          <span className="credit-date-label">From</span>
          <input
            id="credit-time-from"
            type="date"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
            aria-label="Filter by start date"
            title="Filter by start date"
          />
        </div>

        <div className="credit-date-separator">-</div>

        <div className="credit-date-field">
          <span className="credit-date-label">To</span>
          <input
            id="credit-time-to"
            type="date"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
            aria-label="Filter by end date"
            title="Filter by end date"
          />
        </div>
      </div>

      <div className="credit-filter-item credit-filter-action">
        <button
          className="btn-ghost credit-clear-btn"
          onClick={onReset}
          disabled={!hasActiveFilters}
          title="Clear all filters"
          aria-label="Clear all filters"
        >
          ×
        </button>
      </div>
    </div>
  )
}
