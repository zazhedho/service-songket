package interfacequadrant

import (
	domainquadrant "service-songket/internal/domain/quadrant"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceQuadrantInterface interface {
	Summary(selectedYear, selectedMonth int) ([]domainquadrant.QuadrantFlowSummary, error)
	Recompute(req dto.QuadrantComputeRequest) ([]domainquadrant.QuadrantResult, error)
	List(params filter.BaseParams) ([]domainquadrant.QuadrantResult, int64, error)
}
