package interfacecommodity

import (
	"context"

	domaincommodity "service-songket/internal/domain/commodity"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceCommodityInterface interface {
	Upsert(req dto.CommodityRequest) (domaincommodity.Commodity, error)
	AddPrice(req dto.CommodityPriceRequest) (domaincommodity.CommodityPrice, error)
	LatestPrices() ([]domaincommodity.CommodityPrice, error)
	ListCommodities() ([]domaincommodity.Commodity, error)
	ListPrices(params filter.BaseParams) ([]domaincommodity.CommodityPrice, int64, error)
	DeletePrice(id string) error
	Scrape(ctx context.Context, urls []string) ([]domaincommodity.CommodityPrice, error)
	CreateScrapeJob(urls []string) (domaincommodity.ScrapeJob, error)
	ListScrapeJobs(params filter.BaseParams) ([]domaincommodity.ScrapeJob, int64, error)
	ListScrapeResults(jobID string, params filter.BaseParams) ([]domaincommodity.ScrapeResult, int64, error)
	CommitScrapeResults(jobID string, resultIDs []string) ([]domaincommodity.CommodityPrice, error)
}
