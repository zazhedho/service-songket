package interfacequadrant

import (
	"context"
	"time"

	domaincredit "service-songket/internal/domain/credit"
	domainquadrant "service-songket/internal/domain/quadrant"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type QuadrantMonthlyOrderAggregate struct {
	Province string `gorm:"column:province"`
	Regency  string `gorm:"column:regency"`
	JobID    string `gorm:"column:job_id"`
	JobName  string `gorm:"column:job_name"`
	Year     int    `gorm:"column:year"`
	Month    int    `gorm:"column:month"`
	Total    int64  `gorm:"column:total"`
}

type QuadrantOrderCountRow struct {
	Regency string
	JobID   string
	Total   int64
}

type RepoQuadrantInterface interface {
	interfacegeneric.GenericRepository[domainquadrant.QuadrantResult]

	ListMonthlyOrderAggregates(ctx context.Context) ([]QuadrantMonthlyOrderAggregate, error)
	ListOrderCounts(ctx context.Context, fromTime, toTime *time.Time) ([]QuadrantOrderCountRow, error)
	ListCreditCapabilities(ctx context.Context) ([]domaincredit.CreditCapability, error)
	ReplaceAll(ctx context.Context, results []domainquadrant.QuadrantResult) error
}
