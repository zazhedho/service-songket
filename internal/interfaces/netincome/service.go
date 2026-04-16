package interfacenetincome

import (
	domainnetincome "service-songket/internal/domain/netincome"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceNetIncomeInterface interface {
	List(params filter.BaseParams) ([]domainnetincome.NetIncomeItem, int64, error)
	GetByID(id string) (domainnetincome.NetIncomeItem, error)
	Create(req dto.NetIncomeRequest) (domainnetincome.NetIncomeItem, error)
	Update(id string, req dto.NetIncomeRequest) (domainnetincome.NetIncomeItem, error)
	Delete(id string) error
}
