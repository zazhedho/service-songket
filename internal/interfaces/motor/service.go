package interfacemotor

import (
	domainmotor "service-songket/internal/domain/motor"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceMotorInterface interface {
	List(params filter.BaseParams) ([]domainmotor.MotorType, int64, error)
	GetByID(id string) (domainmotor.MotorType, error)
	Create(req dto.MotorTypeRequest) (domainmotor.MotorType, error)
	Update(id string, req dto.MotorTypeRequest) (domainmotor.MotorType, error)
	Delete(id string) error
}
