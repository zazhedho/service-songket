package repositoryorder

import (
	"context"
	"fmt"
	"strings"

	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	repositoryscope "service-songket/internal/repositories/scopefilters"

	"gorm.io/gorm"
)

func applyDashboardScopeFilters(ctx context.Context, query *gorm.DB, req dto.DashboardSummaryQuery, financeCompanyColumn string) *gorm.DB {
	query = repositoryscope.ApplyOrderAccessScope(ctx, query, "o", "orders", "list_all")
	if dealerID := strings.TrimSpace(req.DealerID); dealerID != "" {
		query = query.Where("o.dealer_id = ?", dealerID)
	}
	if financeCompanyID := strings.TrimSpace(req.FinanceCompanyID); financeCompanyID != "" && strings.TrimSpace(financeCompanyColumn) != "" {
		query = query.Where(fmt.Sprintf("%s = ?", financeCompanyColumn), financeCompanyID)
	}
	if area := strings.ToLower(strings.TrimSpace(req.Area)); area != "" {
		query = query.Where("(LOWER(COALESCE(d.regency, '')) = ? OR LOWER(COALESCE(d.district, '')) = ?)", area, area)
	}
	if resultStatus := strings.ToLower(strings.TrimSpace(req.ResultStatus)); resultStatus != "" {
		query = query.Where("LOWER(COALESCE(o.result_status, '')) = ?", resultStatus)
	}
	return query
}

func applyDashboardPeriodFilters(query *gorm.DB, req dto.DashboardSummaryQuery) *gorm.DB {
	analysis := strings.ToLower(strings.TrimSpace(req.Analysis))
	switch analysis {
	case "yearly":
		if req.Year > 0 {
			query = query.Where("EXTRACT(YEAR FROM o.pooling_at) = ?", req.Year)
		}
		if date := strings.TrimSpace(req.Date); date != "" {
			query = query.Where("DATE(o.pooling_at) <= ?", date)
		}
		return query
	case "monthly":
		if req.Year > 0 {
			query = query.Where("EXTRACT(YEAR FROM o.pooling_at) = ?", req.Year)
		}
		if req.Month >= 1 && req.Month <= 12 {
			query = query.Where("EXTRACT(MONTH FROM o.pooling_at) = ?", req.Month)
		}
		if date := strings.TrimSpace(req.Date); date != "" {
			query = query.Where("DATE(o.pooling_at) <= ?", date)
		}
		return query
	case "daily":
		if date := strings.TrimSpace(req.Date); date != "" {
			query = query.Where("DATE(o.pooling_at) = ?", date)
		}
		return query
	case "custom":
		if from := strings.TrimSpace(req.From); from != "" {
			query = query.Where("DATE(o.pooling_at) >= ?", from)
		}
		if to := strings.TrimSpace(req.To); to != "" {
			query = query.Where("DATE(o.pooling_at) <= ?", to)
		}
		return query
	}

	if date := strings.TrimSpace(req.Date); date != "" {
		query = query.Where("DATE(o.pooling_at) = ?", date)
	}
	if from := strings.TrimSpace(req.From); from != "" {
		query = query.Where("DATE(o.pooling_at) >= ?", from)
	}
	if to := strings.TrimSpace(req.To); to != "" {
		query = query.Where("DATE(o.pooling_at) <= ?", to)
	}
	if req.Month >= 1 && req.Month <= 12 {
		query = query.Where("EXTRACT(MONTH FROM o.pooling_at) = ?", req.Month)
	}
	if req.Year > 0 {
		query = query.Where("EXTRACT(YEAR FROM o.pooling_at) = ?", req.Year)
	}
	return query
}

func (r *repo) buildDashboardSummaryBaseQuery(ctx context.Context, req dto.DashboardSummaryQuery) *gorm.DB {
	query := r.DB.
		Table("orders o").
		Select(`
			o.pooling_at,
			o.result_at,
			LOWER(COALESCE(o.result_status, '')) AS result_status,
			COALESCE(o.dp_pct, 0) AS dp_pct,
			COALESCE(NULLIF(j.name, ''), '-') AS job_name,
			COALESCE(NULLIF(mt.name, ''), '-') AS motor_type_name,
			COALESCE(NULLIF(fc1.name, ''), '-') AS finance_company_name
		`).
		Joins("LEFT JOIN jobs j ON j.id = o.job_id AND j.deleted_at IS NULL").
		Joins("LEFT JOIN motor_types mt ON mt.id = o.motor_type_id AND mt.deleted_at IS NULL").
		Joins("LEFT JOIN dealers d ON d.id = o.dealer_id AND d.deleted_at IS NULL").
		Joins("LEFT JOIN order_finance_attempts a1 ON a1.order_id = o.id AND a1.attempt_no = 1").
		Joins("LEFT JOIN finance_companies fc1 ON fc1.id = a1.finance_company_id AND fc1.deleted_at IS NULL").
		Where("o.deleted_at IS NULL")
	return applyDashboardScopeFilters(ctx, query, req, "a1.finance_company_id")
}

