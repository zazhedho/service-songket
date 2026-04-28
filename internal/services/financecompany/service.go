package servicefinancecompany

import (
	"context"
	"strings"

	domainfinancecompany "service-songket/internal/domain/financecompany"
	"service-songket/internal/dto"
	interfacefinancecompany "service-songket/internal/interfaces/financecompany"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo interfacefinancecompany.RepoFinanceCompanyInterface
}

func NewFinanceCompanyService(repo interfacefinancecompany.RepoFinanceCompanyInterface) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, params filter.BaseParams) ([]domainfinancecompany.FinanceCompany, int64, error) {
	return s.repo.GetAll(ctx, params)
}

func (s *Service) Create(ctx context.Context, req dto.FinanceCompanyRequest) (domainfinancecompany.FinanceCompany, error) {
	fc := domainfinancecompany.FinanceCompany{
		Id:       utils.CreateUUID(),
		Name:     strings.TrimSpace(req.Name),
		Province: strings.TrimSpace(req.Province),
		Regency:  strings.TrimSpace(req.Regency),
		District: strings.TrimSpace(req.District),
		Village:  strings.TrimSpace(req.Village),
		Address:  strings.TrimSpace(req.Address),
		Phone:    strings.TrimSpace(req.Phone),
	}
	if err := s.repo.Store(ctx, fc); err != nil {
		return domainfinancecompany.FinanceCompany{}, err
	}
	return fc, nil
}

func (s *Service) Update(ctx context.Context, id string, req dto.FinanceCompanyRequest) (domainfinancecompany.FinanceCompany, error) {
	normalizedID, err := sharedsvc.NormalizeRequiredUUID(id, "id")
	if err != nil {
		return domainfinancecompany.FinanceCompany{}, err
	}

	fc, err := s.repo.GetByID(ctx, normalizedID)
	if err != nil {
		return domainfinancecompany.FinanceCompany{}, err
	}

	fc.Name = strings.TrimSpace(req.Name)
	fc.Province = strings.TrimSpace(req.Province)
	fc.Regency = strings.TrimSpace(req.Regency)
	fc.District = strings.TrimSpace(req.District)
	fc.Village = strings.TrimSpace(req.Village)
	fc.Address = strings.TrimSpace(req.Address)
	fc.Phone = strings.TrimSpace(req.Phone)

	if err := s.repo.Update(ctx, fc); err != nil {
		return domainfinancecompany.FinanceCompany{}, err
	}
	return fc, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
