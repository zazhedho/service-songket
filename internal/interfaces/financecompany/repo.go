package interfacefinancecompany

import (
	domainfinancecompany "service-songket/internal/domain/financecompany"
	"service-songket/pkg/filter"
)

type RepoFinanceCompanyInterface interface {
	Store(data domainfinancecompany.FinanceCompany) error
	GetByID(id string) (domainfinancecompany.FinanceCompany, error)
	GetAll(params filter.BaseParams) ([]domainfinancecompany.FinanceCompany, int64, error)
	Update(data domainfinancecompany.FinanceCompany) error
	Delete(id string) error
}
