import SearchableSelect from '../../../components/common/SearchableSelect'

type Job = {
  id: string
  status: string
  message: string
  created_at: string
}

type PriceJobDockProps = {
  jobs: Job[]
  jobsLimit: number
  jobsOpen: boolean
  jobsPage: number
  jobsSearch: string
  jobsTotalData: number
  jobsTotalPages: number
  onSearchChange: React.Dispatch<React.SetStateAction<string>>
  onSelect: (id: string) => void
  onToggle: () => void
  setJobsLimit: React.Dispatch<React.SetStateAction<number>>
  setJobsPage: React.Dispatch<React.SetStateAction<number>>
  statusColor: Record<string, string>
}

export default function PriceJobDock({
  jobs,
  jobsLimit,
  jobsOpen,
  jobsPage,
  jobsSearch,
  jobsTotalData,
  jobsTotalPages,
  onSearchChange,
  onSelect,
  onToggle,
  setJobsLimit,
  setJobsPage,
  statusColor,
}: PriceJobDockProps) {
  const safeTotalPages = jobsTotalPages > 0 ? jobsTotalPages : 1
  const jobsLimitOptions = [
    { value: '10', label: '10 / page' },
    { value: '20', label: '20 / page' },
    { value: '50', label: '50 / page' },
  ]

  return (
    <div className="price-job-dock">
      <div className="price-job-dock-head">
        <div>
          <div className="price-job-dock-title">Scrape Jobs</div>
          <div className="price-job-dock-note">{jobsTotalData} jobs tracked</div>
        </div>
        <button className="btn-ghost" onClick={onToggle}>{jobsOpen ? 'Close' : 'Open'}</button>
      </div>

      {jobsOpen && (
        <div className="price-job-dock-body">
          <div className="compact-filter-toolbar price-job-filter-toolbar">
            <div className="compact-filter-item grow-2">
              <input value={jobsSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search status or message" aria-label="Search scrape jobs" />
            </div>
            <div className="compact-filter-action">
              <button
                className="btn-ghost price-clear-btn"
                onClick={() => onSearchChange('')}
                disabled={!jobsSearch.trim()}
                title="Clear all filters"
                aria-label="Clear all filters"
              >
                ×
              </button>
            </div>
          </div>

          <div className="price-job-list">
            {jobs.length === 0 && (
              <div className="table-state-panel">
                <div className="table-state-icon">i</div>
                <div>
                  <div className="table-state-title">No scrape jobs found</div>
                  <div className="table-state-note">Start a scrape job or adjust the search keyword.</div>
                </div>
              </div>
            )}
            {jobs.map((job) => (
              <button
                key={job.id}
                className="price-job-row"
                onClick={() => onSelect(job.id)}
              >
                <div className="price-job-row-main">
                  <div>{job.id.slice(0, 8)}</div>
                  <span>{new Date(job.created_at).toLocaleTimeString('en-GB')}</span>
                </div>
                <span
                  className="price-job-status"
                  style={{
                    '--price-job-status-bg': `${statusColor[job.status] || '#334155'}22`,
                    '--price-job-status-color': statusColor[job.status] || '#334155',
                  } as React.CSSProperties}
                >
                  {job.status}
                </span>
              </button>
            ))}
          </div>

          <div className="price-job-pagination-row">
            <div className="price-job-pagination-meta">
              Total {jobsTotalData} • Page {jobsPage} / {safeTotalPages}
            </div>

            <div className="price-job-pagination-actions">
              <div className="price-job-page-size">
                <SearchableSelect
                  value={String(jobsLimit)}
                  onChange={(value) => {
                    setJobsLimit(Number(value))
                    setJobsPage(1)
                  }}
                  options={jobsLimitOptions}
                  placeholder="Page size"
                  searchPlaceholder="Search page size..."
                />
              </div>

              <button className="btn-ghost" onClick={() => setJobsPage((prev) => prev - 1)} disabled={jobsPage <= 1}>Prev</button>
              <button className="btn-ghost" onClick={() => setJobsPage((prev) => prev + 1)} disabled={jobsPage >= safeTotalPages}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
