package serviceinstallment

import (
	"context"
	"errors"
	"fmt"
	"strings"

	domaininstallment "service-songket/internal/domain/installment"
	"service-songket/internal/dto"
	interfaceinstallment "service-songket/internal/interfaces/installment"
	interfacemotor "service-songket/internal/interfaces/motor"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo      interfaceinstallment.RepoInstallmentInterface
	motorRepo interfacemotor.RepoMotorInterface
}

func NewInstallmentService(repo interfaceinstallment.RepoInstallmentInterface, motorRepo interfacemotor.RepoMotorInterface) *Service {
	return &Service{repo: repo, motorRepo: motorRepo}
}

func (s *Service) List(ctx context.Context, params filter.BaseParams) ([]domaininstallment.Installment, int64, error) {
	return s.repo.GetAll(ctx, params)
}

func (s *Service) GetByID(ctx context.Context, id string) (domaininstallment.Installment, error) {
	return s.repo.GetByIDWithMotorType(ctx, id)
}

func (s *Service) Create(ctx context.Context, req dto.InstallmentRequest) (domaininstallment.Installment, error) {
	motorTypeID := strings.TrimSpace(req.MotorTypeID)
	if motorTypeID == "" {
		return domaininstallment.Installment{}, fmt.Errorf("motor_type_id is required")
	}
	if req.Amount < 0 {
		return domaininstallment.Installment{}, fmt.Errorf("amount must be greater than or equal to 0")
	}

	if _, err := s.motorRepo.GetByID(ctx, motorTypeID); err != nil {
		return domaininstallment.Installment{}, fmt.Errorf("motor type not found")
	}

	_, err := s.repo.GetByMotorTypeID(ctx, motorTypeID)
	if err == nil {
		return domaininstallment.Installment{}, fmt.Errorf("installment for selected motor type already exists")
	}
	if err != nil && !errors.Is(err, sharedsvc.ErrRecordNotFound()) {
		return domaininstallment.Installment{}, err
	}

	row := domaininstallment.Installment{
		Id:          utils.CreateUUID(),
		MotorTypeID: motorTypeID,
		Amount:      req.Amount,
	}
	if err := s.repo.Store(ctx, row); err != nil {
		if sharedsvc.IsUniqueViolationError(err) {
			return domaininstallment.Installment{}, fmt.Errorf("installment for selected motor type already exists")
		}
		return domaininstallment.Installment{}, err
	}
	return s.repo.GetByIDWithMotorType(ctx, row.Id)
}

func (s *Service) Update(ctx context.Context, id string, req dto.InstallmentRequest) (domaininstallment.Installment, error) {
	normalizedID, err := sharedsvc.NormalizeRequiredUUID(id, "id")
	if err != nil {
		return domaininstallment.Installment{}, err
	}

	row, err := s.repo.GetByID(ctx, normalizedID)
	if err != nil {
		return domaininstallment.Installment{}, err
	}

	motorTypeID, err := sharedsvc.NormalizeRequiredUUID(req.MotorTypeID, "motor_type_id")
	if err != nil {
		return domaininstallment.Installment{}, err
	}
	if req.Amount < 0 {
		return domaininstallment.Installment{}, fmt.Errorf("amount must be greater than or equal to 0")
	}

	if _, err := s.motorRepo.GetByID(ctx, motorTypeID); err != nil {
		return domaininstallment.Installment{}, fmt.Errorf("motor type not found")
	}

	_, err = s.repo.GetDuplicateForUpdate(ctx, normalizedID, motorTypeID)
	if err == nil {
		return domaininstallment.Installment{}, fmt.Errorf("installment for selected motor type already exists")
	}
	if err != nil && !errors.Is(err, sharedsvc.ErrRecordNotFound()) {
		return domaininstallment.Installment{}, err
	}

	row.MotorTypeID = motorTypeID
	row.Amount = req.Amount
	if err := s.repo.Update(ctx, row); err != nil {
		if sharedsvc.IsUniqueViolationError(err) {
			return domaininstallment.Installment{}, fmt.Errorf("installment for selected motor type already exists")
		}
		return domaininstallment.Installment{}, err
	}
	return s.repo.GetByIDWithMotorType(ctx, row.Id)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
