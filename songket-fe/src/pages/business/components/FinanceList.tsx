import { Suspense, lazy } from 'react'
import ActionMenu from '../../../components/common/ActionMenu'
import DeferredMount from '../../../components/common/DeferredMount'
import Pagination from '../../../components/common/Pagination'
import Table from '../../../components/common/Table'
import { formatDealerLocationSummary } from './financeHelpers'
import { summarizeLocation } from './financeReportHelpers'

const FinanceDealerMap = lazy(() => import('./FinanceMap').then((module) => ({ default: module.FinanceDealerMap })))

type FinanceListProps = {
  canCreate: boolean
  canDelete: boolean
  canUpdate: boolean
  center: [number, number]
  dealerBasePath: string
  dealerFinanceLimit: number
  dealerFinancePage: number
  dealerFinanceRows: any[]
  dealerFinanceTotalData: number
  dealerFinanceTotalPages: number
  dealerLocationNameMap: Record<string, any>
  dealerLimit: number
  dealerPage: number
  dealerPoints: any[]
  dealerProvinceFilter: string
  dealerSearch: string
  dealerTotalData: number
  dealerTotalPages: number
  dealers: any[]
  financeBasePath: string
  financeCompanies: any[]
  financeCompanyLocationNameMap: Record<string, any>
  financeLimit: number
  financeMetricMaxTotal: number
  financeMetricRows: any[]
  financePage: number
  financeProvinceFilter: string
  financeSearch: string
  financeTotalData: number
  financeTotalPages: number
  listSection: 'dealer' | 'finance'
  metrics: any
  navigate: (path: string, options?: any) => void
  provinces: any[]
  removeDealer: (id: string) => Promise<void>
  removeFinance: (id: string) => Promise<void>
  selectedDealerId: string
  selectedDealerName: string
  setDealerFinanceLimit: React.Dispatch<React.SetStateAction<number>>
  setDealerFinancePage: React.Dispatch<React.SetStateAction<number>>
  setDealerLimit: React.Dispatch<React.SetStateAction<number>>
  setDealerPage: React.Dispatch<React.SetStateAction<number>>
  setDealerProvinceFilter: React.Dispatch<React.SetStateAction<string>>
  setDealerSearch: React.Dispatch<React.SetStateAction<string>>
  setFinanceLimit: React.Dispatch<React.SetStateAction<number>>
  setFinancePage: React.Dispatch<React.SetStateAction<number>>
  setFinanceProvinceFilter: React.Dispatch<React.SetStateAction<string>>
  setFinanceSearch: React.Dispatch<React.SetStateAction<string>>
  setSelectedDealerId: React.Dispatch<React.SetStateAction<string>>
}

