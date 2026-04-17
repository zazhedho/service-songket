package repositoryquadrant

import (
	"fmt"
	"strings"
	"time"

	domaincredit "service-songket/internal/domain/credit"
	domainorder "service-songket/internal/domain/order"
	domainquadrant "service-songket/internal/domain/quadrant"
	interfacequadrant "service-songket/internal/interfaces/quadrant"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domainquadrant.QuadrantResult]
	db *gorm.DB
}

func NewQuadrantRepo(db *gorm.DB) interfacequadrant.RepoQuadrantInterface {
	return &repo{
		GenericRepository: repositorygeneric.New[domainquadrant.QuadrantResult](db),
		db:                db,
	}
}

func (r *repo) GetAll(params filter.BaseParams) ([]domainquadrant.QuadrantResult, int64, error) {
	query := r.db.Model(&domainquadrant.QuadrantResult{}).
		Joins("LEFT JOIN jobs ON jobs.id = quadrants.job_id")

	if v, ok := params.Filters["job_id"]; ok {
		query = query.Where("quadrants.job_id = ?", v)
	}
	if v, ok := params.Filters["regency"]; ok {
		query = query.Where("quadrants.regency = ?", v)
	}
	if v, ok := params.Filters["quadrant"]; ok {
		query = query.Where("quadrants.quadrant = ?", v)
	}
	if v, ok := params.Filters["credit_score"]; ok {
		query = query.Where("quadrants.credit_score = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(quadrants.regency) LIKE ? OR LOWER(jobs.name) LIKE ?", search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "quadrants." + orderBy
	}

	var data []domainquadrant.QuadrantResult
	if err := query.
		Preload("Job").
		Order(fmt.Sprintf("%s %s", orderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
}

func (r *repo) ListMonthlyOrderAggregates() ([]interfacequadrant.QuadrantMonthlyOrderAggregate, error) {
	rows := make([]interfacequadrant.QuadrantMonthlyOrderAggregate, 0)
	if err := r.db.
		Table("orders o").
		Select(`
			COALESCE(NULLIF(TRIM(o.province), ''), '') AS province,
			COALESCE(NULLIF(TRIM(o.regency), ''), '') AS regency,
			COALESCE(o.job_id::text, '') AS job_id,
			COALESCE(NULLIF(TRIM(j.name), ''), '') AS job_name,
			EXTRACT(YEAR FROM o.pooling_at)::int AS year,
			EXTRACT(MONTH FROM o.pooling_at)::int AS month,
			COUNT(*) AS total
		`).
		Joins("LEFT JOIN jobs j ON j.id = o.job_id AND j.deleted_at IS NULL").
		Where("o.deleted_at IS NULL").
		Where("o.pooling_at IS NOT NULL").
		Where("NULLIF(TRIM(o.regency), '') IS NOT NULL").
		Group(`
			COALESCE(NULLIF(TRIM(o.province), ''), ''),
			COALESCE(NULLIF(TRIM(o.regency), ''), ''),
			COALESCE(o.job_id::text, ''),
			COALESCE(NULLIF(TRIM(j.name), ''), ''),
			EXTRACT(YEAR FROM o.pooling_at),
			EXTRACT(MONTH FROM o.pooling_at)
		`).
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListOrderCounts(fromTime, toTime *time.Time) ([]interfacequadrant.QuadrantOrderCountRow, error) {
	rows := make([]interfacequadrant.QuadrantOrderCountRow, 0)
	query := r.db.Model(&domainorder.Order{})
	if fromTime != nil && !fromTime.IsZero() {
		query = query.Where("pooling_at >= ?", *fromTime)
	}
	if toTime != nil && !toTime.IsZero() {
		query = query.Where("pooling_at <= ?", *toTime)
	}
	if err := query.Select("regency, job_id, COUNT(*) as total").Group("regency, job_id").Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListCreditCapabilities() ([]domaincredit.CreditCapability, error) {
	rows := make([]domaincredit.CreditCapability, 0)
	if err := r.db.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ReplaceAll(results []domainquadrant.QuadrantResult) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("1=1").Delete(&domainquadrant.QuadrantResult{}).Error; err != nil {
			return err
		}
		for i := range results {
			if err := tx.Create(&results[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