func (r *repo) ListDashboardSummaryRows(ctx context.Context, req dto.DashboardSummaryQuery) ([]domainorder.DashboardSummaryRow, error) {
	query := applyDashboardPeriodFilters(r.buildDashboardSummaryBaseQuery(ctx, req), req)
	rows := make([]domainorder.DashboardSummaryRow, 0)
	if err := query.Order("o.pooling_at ASC").Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListDashboardFinanceDecisionDailyRows(ctx context.Context, req dto.DashboardSummaryQuery) ([]domainorder.DashboardFinanceDecisionDailyRow, error) {
	query := r.DB.
		Table("orders o").
		Select(`
			TO_CHAR(DATE(o.pooling_at), 'YYYY-MM-DD') AS date_key,
			COUNT(CASE WHEN LOWER(COALESCE(oa.status, '')) = 'approve' THEN 1 END) AS approve_total,
			COUNT(CASE WHEN LOWER(COALESCE(oa.status, '')) = 'reject' THEN 1 END) AS reject_total
		`).
		Joins("JOIN order_finance_attempts oa ON oa.order_id = o.id").
		Joins("LEFT JOIN dealers d ON d.id = o.dealer_id AND d.deleted_at IS NULL").
		Where("o.deleted_at IS NULL").
		Where("LOWER(COALESCE(oa.status, '')) IN ?", []string{"approve", "reject"})
	query = applyDashboardScopeFilters(ctx, query, req, "oa.finance_company_id")
	query = applyDashboardPeriodFilters(query, req)

	rows := make([]domainorder.DashboardFinanceDecisionDailyRow, 0)
	if err := query.Group("DATE(o.pooling_at)").Order("DATE(o.pooling_at) ASC").Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListDashboardFinanceDecisionByCompanyRows(ctx context.Context, req dto.DashboardSummaryQuery) ([]domainorder.DashboardFinanceDecisionByCompanyRow, error) {
	query := r.DB.
		Table("orders o").
		Select(`
			TO_CHAR(DATE(o.pooling_at), 'YYYY-MM-DD') AS date_key,
			COALESCE(NULLIF(fc.name, ''), '-') AS finance_company,
			COUNT(CASE WHEN LOWER(COALESCE(oa.status, '')) = 'approve' THEN 1 END) AS approve_total,
			COUNT(CASE WHEN LOWER(COALESCE(oa.status, '')) = 'reject' THEN 1 END) AS reject_total
		`).
		Joins("JOIN order_finance_attempts oa ON oa.order_id = o.id").
		Joins("LEFT JOIN dealers d ON d.id = o.dealer_id AND d.deleted_at IS NULL").
		Joins("LEFT JOIN finance_companies fc ON fc.id = oa.finance_company_id AND fc.deleted_at IS NULL").
		Where("o.deleted_at IS NULL").
		Where("LOWER(COALESCE(oa.status, '')) IN ?", []string{"approve", "reject"})
	query = applyDashboardScopeFilters(ctx, query, req, "oa.finance_company_id")
	query = applyDashboardPeriodFilters(query, req)

	rows := make([]domainorder.DashboardFinanceDecisionByCompanyRow, 0)
	if err := query.
		Group("DATE(o.pooling_at), COALESCE(NULLIF(fc.name, ''), '-')").
		Order("DATE(o.pooling_at) ASC, COALESCE(NULLIF(fc.name, ''), '-') ASC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) CountDashboardOrders(ctx context.Context, req dto.DashboardSummaryQuery) (int64, error) {
	query := applyDashboardPeriodFilters(r.buildDashboardSummaryBaseQuery(ctx, req), req)
	var total int64
	if err := query.Distinct("o.id").Count(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

func (r *repo) GetDashboardDecisionTotals(ctx context.Context, req dto.DashboardSummaryQuery) (domainorder.DashboardDecisionTotals, error) {
	query := r.DB.
		Table("orders o").
		Select(`
			COUNT(CASE WHEN LOWER(COALESCE(oa.status, '')) = 'approve' THEN 1 END) AS approve_total,
			COUNT(CASE WHEN LOWER(COALESCE(oa.status, '')) = 'reject' THEN 1 END) AS reject_total
		`).
		Joins("JOIN order_finance_attempts oa ON oa.order_id = o.id").
		Joins("LEFT JOIN dealers d ON d.id = o.dealer_id AND d.deleted_at IS NULL").
		Where("o.deleted_at IS NULL").
		Where("LOWER(COALESCE(oa.status, '')) IN ?", []string{"approve", "reject"})
	query = applyDashboardScopeFilters(ctx, query, req, "oa.finance_company_id")
	query = applyDashboardPeriodFilters(query, req)

	var totals domainorder.DashboardDecisionTotals
	if err := query.Scan(&totals).Error; err != nil {
		return domainorder.DashboardDecisionTotals{}, err
	}
	return totals, nil
}
