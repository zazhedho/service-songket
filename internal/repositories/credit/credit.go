package repositorycredit

import (
	"context"
	"fmt"
	"strings"
	"time"

	domaincredit "service-songket/internal/domain/credit"
	domainorder "service-songket/internal/domain/order"
	interfacecredit "service-songket/internal/interfaces/credit"
	repositorygeneric "service-songket/internal/repositories/generic"
	repositoryscope "service-songket/internal/repositories/scopefilters"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domaincredit.CreditCapability]
	db *gorm.DB
}

func NewCreditRepo(db *gorm.DB) interfacecredit.RepoCreditInterface {
	return &repo{
		GenericRepository: repositorygeneric.New[domaincredit.CreditCapability](db),
		db:                db,
	}
}

func (r *repo) GetByRegencyAndJob(ctx context.Context, regency, jobID string) (domaincredit.CreditCapability, error) {
	var ret domaincredit.CreditCapability
	if err := r.db.WithContext(ctx).Where("regency = ? AND job_id = ?", regency, jobID).First(&ret).Error; err != nil {
		return domaincredit.CreditCapability{}, err
	}
	return ret, nil
}

func (r *repo) GetAll(ctx context.Context, params filter.BaseParams) ([]domaincredit.CreditCapability, int64, error) {
	query := r.db.WithContext(ctx).Model(&domaincredit.CreditCapability{}).
		Joins("LEFT JOIN jobs ON jobs.id = credit_capabilities.job_id")

	if v, ok := params.Filters["job_id"]; ok {
		query = query.Where("credit_capabilities.job_id = ?", v)
	}
	if v, ok := params.Filters["province"]; ok {
		query = query.Where("credit_capabilities.province = ?", v)
	}
	if v, ok := params.Filters["regency"]; ok {
		query = query.Where("credit_capabilities.regency = ?", v)
	}
	if v, ok := params.Filters["district"]; ok {
		query = query.Where("credit_capabilities.district = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where(
			"LOWER(credit_capabilities.province) LIKE ? OR LOWER(credit_capabilities.regency) LIKE ? OR LOWER(credit_capabilities.district) LIKE ? OR LOWER(jobs.name) LIKE ?",
			search,
			search,
			search,
			search,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "credit_capabilities." + orderBy
	}

	var data []domaincredit.CreditCapability
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

func applyCreditOrderScope(ctx context.Context, query *gorm.DB, alias string) *gorm.DB {
	return repositoryscope.ApplyOrderAccessScope(ctx, query, alias, "credit", "list_all")
}

func (r *repo) ListSummaryRows(ctx context.Context) ([]interfacecredit.CreditSummaryRow, error) {
	rows := make([]interfacecredit.CreditSummaryRow, 0)
	query := r.db.
		Table("orders").
		Select(`
			COALESCE(province,'') AS province,
			COALESCE(regency,'') AS regency,
			COALESCE(district,'') AS district,
			COALESCE(village,'') AS village,
			COUNT(*) AS total,
			SUM(CASE WHEN result_status = 'approve' THEN 1 ELSE 0 END) AS approve,
			SUM(CASE WHEN result_status = 'reject' THEN 1 ELSE 0 END) AS reject,
			SUM(CASE WHEN result_status = 'pending' THEN 1 ELSE 0 END) AS pending
		`)
	query = applyCreditOrderScope(ctx, query, "")
	if err := query.Group("province, regency, district, village").Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListJobIncomeRows(ctx context.Context, jobID string) ([]interfacecredit.CreditJobIncomeRow, error) {
	rows := make([]interfacecredit.CreditJobIncomeRow, 0)
	query := r.db.WithContext(ctx).
		Table("job_net_incomes").
		Select(`
			job_net_incomes.job_id,
			COALESCE(jobs.name, '') AS job_name,
			job_net_incomes.net_income,
			job_net_incomes.area_net_income
		`).
		Joins("JOIN jobs ON jobs.id = job_net_incomes.job_id AND jobs.deleted_at IS NULL").
		Where("job_net_incomes.deleted_at IS NULL")
	if strings.TrimSpace(jobID) != "" {
		query = query.Where("job_net_incomes.job_id = ?", jobID)
	}
	if err := query.Order("job_net_incomes.updated_at DESC, job_net_incomes.created_at DESC, job_net_incomes.id DESC").Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListMotorRows(ctx context.Context, motorTypeID string) ([]interfacecredit.CreditMotorRow, error) {
	rows := make([]interfacecredit.CreditMotorRow, 0)
	query := r.db.WithContext(ctx).
		Table("motor_types").
		Select(`
			motor_types.id AS motor_type_id,
			motor_types.name AS motor_type_name,
			COALESCE(installments.amount, 0) AS installment,
			motor_types.province_code,
			motor_types.province_name,
			motor_types.regency_code,
			motor_types.regency_name
		`).
		Joins("LEFT JOIN installments ON installments.motor_type_id = motor_types.id AND installments.deleted_at IS NULL").
		Where("motor_types.deleted_at IS NULL")
	if strings.TrimSpace(motorTypeID) != "" {
		query = query.Where("motor_types.id = ?", motorTypeID)
	}
	if err := query.Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListOrderRangeRows(ctx context.Context, jobID, motorTypeID string, fromTime, toTime *time.Time) ([]interfacecredit.CreditOrderRangeRow, error) {
	rows := make([]interfacecredit.CreditOrderRangeRow, 0)

	hasInstallment := r.HasOrderInstallmentColumn("installment")
	hasInstallmentAmount := r.HasOrderInstallmentColumn("installment_amount")
	installmentExpr := "COALESCE(inst.amount, 0)"
	switch {
	case hasInstallment && hasInstallmentAmount:
		installmentExpr = "COALESCE(o.installment, o.installment_amount, inst.amount, 0)"
	case hasInstallment:
		installmentExpr = "COALESCE(o.installment, inst.amount, 0)"
	case hasInstallmentAmount:
		installmentExpr = "COALESCE(o.installment_amount, inst.amount, 0)"
	}

	orderRangeSelect := fmt.Sprintf(`
		%s AS installment,
		COALESCE(o.dp_pct, 0) AS dp_pct,
		COALESCE(NULLIF(latest_attempt.finance_status, ''), LOWER(COALESCE(o.result_status, ''))) AS finance_status,
		COALESCE(o.province, '') AS province,
		COALESCE(o.regency, '') AS regency
	`, installmentExpr)

	query := r.db.
		Table("orders o").
		Select(orderRangeSelect).
		Joins(`
			LEFT JOIN (
				SELECT DISTINCT ON (a.order_id)
					a.order_id,
					LOWER(COALESCE(a.status, '')) AS finance_status
				FROM order_finance_attempts a
				ORDER BY a.order_id, a.attempt_no DESC, a.created_at DESC, a.id DESC
			) latest_attempt ON latest_attempt.order_id = o.id
		`).
		Joins("LEFT JOIN installments inst ON inst.motor_type_id = o.motor_type_id AND inst.deleted_at IS NULL").
		Where("o.deleted_at IS NULL")
	query = applyCreditOrderScope(ctx, query, "o")

	if strings.TrimSpace(jobID) != "" {
		query = query.Where("o.job_id = ?", jobID)
	}
	if strings.TrimSpace(motorTypeID) != "" {
		query = query.Where("o.motor_type_id = ?", motorTypeID)
	}
	if fromTime != nil && !fromTime.IsZero() {
		query = query.Where("o.pooling_at >= ?", *fromTime)
	}
	if toTime != nil && !toTime.IsZero() {
		query = query.Where("o.pooling_at < ?", toTime.AddDate(0, 0, 1))
	}
	if err := query.Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) HasOrderInstallmentColumn(column string) bool {
	return r.db.Migrator().HasColumn(&domainorder.Order{}, column)
}
