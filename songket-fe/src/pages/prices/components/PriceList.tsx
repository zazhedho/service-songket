import ActionMenu from '../../../components/common/ActionMenu'
import Pagination from '../../../components/common/Pagination'

type PriceListProps = {
  canImport: boolean
  canList: boolean
  canScrape: boolean
  formatRupiah: (value: number) => string
  loadingPrices: boolean
  navigate: (path: string, options?: any) => void
  onRemovePrice: (id: string) => Promise<void>
  priceLimit: number
  pricePage: number
  priceSearch: string
  priceTotalData: number
  priceTotalPages: number
  prices: any[]
  setPriceLimit: React.Dispatch<React.SetStateAction<number>>
  setPricePage: React.Dispatch<React.SetStateAction<number>>
  setPriceSearch: React.Dispatch<React.SetStateAction<string>>
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>
}

export default function PriceList({
  canImport,
  canList,
  canScrape,
  formatRupiah,
  loadingPrices,
  navigate,
  onRemovePrice,
  priceLimit,
  pricePage,
  priceSearch,
  priceTotalData,
  priceTotalPages,
  prices,
  setPriceLimit,
  setPricePage,
  setPriceSearch,
  setShowModal,
}: PriceListProps) {
  return (
    <>
      <div className="header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Harga Pangan</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canScrape && (
            <button className="btn" onClick={() => setShowModal(true)}>
              Jalankan Scrape
            </button>
          )}
          {canImport && (
            <button className="btn-ghost" onClick={() => navigate('/prices/create')}>
              Input Manual
            </button>
          )}
        </div>
      </div>

      {!canList && <div className="page"><div className="alert">Tidak ada izin melihat harga.</div></div>}

      {canList && (
        <div className="page">
          <div className="card">
            <div style={{ marginBottom: 10 }}>
              <label>Search Harga</label>
              <input value={priceSearch} onChange={(e) => setPriceSearch(e.target.value)} placeholder="Cari komoditas/sumber" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Daftar Harga</h3>
              <small style={{ color: '#64748b' }}>Data harga dengan pagination</small>
            </div>

            {loadingPrices ? (
              <div>Memuat...</div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Komoditas</th>
                      <th>Harga</th>
                      <th>Sumber</th>
                      <th>Waktu</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((price) => (
                      <tr key={price.id}>
                        <td>{price.commodity?.name || 'Komoditas'}</td>
                        <td>{formatRupiah(price.price)} {price.commodity?.unit ? `/ ${price.commodity?.unit}` : ''}</td>
                        <td style={{ maxWidth: 220, wordBreak: 'break-word' }}>{price.source_url || '-'}</td>
                        <td>{price.collected_at ? new Date(price.collected_at).toLocaleString('id-ID') : '-'}</td>
                        <td className="action-cell">
                          <ActionMenu
                            items={[
                              {
                                key: 'view',
                                label: 'View',
                                onClick: () => navigate(`/prices/${price.id}`, { state: { price } }),
                              },
                              {
                                key: 'delete',
                                label: 'Delete',
                                onClick: () => void onRemovePrice(price.id),
                                hidden: !canScrape,
                                danger: true,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                    {prices.length === 0 && (
                      <tr>
                        <td colSpan={5}>Belum ada harga.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <Pagination
                  page={pricePage}
                  totalPages={priceTotalPages}
                  totalData={priceTotalData}
                  limit={priceLimit}
                  onPageChange={setPricePage}
                  onLimitChange={(next) => {
                    setPriceLimit(next)
                    setPricePage(1)
                  }}
                  disabled={loadingPrices}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
