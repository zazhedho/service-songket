package interfacenetincome

import (
	domainnetincome "service-songket/internal/domain/netincome"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoNetIncomeInterface interface {
	interfacegeneric.GenericRepository[domainnetincome.NetIncome]
}
