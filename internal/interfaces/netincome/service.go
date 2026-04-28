package interfacenetincome

import (
	"context"
	domainnetincome "service-songket/internal/domain/netincome"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceNetIncomeInterface interface {
	List(ctx context.Context, params filter.BaseParams) ([]domainnetincome.NetIncomeItem, int64, error)
	GetByID(ctx context.Context, id string) (domainnetincome.NetIncomeItem, error)
	Create(ctx context.Context, req dto.NetIncomeRequest) (domainnetincome.NetIncomeItem, error)
	Update(ctx context.Context, id string, req dto.NetIncomeRequest) (domainnetincome.NetIncomeItem, error)
	Delete(ctx context.Context, id string) error
}
