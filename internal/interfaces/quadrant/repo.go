package interfacequadrant

import (
	"time"

	domaincredit "service-songket/internal/domain/credit"
	domainquadrant "service-songket/internal/domain/quadrant"
	"service-songket/pkg/filter"
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
	GetAll(params filter.BaseParams) ([]domainquadrant.QuadrantResult, int64, error)
	ListMonthlyOrderAggregates() ([]QuadrantMonthlyOrderAggregate, error)
	ListOrderCounts(fromTime, toTime *time.Time) ([]QuadrantOrderCountRow, error)
	ListCreditCapabilities() ([]domaincredit.CreditCapability, error)
	ReplaceAll(results []domainquadrant.QuadrantResult) error
}
