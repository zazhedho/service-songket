package interfacelookup

import (
	domaindealer "service-songket/internal/domain/dealer"
	domainfinancecompany "service-songket/internal/domain/financecompany"
	domaininstallment "service-songket/internal/domain/installment"
	domainjob "service-songket/internal/domain/job"
	domainmotor "service-songket/internal/domain/motor"
)

type RepoLookupInterface interface {
	ListFinanceCompanies() ([]domainfinancecompany.FinanceCompany, error)
	ListMotorTypes() ([]domainmotor.MotorType, error)
	ListInstallments() ([]domaininstallment.Installment, error)
	ListJobs() ([]domainjob.Job, error)
	ListDealers() ([]domaindealer.Dealer, error)
	ListOrderYears() ([]int, error)
}
