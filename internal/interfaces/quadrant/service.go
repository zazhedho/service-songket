package interfacequadrant

import (
	"context"
	domainquadrant "service-songket/internal/domain/quadrant"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceQuadrantInterface interface {
	Summary(ctx context.Context, selectedYear, selectedMonth int) ([]domainquadrant.QuadrantFlowSummary, error)
	Recompute(ctx context.Context, req dto.QuadrantComputeRequest) ([]domainquadrant.QuadrantResult, error)
	List(ctx context.Context, params filter.BaseParams) ([]domainquadrant.QuadrantResult, int64, error)
}
