package interfacefinancecompany

import (
	domainfinancecompany "service-songket/internal/domain/financecompany"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceFinanceCompanyInterface interface {
	List(params filter.BaseParams) ([]domainfinancecompany.FinanceCompany, int64, error)
	Create(req dto.FinanceCompanyRequest) (domainfinancecompany.FinanceCompany, error)
	Update(id string, req dto.FinanceCompanyRequest) (domainfinancecompany.FinanceCompany, error)
	Delete(id string) error
}
