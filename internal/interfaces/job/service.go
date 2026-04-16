package interfacejob

import (
	domainjob "service-songket/internal/domain/job"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceJobInterface interface {
	List(params filter.BaseParams) ([]domainjob.JobItem, int64, error)
	GetByID(id string) (domainjob.JobItem, error)
	Create(req dto.JobRequest) (domainjob.JobItem, error)
	Update(id string, req dto.JobRequest) (domainjob.JobItem, error)
	Delete(id string) error
}
