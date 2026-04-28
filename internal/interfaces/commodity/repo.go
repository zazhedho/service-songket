package interfacecommodity

import (
	domaincommodity "service-songket/internal/domain/commodity"
	"service-songket/pkg/filter"
)

type RepoCommodityInterface interface {
	StoreCommodity(data domaincommodity.Commodity) error
	GetCommodityByName(name string) (domaincommodity.Commodity, error)
	GetCommodityByID(id string) (domaincommodity.Commodity, error)
	UpdateCommodity(data domaincommodity.Commodity) error
	StorePrice(data domaincommodity.CommodityPrice) error
	GetAllCommodities() ([]domaincommodity.Commodity, error)
	GetLatestPriceByCommodityID(commodityID string) (domaincommodity.CommodityPrice, error)
	GetAllPrices(params filter.BaseParams) ([]domaincommodity.CommodityPrice, int64, error)
	DeletePrice(id string) error
	StoreScrapeJob(data domaincommodity.ScrapeJob) error
	UpdateScrapeJobFields(id string, updates map[string]interface{}) error
	GetAllScrapeJobs(params filter.BaseParams) ([]domaincommodity.ScrapeJob, int64, error)
	StoreScrapeResult(data domaincommodity.ScrapeResult) error
	GetAllScrapeResults(jobID string, params filter.BaseParams) ([]domaincommodity.ScrapeResult, int64, error)
	GetScrapeResults(jobID string, resultIDs []string) ([]domaincommodity.ScrapeResult, error)
	ListActiveScrapeSourceURLs(sourceType string) ([]string, error)
	CommitScrapeResults(rows []domaincommodity.ScrapeResult) ([]domaincommodity.CommodityPrice, error)
}
