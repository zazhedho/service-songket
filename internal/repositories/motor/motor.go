package repositorymotor

import (
	"strings"

	domaininstallment "service-songket/internal/domain/installment"
	domainmotor "service-songket/internal/domain/motor"
	domainorder "service-songket/internal/domain/order"
	interfacemotor "service-songket/internal/interfaces/motor"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domainmotor.MotorType]
}

func NewMotorRepo(db *gorm.DB) interfacemotor.RepoMotorInterface {
	return &repo{GenericRepository: repositorygeneric.New[domainmotor.MotorType](db)}
}

func (r *repo) GetAll(params filter.BaseParams) ([]domainmotor.MotorType, int64, error) {
	return r.GenericRepository.GetAll(params, repositorygeneric.QueryOptions{
		Search: repositorygeneric.BuildSearchFunc(
			"name",
			"brand",
			"model",
			"variant_type",
			"province_name",
			"regency_name",
		),
		AllowedFilters: []string{"province_code", "regency_code"},
		AllowedOrderColumns: []string{
			"id",
			"name",
			"brand",
			"model",
			"variant_type",
			"otr",
			"province_code",
			"province_name",
			"regency_code",
			"regency_name",
			"created_at",
			"updated_at",
		},
		DefaultOrders: []string{"created_at desc"},
	})
}

func (r *repo) GetByUniqueKey(name, brand, model, variantType, provinceCode, regencyCode string) (domainmotor.MotorType, error) {
	var ret domainmotor.MotorType
	err := r.DB.
		Where(
			"LOWER(name) = LOWER(?) AND LOWER(brand) = LOWER(?) AND LOWER(model) = LOWER(?) AND LOWER(variant_type) = LOWER(?) AND province_code = ? AND regency_code = ?",
			strings.TrimSpace(name),
			strings.TrimSpace(brand),
			strings.TrimSpace(model),
			strings.TrimSpace(variantType),
			strings.TrimSpace(provinceCode),
			strings.TrimSpace(regencyCode),
		).
		First(&ret).Error
	return ret, err
}

func (r *repo) GetDuplicateForUpdate(id, name, brand, model, variantType, provinceCode, regencyCode string) (domainmotor.MotorType, error) {
	var ret domainmotor.MotorType
	err := r.DB.
		Where(
			"id <> ? AND LOWER(name) = LOWER(?) AND LOWER(brand) = LOWER(?) AND LOWER(model) = LOWER(?) AND LOWER(variant_type) = LOWER(?) AND province_code = ? AND regency_code = ?",
			id,
			strings.TrimSpace(name),
			strings.TrimSpace(brand),
			strings.TrimSpace(model),
			strings.TrimSpace(variantType),
			strings.TrimSpace(provinceCode),
			strings.TrimSpace(regencyCode),
		).
		First(&ret).Error
	return ret, err
}

func (r *repo) CountOrdersByMotorType(id string) (int64, error) {
	var count int64
	err := r.DB.Model(&domainorder.Order{}).Where("motor_type_id = ?", id).Count(&count).Error
	return count, err
}

func (r *repo) CountInstallmentsByMotorType(id string) (int64, error) {
	var count int64
	err := r.DB.Model(&domaininstallment.Installment{}).Where("motor_type_id = ?", id).Count(&count).Error
	return count, err
}
