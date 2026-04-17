package repositoryorder

import (
	"fmt"
	"strings"

	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	interfaceorder "service-songket/internal/interfaces/order"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	DB *gorm.DB
}

type txRepo struct {
	db *gorm.DB
}

func NewOrderRepo(db *gorm.DB) interfaceorder.RepoOrderInterface {
	return &repo{DB: db}
}

func (r *repo) GetByID(id string) (domainorder.Order, error) {
	var ret domainorder.Order
	if err := r.DB.Where("id = ?", id).First(&ret).Error; err != nil {
		return domainorder.Order{}, err
	}
	return ret, nil
}

func (r *repo) GetByIDWithAttempts(id string) (domainorder.Order, error) {
	var ret domainorder.Order
	if err := r.DB.Preload("Attempts").Where("id = ?", id).First(&ret).Error; err != nil {
		return domainorder.Order{}, err
	}
	return ret, nil
}

func (r *repo) GetAll(params filter.BaseParams, createdBy string) ([]domainorder.Order, int64, error) {
	query := r.DB.Model(&domainorder.Order{}).Preload("MotorType").Preload("Job").Preload("Attempts")

	if strings.TrimSpace(createdBy) != "" {
		query = query.Where("created_by = ?", createdBy)
	}
	if v, ok := params.Filters["dealer_id"]; ok {
		query = query.Where("dealer_id = ?", v)
	}
	if v, ok := params.Filters["finance_company_id"]; ok {
		query = query.Joins("LEFT JOIN order_finance_attempts oa ON oa.order_id = orders.id AND oa.attempt_no = 1").
			Where("oa.finance_company_id = ?", v)
	}
	if v, ok := params.Filters["status"]; ok {
		query = query.Where("result_status = ?", v)
	}
	if v, ok := params.Filters["from_date"]; ok {
		fromDate := strings.TrimSpace(fmt.Sprint(v))
		if fromDate != "" {
			query = query.Where(
				`(
					DATE(orders.created_at) >= ?
					OR DATE(orders.pooling_at) >= ?
				)`,
				fromDate,
				fromDate,
			)
		}
	}
	if v, ok := params.Filters["to_date"]; ok {
		toDate := strings.TrimSpace(fmt.Sprint(v))
		if toDate != "" {
			query = query.Where(
				`(
					DATE(orders.created_at) <= ?
					OR DATE(orders.pooling_at) <= ?
				)`,
				toDate,
				toDate,
			)
		}
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(pooling_number) LIKE ? OR LOWER(consumer_name) LIKE ? OR LOWER(consumer_phone) LIKE ?", search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var orders []domainorder.Order
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (r *repo) ListForExport(req dto.OrderExportRequest, role, userID string) ([]domainorder.Order, error) {
	query := r.DB.
		Model(&domainorder.Order{}).
		Preload("Dealer").
		Preload("Job").
		Preload("MotorType").
		Preload("Attempts", func(db *gorm.DB) *gorm.DB {
			return db.Order("attempt_no ASC").Preload("FinanceCompany")
		})

	if role == "dealer" {
		query = query.Where("created_by = ?", strings.TrimSpace(userID))
	}
	if dealerID := strings.TrimSpace(req.DealerID); dealerID != "" {
		query = query.Where("dealer_id = ?", dealerID)
	}
	if financeCompanyID := strings.TrimSpace(req.FinanceCompanyID); financeCompanyID != "" {
		query = query.Joins("LEFT JOIN order_finance_attempts oa1 ON oa1.order_id = orders.id AND oa1.attempt_no = 1").
			Where("oa1.finance_company_id = ?", financeCompanyID)
	}
	if status := strings.ToLower(strings.TrimSpace(req.Status)); status != "" {
		query = query.Where("LOWER(result_status) = ?", status)
	}
	if search := strings.ToLower(strings.TrimSpace(req.Search)); search != "" {
		pattern := "%" + search + "%"
		query = query.Where("LOWER(pooling_number) LIKE ? OR LOWER(consumer_name) LIKE ? OR LOWER(consumer_phone) LIKE ?", pattern, pattern, pattern)
	}

	fromDate := strings.TrimSpace(req.FromDate)
	toDate := strings.TrimSpace(req.ToDate)
	query = query.Where(
		`(
			(DATE(orders.created_at) >= ? AND DATE(orders.created_at) <= ?)
			OR
			(DATE(orders.pooling_at) >= ? AND DATE(orders.pooling_at) <= ?)
		)`,
		fromDate, toDate, fromDate, toDate,
	)

	if !r.DB.Migrator().HasColumn(&domainorder.Order{}, "installment") {
		query = query.Select(`
			orders.id,
			orders.pooling_number,
			orders.pooling_at,
			orders.result_at,
			orders.dealer_id,
			orders.consumer_name,
			orders.consumer_phone,
			orders.province,
			orders.regency,
			orders.district,
			orders.village,
			orders.address,
			orders.job_id,
			orders.motor_type_id,
			orders.otr,
			orders.dp_gross,
			orders.dp_paid,
			orders.dp_pct,
			orders.tenor,
			orders.result_status,
			orders.result_notes,
			orders.created_by,
			orders.created_at,
			orders.updated_at
		`)
	}

	var orders []domainorder.Order
	if err := query.Order("pooling_at ASC").Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *repo) Delete(id string) error {
	return r.DB.Where("id = ?", id).Delete(&domainorder.Order{}).Error
}

func (r *repo) Transaction(fn func(tx interfaceorder.RepoOrderTxInterface) error) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		return fn(&txRepo{db: tx})
	})
}

func (r *txRepo) CountByPoolingNumber(poolingNumber string, excludeID string) (int64, error) {
	var count int64
	query := r.db.Model(&domainorder.Order{}).Where("pooling_number = ?", poolingNumber)
	if strings.TrimSpace(excludeID) != "" {
		query = query.Where("id <> ?", excludeID)
	}
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *txRepo) HasInstallmentColumn() bool {
	return r.db.Migrator().HasColumn(&domainorder.Order{}, "installment")
}

func (r *txRepo) CreateOrder(order *domainorder.Order) error {
	query := r.db
	if !r.HasInstallmentColumn() {
		query = query.Omit("Installment")
	}
	return query.Create(order).Error
}

func (r *txRepo) SaveOrder(order *domainorder.Order) error {
	query := r.db
	if !r.HasInstallmentColumn() {
		query = query.Omit("Installment")
	}
	return query.Save(order).Error
}

func (r *txRepo) CreateAttempt(attempt *domainorder.OrderFinanceAttempt) error {
	return r.db.Create(attempt).Error
}

func (r *txRepo) SaveAttempt(attempt *domainorder.OrderFinanceAttempt) error {
	return r.db.Save(attempt).Error
}

func (r *txRepo) DeleteAttempt(attempt *domainorder.OrderFinanceAttempt) error {
	return r.db.Delete(attempt).Error
}
