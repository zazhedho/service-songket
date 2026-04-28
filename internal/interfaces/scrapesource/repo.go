package interfacescrapesource

import (
	domainscrapesource "service-songket/internal/domain/scrapesource"
	"service-songket/pkg/filter"
)

type RepoScrapeSourceTxInterface interface {
	Store(data domainscrapesource.ScrapeSource) error
	Update(data domainscrapesource.ScrapeSource) error
	DeactivateActiveByType(sourceType, excludeID string) error
	Delete(id string) error
}

type RepoScrapeSourceInterface interface {
	RepoScrapeSourceTxInterface
	GetAll(params filter.BaseParams) ([]domainscrapesource.ScrapeSource, int64, error)
	Transaction(fc func(repo RepoScrapeSourceTxInterface) error) error
}
