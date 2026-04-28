package interfacefinancecompany

import (
	"context"
	domainfinancecompany "service-songket/internal/domain/financecompany"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceFinanceCompanyInterface interface {
	List(ctx context.Context, params filter.BaseParams) ([]domainfinancecompany.FinanceCompany, int64, error)
	Create(ctx context.Context, req dto.FinanceCompanyRequest) (domainfinancecompany.FinanceCompany, error)
	Update(ctx context.Context, id string, req dto.FinanceCompanyRequest) (domainfinancecompany.FinanceCompany, error)
	Delete(ctx context.Context, id string) error
}
