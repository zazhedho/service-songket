package interfaceinstallment

import (
	domaininstallment "service-songket/internal/domain/installment"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceInstallmentInterface interface {
	List(params filter.BaseParams) ([]domaininstallment.Installment, int64, error)
	GetByID(id string) (domaininstallment.Installment, error)
	Create(req dto.InstallmentRequest) (domaininstallment.Installment, error)
	Update(id string, req dto.InstallmentRequest) (domaininstallment.Installment, error)
	Delete(id string) error
}
