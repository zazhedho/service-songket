package interfacemotor

import (
	"context"
	domainmotor "service-songket/internal/domain/motor"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceMotorInterface interface {
	List(ctx context.Context, params filter.BaseParams) ([]domainmotor.MotorType, int64, error)
	GetByID(ctx context.Context, id string) (domainmotor.MotorType, error)
	Create(ctx context.Context, req dto.MotorTypeRequest) (domainmotor.MotorType, error)
	Update(ctx context.Context, id string, req dto.MotorTypeRequest) (domainmotor.MotorType, error)
	Delete(ctx context.Context, id string) error
}
