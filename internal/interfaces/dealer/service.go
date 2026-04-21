package interfacedealer

import (
	"context"
	domaindealer "service-songket/internal/domain/dealer"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceDealerInterface interface {
	List(ctx context.Context, params filter.BaseParams) ([]domaindealer.Dealer, int64, error)
	Create(ctx context.Context, req dto.DealerRequest) (domaindealer.Dealer, error)
	Update(ctx context.Context, id string, req dto.DealerRequest) (domaindealer.Dealer, error)
	Delete(ctx context.Context, id string) error
}
