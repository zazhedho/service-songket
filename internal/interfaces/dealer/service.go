package interfacedealer

import (
	domaindealer "service-songket/internal/domain/dealer"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceDealerInterface interface {
	List(params filter.BaseParams) ([]domaindealer.Dealer, int64, error)
	Create(req dto.DealerRequest) (domaindealer.Dealer, error)
	Update(id string, req dto.DealerRequest) (domaindealer.Dealer, error)
	Delete(id string) error
}
