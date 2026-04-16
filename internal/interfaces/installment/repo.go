package interfaceinstallment

import (
	domaininstallment "service-songket/internal/domain/installment"
	"service-songket/pkg/filter"
)

type RepoInstallmentInterface interface {
	Store(data domaininstallment.Installment) error
	GetByID(id string) (domaininstallment.Installment, error)
	GetAll(params filter.BaseParams) ([]domaininstallment.Installment, int64, error)
	Update(data domaininstallment.Installment) error
	Delete(id string) error

	GetByMotorTypeID(motorTypeID string) (domaininstallment.Installment, error)
	GetDuplicateForUpdate(id, motorTypeID string) (domaininstallment.Installment, error)
	GetByIDWithMotorType(id string) (domaininstallment.Installment, error)
}
