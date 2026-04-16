package interfacenetincome

import (
	domainnetincome "service-songket/internal/domain/netincome"
	"service-songket/pkg/filter"
)

type RepoNetIncomeInterface interface {
	Store(data domainnetincome.NetIncome) error
	GetByID(id string) (domainnetincome.NetIncome, error)
	GetAll(params filter.BaseParams) ([]domainnetincome.NetIncome, int64, error)
	Update(data domainnetincome.NetIncome) error
	Delete(id string) error
}
