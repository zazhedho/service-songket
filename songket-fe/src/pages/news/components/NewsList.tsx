import dayjs from 'dayjs'
import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
import SearchableSelect from '../../../components/common/SearchableSelect'
import Table from '../../../components/common/Table'
import { shortText, toDetailRow } from './newsHelpers'

type NewsListProps = {
  canDelete: boolean
  canScrape: boolean
  canView: boolean
  category: string
  deleting: Record<string, boolean>
  items: any[]
  limit: number
  navigate: (path: string, options?: any) => void
  page: number
  setCategory: React.Dispatch<React.SetStateAction<string>>
  setConfirmDeleteId: (id: string) => void | Promise<void>
  setLimit: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  totalData: number
  totalPages: number
}

export default function NewsList({
  canDelete,
  canScrape,
  canView,
  category,
  deleting,
  items,
  limit,
  navigate,
  page,
  setCategory,
  setConfirmDeleteId,
  setLimit,
  setPage,
  totalData,
  totalPages,
}: NewsListProps) {
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'agri', label: 'Agriculture' },
    { value: 'pariwisata', label: 'Tourism' },
    { value: 'pns', label: 'PNS/Gov' },
  ]

  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>News Portal</div>
          <div style={{ color: '#64748b' }}>This page shows news entries stored in the database</div>
        </div>
      </div>

      {!canView && <div className="page"><div className="alert">No permission to view news.</div></div>}

      {canView && (
        <div className="page">
          <div className="card">
            <div className="compact-filter-toolbar">
              <div className="compact-filter-item narrow">
                <SearchableSelect
                  value={category}
                  onChange={setCategory}
                  options={categoryOptions}
                  placeholder="All Categories"
                  searchPlaceholder="Search category..."
                />
              </div>
              <div className="compact-filter-action">
                <button
                  className="btn-ghost"
                  onClick={() => setCategory('')}
                  disabled={!category}
                  title="Clear all filters"
                  aria-label="Clear all filters"
                  style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
                >
                  ×
                </button>
                {canScrape && <button className="btn" onClick={() => navigate('/news/scrape')}>Scrape News</button>}
              </div>
            </div>
            <h3>News List</h3>
            <Table
              data={items}
              keyField={(item) => String(item.id || item.url)}
              onRowClick={(item) => navigate(`/news/${item.id}`, { state: { detail: toDetailRow(item) } })}
              emptyMessage="No saved news yet."
              columns={[
                { header: 'Title', accessor: (item) => item.title || '-', style: { maxWidth: 320 } },
                { header: 'Content', accessor: (item) => shortText(item.content || '', 180), style: { maxWidth: 360, wordBreak: 'break-word' } },
                {
                  header: 'Created At',
                  accessor: (item) => (item.published_at || item.created_at)
                    ? dayjs(item.published_at || item.created_at).format('DD MMM YYYY HH:mm')
                    : '-',
                },
                {
                  header: 'Source',
                  accessor: (item) => {
                    const detailRow = toDetailRow(item)
                    return item.source_name || item.source?.name || detailRow.sumber || '-'
                  },
                },
                {
                  header: 'Link',
                  accessor: (item) => (
                    <a className="btn-ghost" href={item.url} target="_blank" rel="noreferrer">Open Link</a>
                  ),
                  ignoreRowClick: true,
                },
                {
                  header: 'Action',
                  accessor: (item) => {
                    const detailRow = toDetailRow(item)
                    return (
                      <ActionMenu
                        items={[
                          {
                            key: 'view-detail',
                            label: 'View Detail',
                            onClick: () => navigate(`/news/${item.id}`, { state: { detail: detailRow } }),
                          },
                          {
                            key: 'delete',
                            label: !!deleting[String(item.id)] ? 'Deleting...' : 'Delete',
                            onClick: () => {
                              const id = String(item.id || '')
                              if (!id) return
                              setConfirmDeleteId(id)
                            },
                            hidden: !canDelete,
                            disabled: !item.id || !!deleting[String(item.id)],
                            danger: true,
                          },
                        ]}
                      />
                    )
                  },
                  className: 'action-cell',
                  ignoreRowClick: true,
                },
              ]}
            />

            <Pagination
              page={page}
              totalPages={totalPages}
              totalData={totalData}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next)
                setPage(1)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
