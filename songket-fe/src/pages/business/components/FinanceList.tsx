import { Suspense, lazy } from 'react'
import ActionMenu from '../../../components/common/ActionMenu'
import DeferredMount from '../../../components/common/DeferredMount'
import Pagination from '../../../components/common/Pagination'
import SearchableSelect from '../../../components/common/SearchableSelect'
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
  isBusinessTabMode: boolean
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
  isBusinessTabMode,
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
  const hasCoordinate = (item: any) => {
    const lat = Number(item?.lat ?? item?.latitude)
    const lng = Number(item?.lng ?? item?.longitude)
    return Number.isFinite(lat) && Number.isFinite(lng)
  }

  const provinceOptions = [{ value: '', label: 'All Provinces' }, ...provinces.map((province: any) => ({
    value: String(province.code || ''),
    label: String(province.name || province.code || '-'),
  }))]

  const dealerOptions = [{ value: '', label: 'Select dealer' }, ...dealers.map((dealer: any) => ({
    value: String(dealer.id || ''),
    label: String(dealer.name || dealer.id || '-'),
  }))]

  const selectedProvinceLabel = provinceOptions.find((option) => option.value === dealerProvinceFilter)?.label || 'All Provinces'
  const selectedFinanceProvinceLabel = provinceOptions.find((option) => option.value === financeProvinceFilter)?.label || 'All Provinces'
  const visibleMappedDealers = dealers.filter((dealer) => hasCoordinate(dealer)).length
  const toSafeNumber = (value: unknown) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const renderPerformanceName = (name: unknown, total: number) => {
    const label = String(name || '-')

    return (
      <div className="table-stack-cell">
        <div className="table-stack-primary" title={label}>{label}</div>
        <div className="table-stack-secondary">{total.toLocaleString('id-ID')} total orders</div>
      </div>
    )
  }
  const renderPerformanceMetric = (value: number, tone: 'total' | 'approved' | 'rejected' | 'warning') => (
    <span className={`table-metric-pill ${tone}`}>{value.toLocaleString('id-ID')}</span>
  )
  const renderPerformanceRate = (rate: unknown) => {
    const pct = Math.max(0, Math.min(100, toSafeNumber(rate) * 100))

    return (
      <div className="table-rate-cell">
        <div className="table-rate-head">
          <span>{pct.toFixed(1)}%</span>
        </div>
        <div className="table-rate-track" aria-hidden="true">
          <div className="table-rate-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }
  const formatLeadTimeHours = (value: unknown) => {
    const seconds = toSafeNumber(value)
    if (!seconds) return '-'
    return `${(seconds / 3600).toFixed(2)} hours`
  }

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

      {isBusinessTabMode && (
        <div className="business-tabs-pane">
          <button type="button" className="business-tab-btn" onClick={() => navigate('/business')}>
            Summary
          </button>
          <button
            type="button"
            className={`business-tab-btn ${listSection === 'finance' ? 'active' : ''}`}
            onClick={() => navigate('/business/finance')}
          >
            Finance
          </button>
          <button
            type="button"
            className={`business-tab-btn ${listSection === 'dealer' ? 'active' : ''}`}
            onClick={() => navigate('/business/dealer')}
          >
            Dealer
          </button>
        </div>
      )}

      <div className="page" style={{ display: 'grid', gap: 14 }}>
        {listSection === 'dealer' && (
          <>
            <div className="card">
              <div className="dealer-list-summary">
                <div className="dealer-summary-card">
                  <div className="dealer-summary-label">Total Dealers</div>
                  <div className="dealer-summary-value">{dealerTotalData || dealers.length}</div>
                  <div className="dealer-summary-note">Dealers matching the active filters.</div>
                </div>
                <div className="dealer-summary-card">
                  <div className="dealer-summary-label">Map Ready</div>
                  <div className="dealer-summary-value">{dealerPoints.length || visibleMappedDealers}</div>
                  <div className="dealer-summary-note">Ready to appear on the map.</div>
                </div>
                <div className="dealer-summary-card">
                  <div className="dealer-summary-label">Province Scope</div>
                  <div className="dealer-summary-value dealer-summary-value-text">{selectedProvinceLabel}</div>
                  <div className="dealer-summary-note">
                    {selectedDealerId ? `Focused: ${selectedDealerName}` : 'Choose a row or map marker to focus performance.'}
                  </div>
                </div>
              </div>

              <div className="compact-filter-toolbar">
                <div className="compact-filter-item grow-2">
                  <input value={dealerSearch} onChange={(e) => setDealerSearch(e.target.value)} placeholder="Search dealer name, regency, or phone" aria-label="Search dealer" />
                </div>

                <div className="compact-filter-item narrow">
                  <SearchableSelect
                    id="business-dealer-focus-filter"
                    value={selectedDealerId}
                    options={dealerOptions}
                    onChange={setSelectedDealerId}
                    placeholder="Focused Dealer"
                    searchPlaceholder="Search focused dealer..."
                    emptyMessage="Dealer not found."
                  />
                </div>

                <div className="compact-filter-item narrow">
                  <SearchableSelect
                    id="business-dealer-province-filter"
                    value={dealerProvinceFilter}
                    options={provinceOptions}
                    onChange={setDealerProvinceFilter}
                    placeholder="All Provinces"
                    searchPlaceholder="Search province..."
                    emptyMessage="Province not found."
                  />
                </div>

                <div className="compact-filter-action">
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setDealerSearch('')
                      setDealerProvinceFilter('')
                    }}
                    disabled={!dealerSearch.trim() && !dealerProvinceFilter}
                    title="Clear all filters"
                    aria-label="Clear all filters"
                    style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3>Dealers</h3>
                {canCreate && <button className="btn" onClick={() => navigate(`${dealerBasePath}/dealers/create`)}>Create Dealer</button>}
              </div>

              <Table
                className="finance-dealer-table dealer-list-table"
                data={dealers}
                keyField="id"
                onRowClick={(dealer: any) => setSelectedDealerId(String(dealer.id || ''))}
                rowStyle={(dealer: any) => dealer.id === selectedDealerId ? { background: '#eef6ff' } : undefined}
                emptyMessage="No dealers available."
                columns={[
                  {
                    header: 'Dealer',
                    accessor: (dealer: any) => {
                      const isFocused = dealer.id === selectedDealerId
                      return (
                        <div className="dealer-list-cell">
                          <div className="dealer-list-title-row">
                            <span className="dealer-list-title table-text-ellipsis" title={dealer.name || '-'}>
                              {dealer.name || '-'}
                            </span>
                            {isFocused && <span className="badge pending">Focused</span>}
                          </div>
                          <div className="dealer-list-note">
                            {isFocused ? 'Focused on the map and performance panel.' : 'Click the row to focus.'}
                          </div>
                        </div>
                      )
                    },
                    className: 'finance-dealer-col-name',
                    headerClassName: 'finance-dealer-col-name',
                  },
                  {
                    header: 'Location',
                    accessor: (dealer: any) => {
                      const locationNames = dealerLocationNameMap[String(dealer.id)] || {}
                      const regency = summarizeLocation([locationNames.regency || dealer.regency])
                      const province = summarizeLocation([locationNames.province || dealer.province])
                      return (
                        <div className="dealer-list-cell">
                          <div className="dealer-list-title table-text-ellipsis" title={regency}>{regency}</div>
                          <div className="dealer-list-note table-text-ellipsis" title={province}>{province}</div>
                        </div>
                      )
                    },
                    className: 'finance-dealer-col-location',
                    headerClassName: 'finance-dealer-col-location',
                  },
                  {
                    header: 'District / Village',
                    accessor: (dealer: any) => {
                      const locationNames = dealerLocationNameMap[String(dealer.id)] || {}
                      const district = summarizeLocation([locationNames.district || dealer.district])
                      const village = String(dealer.village || '').trim() || '-'
                      return (
                        <div className="dealer-list-cell">
                          <div className="dealer-list-title table-text-ellipsis" title={district}>{district}</div>
                          <div className="dealer-list-subnote table-text-ellipsis" title={village}>{village}</div>
                        </div>
                      )
                    },
                    className: 'finance-dealer-col-district',
                    headerClassName: 'finance-dealer-col-district',
                  },
                  {
                    header: 'Phone',
                    accessor: (dealer: any) => {
                      return (
                        <div className="dealer-list-cell">
                          <div className="dealer-list-title table-text-ellipsis" title={dealer.phone || '-'}>{dealer.phone || '-'}</div>
                        </div>
                      )
                    },
                    className: 'finance-dealer-col-phone',
                    headerClassName: 'finance-dealer-col-phone',
                  },
                  {
                    header: 'Map Status',
                    accessor: (dealer: any) => {
                      const coordinateStatus = hasCoordinate(dealer)
                      const locationText = formatDealerLocationSummary(dealer, dealerLocationNameMap[String(dealer.id)])
                      return (
                        <div className="dealer-list-cell">
                          <div className="dealer-list-pill-row">
                            <span className={`badge ${coordinateStatus ? 'success' : 'reject'}`}>
                              {coordinateStatus ? 'Mapped' : 'No Pin'}
                            </span>
                          </div>
                          <div className="dealer-list-subnote" title={locationText}>
                            {coordinateStatus ? 'Coordinates available' : 'Coordinates missing'}
                          </div>
                        </div>
                      )
                    },
                    className: 'finance-dealer-col-map',
                    headerClassName: 'finance-dealer-col-map',
                  },
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
                    headerClassName: 'finance-dealer-col-action',
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={6}>
                      <div className="dealer-empty-state">
                        <div className="dealer-empty-icon">
                          <i className="bi bi-geo-alt"></i>
                        </div>
                        <div className="dealer-empty-title">No dealers found</div>
                        <div className="dealer-empty-note">Try a different keyword or province filter, or create a new dealer entry.</div>
                      </div>
                    </td>
                  </tr>
                }
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
              <div className="dealer-list-summary finance-list-summary">
                <div className="dealer-summary-card">
                  <div className="dealer-summary-label">Total Finance Companies</div>
                  <div className="dealer-summary-value">{financeTotalData || financeCompanies.length}</div>
                  <div className="dealer-summary-note">Finance companies matching the active filters.</div>
                </div>
                <div className="dealer-summary-card">
                  <div className="dealer-summary-label">Province Scope</div>
                  <div className="dealer-summary-value dealer-summary-value-text">{selectedFinanceProvinceLabel}</div>
                  <div className="dealer-summary-note">Filtered finance company coverage.</div>
                </div>
                <div className="dealer-summary-card">
                  <div className="dealer-summary-label">Focused Dealer</div>
                  <div className="dealer-summary-value dealer-summary-value-text">{selectedDealerName}</div>
                  <div className="dealer-summary-note">Performance context uses this dealer.</div>
                </div>
              </div>

              <div className="compact-filter-toolbar">
                <div className="compact-filter-item grow-2">
                  <input value={financeSearch} onChange={(e) => setFinanceSearch(e.target.value)} placeholder="Search finance name, regency, or phone" aria-label="Search finance company" />
                </div>

                <div className="compact-filter-item narrow">
                  <SearchableSelect
                    id="business-finance-province-filter"
                    value={financeProvinceFilter}
                    options={provinceOptions}
                    onChange={setFinanceProvinceFilter}
                    placeholder="All Provinces"
                    searchPlaceholder="Search province..."
                    emptyMessage="Province not found."
                  />
                </div>

                <div className="compact-filter-action">
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setFinanceSearch('')
                      setFinanceProvinceFilter('')
                    }}
                    disabled={!financeSearch.trim() && !financeProvinceFilter}
                    title="Clear all filters"
                    aria-label="Clear all filters"
                    style={{ minWidth: 44, paddingInline: 0, justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3>Finance Company</h3>
                {canCreate && <button className="btn" onClick={() => navigate(`${financeBasePath}/companies/create`)}>Create Finance</button>}
              </div>

              <Table
                className="finance-company-table"
                data={financeCompanies}
                keyField="id"
                onRowClick={(company: any) => navigate(`${financeBasePath}/companies/${company.id}`, { state: { company } })}
                emptyMessage="No finance company available."
                columns={[
                  {
                    header: 'Finance Company',
                    accessor: (company: any) => (
                      <div className="dealer-list-cell">
                        <div className="dealer-list-title table-text-ellipsis" title={company.name || '-'}>
                          {company.name || '-'}
                        </div>
                      </div>
                    ),
                    className: 'finance-company-col-name',
                    headerClassName: 'finance-company-col-name',
                  },
                  {
                    header: 'Location',
                    accessor: (company: any) => {
                      const locationNames = financeCompanyLocationNameMap[String(company.id)] || {}
                      const regency = summarizeLocation([locationNames.regency || company.regency])
                      const province =
                        provinceOptions.find((option) => option.value === String(company.province || ''))?.label ||
                        summarizeLocation([company.province])
                      return (
                        <div className="dealer-list-cell">
                          <div className="dealer-list-title table-text-ellipsis" title={regency}>{regency}</div>
                          <div className="dealer-list-note table-text-ellipsis" title={province}>{province}</div>
                        </div>
                      )
                    },
                    className: 'finance-company-col-location',
                    headerClassName: 'finance-company-col-location',
                  },
                  {
                    header: 'District / Village',
                    accessor: (company: any) => (
                      <div className="dealer-list-cell">
                        <div className="dealer-list-title table-text-ellipsis" title={summarizeLocation([company.district])}>
                          {summarizeLocation([company.district])}
                        </div>
                        <div className="dealer-list-subnote table-text-ellipsis" title={String(company.village || '').trim() || '-'}>
                          {String(company.village || '').trim() || '-'}
                        </div>
                      </div>
                    ),
                    className: 'finance-company-col-area',
                    headerClassName: 'finance-company-col-area',
                  },
                  {
                    header: 'Phone',
                    accessor: (company: any) => (
                      <div className="dealer-list-cell">
                        <div className="dealer-list-title table-text-ellipsis" title={company.phone || '-'}>{company.phone || '-'}</div>
                      </div>
                    ),
                    className: 'finance-company-col-phone',
                    headerClassName: 'finance-company-col-phone',
                  },
                  {
                    header: 'Address',
                    accessor: (company: any) => {
                      const addressText = String(company.address || '-')
                      return (
                        <div className="dealer-list-cell">
                          <div className="dealer-list-note table-text-ellipsis" title={addressText}>
                            {addressText}
                          </div>
                        </div>
                      )
                    },
                    className: 'finance-company-col-address',
                    headerClassName: 'finance-company-col-address',
                  },
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
                    headerClassName: 'finance-company-col-action',
                    style: { width: '1%' },
                  },
                ]}
                emptyState={
                  <tr>
                    <td colSpan={6}>
                      <div className="dealer-empty-state">
                        <div className="dealer-empty-icon">
                          <i className="bi bi-bank"></i>
                        </div>
                        <div className="dealer-empty-title">No finance companies found</div>
                        <div className="dealer-empty-note">Try a different keyword or province filter, or create a new finance company entry.</div>
                      </div>
                    </td>
                  </tr>
                }
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
                <h3>Finance Performance</h3>
                <div style={{ color: '#64748b', fontSize: 12 }}>{selectedDealerName}</div>
              </div>

              <div style={{ marginTop: 12, maxWidth: 360 }}>
                <label>Select Dealer</label>
                <SearchableSelect
                  id="business-finance-dealer-select"
                  value={selectedDealerId}
                  options={dealerOptions}
                  onChange={setSelectedDealerId}
                  placeholder="Select dealer"
                  searchPlaceholder="Search dealer..."
                  emptyMessage="Dealer not found."
                />
              </div>

              {!selectedDealerId && (
                <div className="business-empty-focus">
                  <div className="business-empty-icon">⌁</div>
                  <div>
                    <div className="business-empty-title">No dealer selected</div>
                    <div className="business-empty-copy">Choose a dealer to compare finance company performance.</div>
                  </div>
                </div>
              )}
              {selectedDealerId && !metrics && (
                <div className="business-empty-focus">
                  <div className="business-empty-icon">!</div>
                  <div>
                    <div className="business-empty-title">No metrics available</div>
                    <div className="business-empty-copy">This dealer has no finance company performance data yet.</div>
                  </div>
                </div>
              )}

              {metrics && (
                <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 12, marginTop: 12 }}>
                  <div>
                    <div className="finance-report-wide-table">
                      <table className="table metric-table" style={{ minWidth: 860 }}>
                        <thead>
                          <tr>
                            <th>Finance Company</th>
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
                            const total = toSafeNumber(fc?.total_orders)
                            const approved = toSafeNumber(fc?.approved_count)
                            const rejected = toSafeNumber(fc?.rejected_count)
                            return (
                              <tr key={fc.finance_company_id}>
                                <td>{renderPerformanceName(fc.finance_company_name, total)}</td>
                                <td className="table-metric-cell">{renderPerformanceMetric(total, 'total')}</td>
                                <td className="table-metric-cell">{renderPerformanceMetric(approved, 'approved')}</td>
                                <td className="table-metric-cell">{renderPerformanceMetric(rejected, 'rejected')}</td>
                                <td>{renderPerformanceRate(fc.approval_rate)}</td>
                                <td><span className="table-lead-value">{formatLeadTimeHours(fc.lead_time_seconds_avg)}</span></td>
                                <td className="table-metric-cell">{renderPerformanceMetric(toSafeNumber(fc.rescue_approved_fc2), 'warning')}</td>
                              </tr>
                            )
                          })}
                          {dealerFinanceRows.length === 0 && (
                            <tr>
                              <td colSpan={7}>
                                <div className="table-empty-panel">No finance company metric for this dealer.</div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

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
                    {financeMetricRows.length === 0 && (
                      <div className="business-empty-focus compact">
                        <div className="business-empty-icon">≋</div>
                        <div>
                          <div className="business-empty-title">Chart is waiting for data</div>
                          <div className="business-empty-copy">Finance company bars will appear once dealer metrics are available.</div>
                        </div>
                      </div>
                    )}
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
