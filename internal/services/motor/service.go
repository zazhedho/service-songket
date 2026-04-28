package servicemotor

import (
	"context"
	"errors"
	"fmt"
	"strings"

	domainmotor "service-songket/internal/domain/motor"
	"service-songket/internal/dto"
	interfacemotor "service-songket/internal/interfaces/motor"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo interfacemotor.RepoMotorInterface
}

func NewMotorService(repo interfacemotor.RepoMotorInterface) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, params filter.BaseParams) ([]domainmotor.MotorType, int64, error) {
	return s.repo.GetAll(ctx, params)
}

func (s *Service) GetByID(ctx context.Context, id string) (domainmotor.MotorType, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, req dto.MotorTypeRequest) (domainmotor.MotorType, error) {
	name := strings.TrimSpace(req.Name)
	brand := strings.TrimSpace(req.Brand)
	model := strings.TrimSpace(req.Model)
	variantType := strings.TrimSpace(req.Type)
	provinceCode := strings.TrimSpace(req.ProvinceCode)
	provinceName := strings.TrimSpace(req.ProvinceName)
	regencyCode := strings.TrimSpace(req.RegencyCode)
	regencyName := strings.TrimSpace(req.RegencyName)

	if name == "" || brand == "" || model == "" || variantType == "" {
		return domainmotor.MotorType{}, fmt.Errorf("name, brand, model, and type are required")
	}
	if provinceCode == "" || regencyCode == "" {
		return domainmotor.MotorType{}, fmt.Errorf("province_code and regency_code are required")
	}
	if req.OTR < 0 {
		return domainmotor.MotorType{}, fmt.Errorf("otr must be greater than or equal to 0")
	}

	_, err := s.repo.GetByUniqueKey(ctx, name, brand, model, variantType, provinceCode, regencyCode)
	if err == nil {
		return domainmotor.MotorType{}, fmt.Errorf("motor type already exists for selected area")
	}
	if err != nil && !errors.Is(err, sharedsvc.ErrRecordNotFound()) {
		return domainmotor.MotorType{}, err
	}

	row := domainmotor.MotorType{
		Id:           utils.CreateUUID(),
		Name:         name,
		Brand:        brand,
		Model:        model,
		VariantType:  variantType,
		OTR:          req.OTR,
		ProvinceCode: provinceCode,
		ProvinceName: provinceName,
		RegencyCode:  regencyCode,
		RegencyName:  regencyName,
	}
	if err := s.repo.Store(ctx, row); err != nil {
		if sharedsvc.IsUniqueViolationError(err) {
			return domainmotor.MotorType{}, fmt.Errorf("motor type already exists for selected area")
		}
		return domainmotor.MotorType{}, err
	}
	return row, nil
}

func (s *Service) Update(ctx context.Context, id string, req dto.MotorTypeRequest) (domainmotor.MotorType, error) {
	normalizedID, err := sharedsvc.NormalizeRequiredUUID(id, "id")
	if err != nil {
		return domainmotor.MotorType{}, err
	}

	row, err := s.repo.GetByID(ctx, normalizedID)
	if err != nil {
		return domainmotor.MotorType{}, err
	}

	name := strings.TrimSpace(req.Name)
	brand := strings.TrimSpace(req.Brand)
	model := strings.TrimSpace(req.Model)
	variantType := strings.TrimSpace(req.Type)
	provinceCode := strings.TrimSpace(req.ProvinceCode)
	provinceName := strings.TrimSpace(req.ProvinceName)
	regencyCode := strings.TrimSpace(req.RegencyCode)
	regencyName := strings.TrimSpace(req.RegencyName)

	if name == "" || brand == "" || model == "" || variantType == "" {
		return domainmotor.MotorType{}, fmt.Errorf("name, brand, model, and type are required")
	}
	if provinceCode == "" || regencyCode == "" {
		return domainmotor.MotorType{}, fmt.Errorf("province_code and regency_code are required")
	}
	if req.OTR < 0 {
		return domainmotor.MotorType{}, fmt.Errorf("otr must be greater than or equal to 0")
	}

	_, err = s.repo.GetDuplicateForUpdate(ctx, normalizedID, name, brand, model, variantType, provinceCode, regencyCode)
	if err == nil {
		return domainmotor.MotorType{}, fmt.Errorf("motor type already exists for selected area")
	}
	if err != nil && !errors.Is(err, sharedsvc.ErrRecordNotFound()) {
		return domainmotor.MotorType{}, err
	}

	row.Name = name
	row.Brand = brand
	row.Model = model
	row.VariantType = variantType
	row.OTR = req.OTR
	row.ProvinceCode = provinceCode
	row.ProvinceName = provinceName
	row.RegencyCode = regencyCode
	row.RegencyName = regencyName
	if err := s.repo.Update(ctx, row); err != nil {
		if sharedsvc.IsUniqueViolationError(err) {
			return domainmotor.MotorType{}, fmt.Errorf("motor type already exists for selected area")
		}
		return domainmotor.MotorType{}, err
	}
	return row, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	orderCount, err := s.repo.CountOrdersByMotorType(ctx, id)
	if err != nil {
		return err
	}
	if orderCount > 0 {
		return fmt.Errorf("motor type is already used by order data")
	}

	installmentCount, err := s.repo.CountInstallmentsByMotorType(ctx, id)
	if err != nil {
		return err
	}
	if installmentCount > 0 {
		return fmt.Errorf("motor type is already used by installment data")
	}

	return s.repo.Delete(ctx, id)
}
