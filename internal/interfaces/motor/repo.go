package interfacemotor

import (
	"context"
	domainmotor "service-songket/internal/domain/motor"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoMotorInterface interface {
	interfacegeneric.GenericRepository[domainmotor.MotorType]

	GetByUniqueKey(ctx context.Context, name, brand, model, variantType, provinceCode, regencyCode string) (domainmotor.MotorType, error)
	GetDuplicateForUpdate(ctx context.Context, id, name, brand, model, variantType, provinceCode, regencyCode string) (domainmotor.MotorType, error)
	CountOrdersByMotorType(ctx context.Context, id string) (int64, error)
	CountInstallmentsByMotorType(ctx context.Context, id string) (int64, error)
}
