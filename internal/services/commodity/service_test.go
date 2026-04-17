package servicecommodity

import (
	"errors"
	domaincommodity "service-songket/internal/domain/commodity"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
	"testing"

	"gorm.io/gorm"
)

type commodityRepoMock struct {
	commodityByName   map[string]domaincommodity.Commodity
	commodityByID     map[string]domaincommodity.Commodity
	storedCommodities []domaincommodity.Commodity
	storedPrices      []domaincommodity.CommodityPrice
	scrapeResults     []domaincommodity.ScrapeResult
	committedRows     []domaincommodity.ScrapeResult
}

func (m *commodityRepoMock) StoreCommodity(data domaincommodity.Commodity) error {
	m.storedCommodities = append(m.storedCommodities, data)
	if m.commodityByName == nil {
		m.commodityByName = map[string]domaincommodity.Commodity{}
	}
	m.commodityByName[data.Name] = data
	return nil
}
func (m *commodityRepoMock) GetCommodityByName(name string) (domaincommodity.Commodity, error) {
	if row, ok := m.commodityByName[name]; ok {
		return row, nil
	}
	return domaincommodity.Commodity{}, gorm.ErrRecordNotFound
}
func (m *commodityRepoMock) GetCommodityByID(id string) (domaincommodity.Commodity, error) {
	if row, ok := m.commodityByID[id]; ok {
		return row, nil
	}
	return domaincommodity.Commodity{}, gorm.ErrRecordNotFound
}
func (m *commodityRepoMock) UpdateCommodity(data domaincommodity.Commodity) error { return nil }
func (m *commodityRepoMock) StorePrice(data domaincommodity.CommodityPrice) error {
	m.storedPrices = append(m.storedPrices, data)
	return nil
}
func (m *commodityRepoMock) GetAllCommodities() ([]domaincommodity.Commodity, error) { return nil, nil }
func (m *commodityRepoMock) GetLatestPriceByCommodityID(commodityID string) (domaincommodity.CommodityPrice, error) {
	return domaincommodity.CommodityPrice{}, errors.New("not implemented")
}
func (m *commodityRepoMock) GetAllPrices(params filter.BaseParams) ([]domaincommodity.CommodityPrice, int64, error) {
	return nil, 0, nil
}
func (m *commodityRepoMock) DeletePrice(id string) error                         { return nil }
func (m *commodityRepoMock) StoreScrapeJob(data domaincommodity.ScrapeJob) error { return nil }
func (m *commodityRepoMock) UpdateScrapeJobFields(id string, updates map[string]interface{}) error {
	return nil
}
func (m *commodityRepoMock) GetAllScrapeJobs(params filter.BaseParams) ([]domaincommodity.ScrapeJob, int64, error) {
	return nil, 0, nil
}
func (m *commodityRepoMock) StoreScrapeResult(data domaincommodity.ScrapeResult) error { return nil }
func (m *commodityRepoMock) GetAllScrapeResults(jobID string, params filter.BaseParams) ([]domaincommodity.ScrapeResult, int64, error) {
	return nil, 0, nil
}
func (m *commodityRepoMock) GetScrapeResults(jobID string, resultIDs []string) ([]domaincommodity.ScrapeResult, error) {
	return append([]domaincommodity.ScrapeResult{}, m.scrapeResults...), nil
}
func (m *commodityRepoMock) ListActiveScrapeSourceURLs(sourceType string) ([]string, error) {
	return nil, nil
}
func (m *commodityRepoMock) CommitScrapeResults(rows []domaincommodity.ScrapeResult) ([]domaincommodity.CommodityPrice, error) {
	m.committedRows = append([]domaincommodity.ScrapeResult{}, rows...)
	return []domaincommodity.CommodityPrice{{Id: "price-1"}}, nil
}

func TestAddPriceCreatesCommodityWhenNameNotFound(t *testing.T) {
	repo := &commodityRepoMock{commodityByName: map[string]domaincommodity.Commodity{}}
	service := NewCommodityService(repo)

	price, err := service.AddPrice(dto.CommodityPriceRequest{
		CommodityName: "Cabai Rawit",
		Price:         12000,
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(repo.storedCommodities) != 1 {
		t.Fatalf("expected commodity to be created, got %d", len(repo.storedCommodities))
	}
	if repo.storedCommodities[0].Unit != "unit" {
		t.Fatalf("expected default unit 'unit', got %q", repo.storedCommodities[0].Unit)
	}
	if price.Commodity == nil || price.Commodity.Name != "Cabai Rawit" {
		t.Fatalf("expected commodity to be attached, got %+v", price.Commodity)
	}
}

func TestCommitScrapeResultsRequiresResultIDs(t *testing.T) {
	service := NewCommodityService(&commodityRepoMock{})
	_, err := service.CommitScrapeResults("job-1", nil)
	if err == nil || err.Error() != "result_ids is required" {
		t.Fatalf("expected result_ids error, got %v", err)
	}
}

func TestCommitScrapeResultsPassesRowsToRepo(t *testing.T) {
	repo := &commodityRepoMock{
		scrapeResults: []domaincommodity.ScrapeResult{{Id: "result-1"}},
	}
	service := NewCommodityService(repo)

	rows, err := service.CommitScrapeResults("job-1", []string{"result-1"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(rows) != 1 || len(repo.committedRows) != 1 || repo.committedRows[0].Id != "result-1" {
		t.Fatalf("expected scrape results to be committed, got rows=%+v committed=%+v", rows, repo.committedRows)
	}
}

func TestUpsertUpdatesExistingCommodityUnit(t *testing.T) {
	repo := &commodityRepoMock{
		commodityByName: map[string]domaincommodity.Commodity{
			"Beras": {Id: "commodity-1", Name: "Beras", Unit: "kg"},
		},
	}
	service := NewCommodityService(repo)

	row, err := service.Upsert(dto.CommodityRequest{Name: "Beras", Unit: "pack"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if row.Unit != "pack" {
		t.Fatalf("expected updated unit, got %q", row.Unit)
	}
}
