package interfacenetincome

import (
	"context"

	domainnetincome "service-songket/internal/domain/netincome"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoNetIncomeInterface interface {
	interfacegeneric.GenericRepository[domainnetincome.NetIncome]
	ListByJobID(ctx context.Context, jobID string, excludeID string) ([]domainnetincome.NetIncome, error)
}
