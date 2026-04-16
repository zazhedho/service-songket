package interfacemotor

import (
	domainmotor "service-songket/internal/domain/motor"
	"service-songket/pkg/filter"
)

type RepoMotorInterface interface {
	Store(data domainmotor.MotorType) error
	GetByID(id string) (domainmotor.MotorType, error)
	GetAll(params filter.BaseParams) ([]domainmotor.MotorType, int64, error)
	Update(data domainmotor.MotorType) error
	Delete(id string) error

	GetByUniqueKey(name, brand, model, variantType, provinceCode, regencyCode string) (domainmotor.MotorType, error)
	GetDuplicateForUpdate(id, name, brand, model, variantType, provinceCode, regencyCode string) (domainmotor.MotorType, error)
	CountOrdersByMotorType(id string) (int64, error)
	CountInstallmentsByMotorType(id string) (int64, error)
}
