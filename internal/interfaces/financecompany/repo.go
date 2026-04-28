package interfacefinancecompany

import (
	domainfinancecompany "service-songket/internal/domain/financecompany"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoFinanceCompanyInterface interface {
	interfacegeneric.GenericRepository[domainfinancecompany.FinanceCompany]
}
