package interfacescrapesource

import (
	domainscrapesource "service-songket/internal/domain/scrapesource"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceScrapeSourceInterface interface {
	List(params filter.BaseParams) ([]domainscrapesource.ScrapeSource, int64, error)
	Create(req dto.ScrapeSourceRequest) (domainscrapesource.ScrapeSource, error)
	Update(id string, req dto.ScrapeSourceRequest) (domainscrapesource.ScrapeSource, error)
	Delete(id string) error
}
