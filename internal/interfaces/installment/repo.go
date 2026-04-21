package interfaceinstallment

import (
	"context"
	domaininstallment "service-songket/internal/domain/installment"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoInstallmentInterface interface {
	interfacegeneric.GenericRepository[domaininstallment.Installment]

	GetByMotorTypeID(ctx context.Context, motorTypeID string) (domaininstallment.Installment, error)
	GetDuplicateForUpdate(ctx context.Context, id, motorTypeID string) (domaininstallment.Installment, error)
	GetByIDWithMotorType(ctx context.Context, id string) (domaininstallment.Installment, error)
}
