package interfacecredit

import (
	"context"
	domaincredit "service-songket/internal/domain/credit"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceCreditInterface interface {
	Upsert(ctx context.Context, req dto.CreditCapabilityRequest) (domaincredit.CreditCapability, error)
	List(ctx context.Context, params filter.BaseParams) ([]domaincredit.CreditCapability, int64, error)
	Worksheet(ctx context.Context, provinceCode, regencyCode, jobID, motorTypeID, fromDate, toDate string) (map[string]interface{}, error)
	Summary(ctx context.Context, orderThreshold int64) ([]domaincredit.CreditSummary, error)
}
