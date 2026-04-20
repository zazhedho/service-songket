import dayjs from 'dayjs'
import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'
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
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>News Portal</div>
          <div style={{ color: '#64748b' }}>This page shows news entries stored in the database</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">All</option>
            <option value="agri">Agriculture</option>
            <option value="pariwisata">Tourism</option>
            <option value="pns">PNS/Gov</option>
          </select>
          {canScrape && <button className="btn" onClick={() => navigate('/news/scrape')}>Scrape News</button>}
        </div>
      </div>

      {!canView && <div className="page"><div className="alert">No permission to view news.</div></div>}

      {canView && (
        <div className="page">
          <div className="card">
            <h3>News List</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Content</th>
                  <th>Created At</th>
                  <th>Source</th>
                  <th>Link</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const detailRow = toDetailRow(item)
                  return (
                    <tr key={item.id || item.url}>
                      <td style={{ maxWidth: 320 }}>{item.title || '-'}</td>
                      <td style={{ maxWidth: 360, wordBreak: 'break-word' }}>{shortText(item.content || '', 180)}</td>
                      <td>
                        {(item.published_at || item.created_at)
                          ? dayjs(item.published_at || item.created_at).format('DD MMM YYYY HH:mm')
                          : '-'}
                      </td>
                      <td>{item.source_name || item.source?.name || detailRow.sumber || '-'}</td>
                      <td>
                        <a className="btn-ghost" href={item.url} target="_blank" rel="noreferrer">Open Link</a>
                      </td>
                      <td className="action-cell">
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
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6}>No saved news yet.</td>
                  </tr>
                )}
              </tbody>
            </table>

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
