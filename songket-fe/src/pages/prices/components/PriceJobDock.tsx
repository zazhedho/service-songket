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
    <div
      style={{
        width: '100%',
        background: '#ffffff',
        border: '1px solid #dbe3ef',
        borderRadius: 12,
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Scrape Jobs</div>
        <button className="btn-ghost" onClick={onToggle}>{jobsOpen ? 'Close' : 'Open'}</button>
      </div>

      {jobsOpen && (
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="compact-filter-toolbar" style={{ marginBottom: 4 }}>
            <div className="compact-filter-item grow-2">
              <input value={jobsSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search status or message" aria-label="Search scrape jobs" />
            </div>
            <div className="compact-filter-action">
              <button
                className="btn-ghost"
                onClick={() => onSearchChange('')}
                disabled={!jobsSearch.trim()}
                title="Clear all filters"
                aria-label="Clear all filters"
                style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
              >
                ×
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 260, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {jobs.length === 0 && <div className="muted">No jobs found.</div>}
            {jobs.map((job) => (
              <button
                key={job.id}
                className="btn-ghost"
                style={{ justifyContent: 'space-between', borderRadius: 10, padding: 10 }}
                onClick={() => onSelect(job.id)}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>{job.id.slice(0, 8)}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(job.created_at).toLocaleTimeString('en-GB')}</div>
                </div>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: `${statusColor[job.status] || '#334155'}22`,
                    color: statusColor[job.status] || '#334155',
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {job.status}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ color: '#64748b', fontSize: 12 }}>
              Total {jobsTotalData} • Page {jobsPage} / {safeTotalPages}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ width: 110 }}>
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