export default function FinanceList({
  canCreate,
  canDelete,
  canUpdate,
  center,
  dealerBasePath,
  dealerFinanceLimit,
  dealerFinancePage,
  dealerFinanceRows,
  dealerFinanceTotalData,
  dealerFinanceTotalPages,
  dealerLocationNameMap,
  dealerLimit,
  dealerPage,
  dealerPoints,
  dealerProvinceFilter,
  dealerSearch,
  dealerTotalData,
  dealerTotalPages,
  dealers,
  financeBasePath,
  financeCompanies,
  financeCompanyLocationNameMap,
  financeLimit,
  financeMetricMaxTotal,
  financeMetricRows,
  financePage,
  financeProvinceFilter,
  financeSearch,
  financeTotalData,
  financeTotalPages,
  listSection,
  metrics,
  navigate,
  provinces,
  removeDealer,
  removeFinance,
  selectedDealerId,
  selectedDealerName,
  setDealerFinanceLimit,
  setDealerFinancePage,
  setDealerLimit,
  setDealerPage,
  setDealerProvinceFilter,
  setDealerSearch,
  setFinanceLimit,
  setFinancePage,
  setFinanceProvinceFilter,
  setFinanceSearch,
  setSelectedDealerId,
}: FinanceListProps) {
  return (
    <div>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{listSection === 'dealer' ? 'Dealer Management' : 'Finance Management'}</div>
          <div style={{ color: '#64748b' }}>
            {listSection === 'dealer'
              ? 'Dealer list, map, and dealer performance.'
              : 'Finance company list and finance performance.'}
          </div>
        </div>
      </div>

      <div className="page" style={{ display: 'grid', gap: 14 }}>
        {listSection === 'dealer' && (
          <>
            <div className="card">
              <div className="filter-panel">
                <div className="filter-panel-head">
                  <div>
                    <div className="filter-panel-title">Filter Dealer</div>
                    <div className="filter-panel-subtitle">Pilih provinsi dan kata kunci untuk mempercepat pencarian dealer.</div>
                  </div>
                </div>
                <div className="filter-grid">
                  <div className="filter-field">
                    <label>Search Dealer</label>
                    <input value={dealerSearch} onChange={(e) => setDealerSearch(e.target.value)} placeholder="Search by name/regency/phone" />
                  </div>

                  <div className="filter-field">
                    <label>Dealer Province Filter</label>
                    <select value={dealerProvinceFilter} onChange={(e) => setDealerProvinceFilter(e.target.value)}>
                      <option value="">All</option>
                      {provinces.map((province: any) => (
                        <option key={province.code} value={province.code}>{province.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3>Dealers</h3>
                {canCreate && <button className="btn" onClick={() => navigate(`${dealerBasePath}/dealers/create`)}>Create Dealer</button>}
              </div>

              <Table
                className="finance-dealer-table"
                data={dealers}
                keyField="id"
                onRowClick={(dealer: any) => navigate(`${dealerBasePath}/dealers/${dealer.id}`, { state: { dealer } })}
                rowStyle={(dealer: any) => dealer.id === selectedDealerId ? { background: '#eef6ff' } : undefined}
                emptyMessage="No dealers available."
                columns={[
                  { header: 'Name', accessor: 'name' },
                  {
                    header: 'Location',
                    accessor: (dealer: any) => {
                      const locationText = formatDealerLocationSummary(dealer, dealerLocationNameMap[String(dealer.id)])
                      return <span title={locationText}>{locationText}</span>
                    },
                    className: 'finance-dealer-location-cell',
                  },
                  { header: 'Phone', accessor: (dealer: any) => dealer.phone || '-' },
                  {
                    header: 'Action',
                    accessor: (dealer: any) => (
                      <ActionMenu
                        items={[
                          {
                            key: 'focus',
                            label: dealer.id === selectedDealerId ? 'Selected' : 'Focus',
                            onClick: () => setSelectedDealerId(dealer.id),
                            disabled: dealer.id === selectedDealerId,
                          },
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`${dealerBasePath}/dealers/${dealer.id}`, { state: { dealer } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`${dealerBasePath}/dealers/${dealer.id}/edit`, { state: { dealer } }),
                            hidden: !canUpdate,
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            onClick: () => void removeDealer(dealer.id),
                            hidden: !canDelete,
                            danger: true,
                          },
                        ]}
                      />
                    ),
                    className: 'action-cell',
                    ignoreRowClick: true,
                  },
                ]}
              />

              <Pagination
                page={dealerPage}
                totalPages={dealerTotalPages}
                totalData={dealerTotalData}
                limit={dealerLimit}
                onPageChange={setDealerPage}
                onLimitChange={(next) => {
                  setDealerLimit(next)
                  setDealerPage(1)
                }}
              />
            </div>

            <div className="card" style={{ minHeight: 430 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Dealer Map</h3>
                <div style={{ color: '#64748b', fontSize: 12 }}>{selectedDealerName} • {dealerPoints.length} points</div>
              </div>

              <div style={{ marginTop: 10 }}>
                <DeferredMount
                  minHeight={360}
                  fallback={<div className="muted" style={{ padding: '24px 0' }}>Preparing dealer map...</div>}
                >
                  <Suspense fallback={<div className="muted" style={{ padding: '24px 0' }}>Loading dealer map...</div>}>
                    <FinanceDealerMap
                      center={center}
                      dealerLocationNameMap={dealerLocationNameMap}
                      dealerPoints={dealerPoints}
                      setSelectedDealerId={setSelectedDealerId}
                    />
                  </Suspense>
                </DeferredMount>
              </div>
            </div>
          </>
        )}

        {listSection === 'finance' && (
          <>
            <div className="card">
              <div className="filter-panel">
                <div className="filter-panel-head">
                  <div>
                    <div className="filter-panel-title">Filter Finance Company</div>
                    <div className="filter-panel-subtitle">Cari finance company berdasar nama dan area operasional.</div>
                  </div>
                </div>
                <div className="filter-grid">
                  <div className="filter-field">
                    <label>Search Finance Company</label>
                    <input value={financeSearch} onChange={(e) => setFinanceSearch(e.target.value)} placeholder="Search by name/regency/phone" />
                  </div>

                  <div className="filter-field">
                    <label>Finance Province Filter</label>
                    <select value={financeProvinceFilter} onChange={(e) => setFinanceProvinceFilter(e.target.value)}>
                      <option value="">All</option>
                      {provinces.map((province: any) => (
                        <option key={province.code} value={province.code}>{province.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3>Finance Company</h3>
                {canCreate && <button className="btn" onClick={() => navigate(`${financeBasePath}/companies/create`)}>Create Finance</button>}
              </div>

              <Table
                data={financeCompanies}
                keyField="id"
                onRowClick={(company: any) => navigate(`${financeBasePath}/companies/${company.id}`, { state: { company } })}
                emptyMessage="No finance company available."
                columns={[
                  { header: 'Name', accessor: 'name' },
                  { header: 'Regency', accessor: (company: any) => summarizeLocation([financeCompanyLocationNameMap[String(company.id)]?.regency]) },
                  { header: 'Phone', accessor: (company: any) => company.phone || '-' },
                  {
                    header: 'Action',
                    accessor: (company: any) => (
                      <ActionMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            onClick: () => navigate(`${financeBasePath}/companies/${company.id}`, { state: { company } }),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => navigate(`${financeBasePath}/companies/${company.id}/edit`, { state: { company } }),
                            hidden: !canUpdate,
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            onClick: () => void removeFinance(company.id),
                            hidden: !canDelete,
                            danger: true,
                          },
                        ]}
                      />
                    ),
                    className: 'action-cell',
                    ignoreRowClick: true,
                  },
                ]}
              />

              <Pagination
                page={financePage}
                totalPages={financeTotalPages}
                totalData={financeTotalData}
                limit={financeLimit}
                onPageChange={setFinancePage}
                onLimitChange={(next) => {
                  setFinanceLimit(next)
                  setFinancePage(1)
                }}
              />
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Finance Performence</h3>
                <div style={{ color: '#64748b', fontSize: 12 }}>{selectedDealerName}</div>
              </div>

              <div style={{ marginTop: 12, maxWidth: 360 }}>
                <label>Select Dealer</label>
                <select value={selectedDealerId} onChange={(e) => setSelectedDealerId(e.target.value)}>
                  <option value="">Select dealer</option>
                  {dealers.map((dealer: any) => (
                    <option key={dealer.id} value={dealer.id}>{dealer.name}</option>
                  ))}
                </select>
              </div>

              {!selectedDealerId && <div style={{ marginTop: 12, color: '#64748b' }}>Select a dealer to view finance company performance.</div>}
              {selectedDealerId && !metrics && <div style={{ marginTop: 12, color: '#64748b' }}>No metrics available for selected dealer.</div>}

              {metrics && (
                <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 12, marginTop: 12 }}>
                  <div>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Finance</th>
                          <th>Total</th>
                          <th>Approved</th>
                          <th>Rejected</th>
                          <th>Approve %</th>
                          <th>Lead Avg</th>
                          <th>Rescue FC2</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dealerFinanceRows.map((fc: any) => {
                          const total = Number(fc?.total_orders || 0)
                          const approved = Number(fc?.approved_count || 0)
                          const rejected = Number(fc?.rejected_count || 0)
                          return (
                            <tr key={fc.finance_company_id}>
                              <td>{fc.finance_company_name}</td>
                              <td>{total}</td>
                              <td>{approved}</td>
                              <td>{rejected}</td>
                              <td>{((fc.approval_rate || 0) * 100).toFixed(1)}%</td>
                              <td>{fc.lead_time_seconds_avg ? fc.lead_time_seconds_avg.toFixed(1) : '-'}</td>
                              <td>{fc.rescue_approved_fc2 || 0}</td>
                            </tr>
                          )
                        })}
                        {dealerFinanceRows.length === 0 && (
                          <tr>
                            <td colSpan={7}>No finance company metric for this dealer.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <Pagination
                      page={dealerFinancePage}
                      totalPages={dealerFinanceTotalPages}
                      totalData={dealerFinanceTotalData}
                      limit={dealerFinanceLimit}
                      onPageChange={setDealerFinancePage}
                      onLimitChange={(next) => {
                        setDealerFinanceLimit(next)
                        setDealerFinancePage(1)
                      }}
                    />
                  </div>

                  <div style={{ border: '1px solid #dde4ee', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Summary Chart</div>
                    {financeMetricRows.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No summary data yet.</div>}
                    {financeMetricRows.map((fc: any) => {
                      const total = Number(fc?.total_orders || 0)
                      const approved = Number(fc?.approved_count || 0)
                      const rejected = Number(fc?.rejected_count || 0)
                      const width = Math.max(8, (total / financeMetricMaxTotal) * 100)
                      return (
                        <div key={`chart-${fc.finance_company_id}`} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>{fc.finance_company_name || '-'}</span>
                            <span>{total}</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 999, background: '#dbe5f2', marginTop: 4 }}>
                            <div
                              style={{
                                width: `${Math.min(100, width)}%`,
                                height: '100%',
                                borderRadius: 999,
                                background: '#2563eb',
                                transition: 'width .25s ease',
                              }}
                            />
                          </div>
                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                            Approve {approved} | Reject {rejected} | {(Number(fc?.approval_rate || 0) * 100).toFixed(1)}%
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
