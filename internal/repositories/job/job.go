package repositoryjob

import (
	domainjob "service-songket/internal/domain/job"
	interfacejob "service-songket/internal/interfaces/job"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domainjob.Job]
}

func NewJobRepo(db *gorm.DB) interfacejob.RepoJobInterface {
	return &repo{GenericRepository: repositorygeneric.New[domainjob.Job](db)}
}

func (r *repo) GetAll(params filter.BaseParams) ([]domainjob.Job, int64, error) {
	return r.GenericRepository.GetAll(params, repositorygeneric.QueryOptions{
		Search:              repositorygeneric.BuildSearchFunc("name"),
		AllowedFilters:      []string{"name"},
		AllowedOrderColumns: []string{"id", "name", "created_at", "updated_at"},
		DefaultOrders:       []string{"name asc"},
	})
}

func (r *repo) Exists(id string) (bool, error) {
	return r.ExistsByField("id", id)
}
