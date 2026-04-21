package interfaceinstallment

import (
	"context"
	domaininstallment "service-songket/internal/domain/installment"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceInstallmentInterface interface {
	List(ctx context.Context, params filter.BaseParams) ([]domaininstallment.Installment, int64, error)
	GetByID(ctx context.Context, id string) (domaininstallment.Installment, error)
	Create(ctx context.Context, req dto.InstallmentRequest) (domaininstallment.Installment, error)
	Update(ctx context.Context, id string, req dto.InstallmentRequest) (domaininstallment.Installment, error)
	Delete(ctx context.Context, id string) error
}
