package repositoryinstallment

import (
	domaininstallment "service-songket/internal/domain/installment"
	interfaceinstallment "service-songket/internal/interfaces/installment"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domaininstallment.Installment]
}

func NewInstallmentRepo(db *gorm.DB) interfaceinstallment.RepoInstallmentInterface {
	return &repo{GenericRepository: repositorygeneric.New[domaininstallment.Installment](db)}
}

func (r *repo) GetAll(params filter.BaseParams) ([]domaininstallment.Installment, int64, error) {
	query := r.DB.Model(&domaininstallment.Installment{}).
		Joins("LEFT JOIN motor_types ON motor_types.id = installments.motor_type_id")

	if v, ok := params.Filters["motor_type_id"]; ok {
		query = query.Where("installments.motor_type_id = ?", v)
	}
	if v, ok := params.Filters["province_code"]; ok {
		query = query.Where("motor_types.province_code = ?", v)
	}
	if v, ok := params.Filters["regency_code"]; ok {
		query = query.Where("motor_types.regency_code = ?", v)
	}

	if params.Search != "" {
		query = query.Where(
			"LOWER(motor_types.name) LIKE LOWER(?) OR LOWER(motor_types.brand) LIKE LOWER(?) OR LOWER(motor_types.model) LIKE LOWER(?) OR LOWER(motor_types.variant_type) LIKE LOWER(?)",
			"%"+params.Search+"%",
			"%"+params.Search+"%",
			"%"+params.Search+"%",
			"%"+params.Search+"%",
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []domaininstallment.Installment
	if err := query.Preload("MotorType").
		Order("installments." + params.OrderBy + " " + params.OrderDirection).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	return rows, total, nil
}

func (r *repo) GetByMotorTypeID(motorTypeID string) (domaininstallment.Installment, error) {
	return r.GetOneByField("motor_type_id", motorTypeID)
}

func (r *repo) GetDuplicateForUpdate(id, motorTypeID string) (domaininstallment.Installment, error) {
	var ret domaininstallment.Installment
	err := r.DB.Where("id <> ? AND motor_type_id = ?", id, motorTypeID).First(&ret).Error
	return ret, err
}

func (r *repo) GetByIDWithMotorType(id string) (domaininstallment.Installment, error) {
	var ret domaininstallment.Installment
	err := r.DB.Preload("MotorType").Where("id = ?", id).First(&ret).Error
	return ret, err
}
