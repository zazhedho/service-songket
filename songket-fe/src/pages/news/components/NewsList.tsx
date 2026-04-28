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
  const sourceCount = new Set(
    items
      .map((item) => String(item.source_name || item.source?.name || toDetailRow(item).sumber || '').trim())
      .filter(Boolean),
  ).size
  const selectedCategoryLabel = categoryOptions.find((option) => option.value === category)?.label || 'All Categories'
  const formatDate = (value: unknown) => value ? dayjs(String(value)).format('DD MMM YYYY HH:mm') : '-'
  const sourceHost = (value: string) => {
    const text = String(value || '').trim()
    if (!text) return '-'
    try {
      return new URL(text).hostname.replace(/^www\./, '') || text
    } catch {
      return text
    }
  }

  return (
    <div className="news-shell">
      <div className="header news-header">
        <div className="news-heading">
          <div className="news-eyebrow">News Library</div>
          <div className="news-title">News Portal</div>
          <div className="news-subtitle">Review saved articles, source coverage, and category scope from one compact workspace.</div>
        </div>
      </div>

      {!canView && <div className="page"><div className="alert">No permission to view news.</div></div>}

      {canView && (
        <div className="page news-page">
          <div className="card news-card">
            <div className="entity-list-summary">
              <div className="entity-summary-card news-summary-card tone-blue">
                <div className="entity-summary-label">Total Articles</div>
                <div className="entity-summary-value">{totalData || items.length}</div>
                <div className="entity-summary-note">Saved entries in the current result.</div>
              </div>
              <div className="entity-summary-card news-summary-card tone-emerald">
                <div className="entity-summary-label">Sources</div>
                <div className="entity-summary-value">{sourceCount}</div>
                <div className="entity-summary-note">Distinct publishers in this list.</div>
              </div>
              <div className="entity-summary-card news-summary-card tone-amber">
                <div className="entity-summary-label">Category Scope</div>
                <div className="entity-summary-value news-summary-text">{selectedCategoryLabel}</div>
                <div className="entity-summary-note">Active category filter.</div>
              </div>
            </div>

            <div className="compact-filter-toolbar news-filter-toolbar">
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
                  className="btn-ghost news-clear-btn"
                  onClick={() => setCategory('')}
                  disabled={!category}
                  title="Clear all filters"
                  aria-label="Clear all filters"
                >
                  ×
                </button>
                {canScrape && <button className="btn" onClick={() => navigate('/news/scrape')}>Scrape News</button>}
              </div>
            </div>
            <div className="news-section-head">
              <div>
                <h3>News List</h3>
                <span>Click a row to open the article detail.</span>
              </div>
            </div>
            <Table
              className="news-list-table metric-table"
              data={items}
              keyField={(item) => String(item.id || item.url)}
              onRowClick={(item) => navigate(`/news/${item.id}`, { state: { detail: toDetailRow(item) } })}
              emptyMessage="No saved news yet."
              columns={[
                {
                  header: 'Article',
                  accessor: (item) => (
                    <div className="table-stack-cell">
                      <div className="table-stack-primary" title={item.title || '-'}>
                        {item.title || '-'}
                      </div>
                      <div className="table-stack-secondary">
                        {categoryOptions.find((option) => option.value === item.category)?.label || item.category || 'Uncategorized'}
                      </div>
                    </div>
                  ),
                  className: 'news-list-col-article',
                  headerClassName: 'news-list-col-article',
                },
                {
                  header: 'Preview',
                  accessor: (item) => (
                    <div className="table-stack-cell">
                      <div className="table-preview-text" title={item.content || '-'}>
                        {shortText(item.content || '', 180) || '-'}
                      </div>
                    </div>
                  ),
                  className: 'news-list-col-preview',
                  headerClassName: 'news-list-col-preview',
                },
                {
                  header: 'Published',
                  accessor: (item) => (
                    <div className="table-stack-cell">
                      <div className="table-stack-primary">{formatDate(item.published_at || item.created_at)}</div>
                    </div>
                  ),
                  className: 'news-list-col-created',
                  headerClassName: 'news-list-col-created',
                },
                {
                  header: 'Source',
                  accessor: (item) => {
                    const detailRow = toDetailRow(item)
                    const sourceLabel = item.source_name || item.source?.name || detailRow.sumber || '-'
                    const url = String(item.url || '').trim()
                    return (
                      <div className="table-stack-cell">
                        <div className="table-stack-primary" title={sourceLabel}>{sourceLabel}</div>
                        {url ? (
                          <a className="table-url-link table-stack-tertiary" href={url} target="_blank" rel="noreferrer" title={url}>
                            {sourceHost(url)}
                          </a>
                        ) : (
                          <div className="table-stack-tertiary">URL not available</div>
                        )}
                      </div>
                    )
                  },
                  className: 'news-list-col-source',
                  headerClassName: 'news-list-col-source',
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
                  headerClassName: 'news-list-col-action',
                  ignoreRowClick: true,
                },
              ]}
              emptyState={
                <tr>
                  <td colSpan={5}>
                    <div className="entity-empty-state">
                      <div className="entity-empty-icon">
                        <i className="bi bi-newspaper"></i>
                      </div>
                      <div className="entity-empty-title">No news found</div>
                      <div className="entity-empty-note">Try another category or scrape new articles to populate this list.</div>
                    </div>
                  </td>
                </tr>
              }
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
