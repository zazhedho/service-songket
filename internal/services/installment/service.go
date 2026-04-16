package serviceinstallment

import (
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

func (s *Service) List(params filter.BaseParams) ([]domaininstallment.Installment, int64, error) {
	return s.repo.GetAll(params)
}

func (s *Service) GetByID(id string) (domaininstallment.Installment, error) {
	return s.repo.GetByIDWithMotorType(id)
}

func (s *Service) Create(req dto.InstallmentRequest) (domaininstallment.Installment, error) {
	motorTypeID := strings.TrimSpace(req.MotorTypeID)
	if motorTypeID == "" {
		return domaininstallment.Installment{}, fmt.Errorf("motor_type_id is required")
	}
	if req.Amount < 0 {
		return domaininstallment.Installment{}, fmt.Errorf("amount must be greater than or equal to 0")
	}

	if _, err := s.motorRepo.GetByID(motorTypeID); err != nil {
		return domaininstallment.Installment{}, fmt.Errorf("motor type not found")
	}

	_, err := s.repo.GetByMotorTypeID(motorTypeID)
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
	if err := s.repo.Store(row); err != nil {
		if sharedsvc.IsUniqueViolationError(err) {
			return domaininstallment.Installment{}, fmt.Errorf("installment for selected motor type already exists")
		}
		return domaininstallment.Installment{}, err
	}
	return s.repo.GetByIDWithMotorType(row.Id)
}

func (s *Service) Update(id string, req dto.InstallmentRequest) (domaininstallment.Installment, error) {
	normalizedID, err := sharedsvc.NormalizeRequiredUUID(id, "id")
	if err != nil {
		return domaininstallment.Installment{}, err
	}

	row, err := s.repo.GetByID(normalizedID)
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

	if _, err := s.motorRepo.GetByID(motorTypeID); err != nil {
		return domaininstallment.Installment{}, fmt.Errorf("motor type not found")
	}

	_, err = s.repo.GetDuplicateForUpdate(normalizedID, motorTypeID)
	if err == nil {
		return domaininstallment.Installment{}, fmt.Errorf("installment for selected motor type already exists")
	}
	if err != nil && !errors.Is(err, sharedsvc.ErrRecordNotFound()) {
		return domaininstallment.Installment{}, err
	}

	row.MotorTypeID = motorTypeID
	row.Amount = req.Amount
	if err := s.repo.Update(row); err != nil {
		if sharedsvc.IsUniqueViolationError(err) {
			return domaininstallment.Installment{}, fmt.Errorf("installment for selected motor type already exists")
		}
		return domaininstallment.Installment{}, err
	}
	return s.repo.GetByIDWithMotorType(row.Id)
}

func (s *Service) Delete(id string) error {
	return s.repo.Delete(id)
}
