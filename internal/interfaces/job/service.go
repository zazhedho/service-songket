package interfacejob

import (
	"context"
	domainjob "service-songket/internal/domain/job"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceJobInterface interface {
	List(ctx context.Context, params filter.BaseParams) ([]domainjob.JobItem, int64, error)
	GetByID(ctx context.Context, id string) (domainjob.JobItem, error)
	Create(ctx context.Context, req dto.JobRequest) (domainjob.JobItem, error)
	Update(ctx context.Context, id string, req dto.JobRequest) (domainjob.JobItem, error)
	Delete(ctx context.Context, id string) error
}
