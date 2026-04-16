package repositorylookup

import (
	"time"

	domaindealer "service-songket/internal/domain/dealer"
	domainfinancecompany "service-songket/internal/domain/financecompany"
	domaininstallment "service-songket/internal/domain/installment"
	domainjob "service-songket/internal/domain/job"
	domainmotor "service-songket/internal/domain/motor"
	interfacelookup "service-songket/internal/interfaces/lookup"

	"gorm.io/gorm"
)

type repo struct {
	db *gorm.DB
}

func NewLookupRepo(db *gorm.DB) interfacelookup.RepoLookupInterface {
	return &repo{db: db}
}

func (r *repo) ListFinanceCompanies() ([]domainfinancecompany.FinanceCompany, error) {
	rows := make([]domainfinancecompany.FinanceCompany, 0)
	if err := r.db.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListMotorTypes() ([]domainmotor.MotorType, error) {
	rows := make([]domainmotor.MotorType, 0)
	if err := r.db.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListInstallments() ([]domaininstallment.Installment, error) {
	rows := make([]domaininstallment.Installment, 0)
	if err := r.db.Preload("MotorType").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListJobs() ([]domainjob.Job, error) {
	rows := make([]domainjob.Job, 0)
	if err := r.db.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListDealers() ([]domaindealer.Dealer, error) {
	rows := make([]domaindealer.Dealer, 0)
	if err := r.db.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListOrderYears() ([]int, error) {
	type yearRow struct {
		Year int `gorm:"column:year"`
	}
	yearRows := make([]yearRow, 0)
	if err := r.db.
		Table("orders").
		Select("DISTINCT EXTRACT(YEAR FROM pooling_at)::int AS year").
		Where("deleted_at IS NULL").
		Order("year DESC").
		Scan(&yearRows).Error; err != nil {
		return nil, err
	}

	years := make([]int, 0, len(yearRows))
	for _, row := range yearRows {
		if row.Year > 0 {
			years = append(years, row.Year)
		}
	}
	if len(years) == 0 {
		years = append(years, time.Now().Year())
	}
	return years, nil
}
