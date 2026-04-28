package interfacejob

import (
	"context"
	domainjob "service-songket/internal/domain/job"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoJobInterface interface {
	interfacegeneric.GenericRepository[domainjob.Job]

	Exists(ctx context.Context, id string) (bool, error)
}
