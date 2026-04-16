package interfacejob

import (
	domainjob "service-songket/internal/domain/job"
	"service-songket/pkg/filter"
)

type RepoJobInterface interface {
	Store(data domainjob.Job) error
	GetByID(id string) (domainjob.Job, error)
	GetAll(params filter.BaseParams) ([]domainjob.Job, int64, error)
	Update(data domainjob.Job) error
	Delete(id string) error

	Exists(id string) (bool, error)
}
