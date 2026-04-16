package interfacecredit

import (
	domaincredit "service-songket/internal/domain/credit"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceCreditInterface interface {
	Upsert(req dto.CreditCapabilityRequest) (domaincredit.CreditCapability, error)
	List(params filter.BaseParams) ([]domaincredit.CreditCapability, int64, error)
	Worksheet(provinceCode, regencyCode, jobID, motorTypeID, fromDate, toDate string) (map[string]interface{}, error)
	Summary(orderThreshold int64) ([]domaincredit.CreditSummary, error)
}
