package interfacedealer

import (
	domaindealer "service-songket/internal/domain/dealer"
	"service-songket/pkg/filter"
)

type RepoDealerInterface interface {
	Store(data domaindealer.Dealer) error
	GetByID(id string) (domaindealer.Dealer, error)
	GetAll(params filter.BaseParams) ([]domaindealer.Dealer, int64, error)
	Update(data domaindealer.Dealer) error
	Delete(id string) error
}
