package servicedealer

import (
	"context"
	"strings"

	domaindealer "service-songket/internal/domain/dealer"
	"service-songket/internal/dto"
	interfacedealer "service-songket/internal/interfaces/dealer"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo interfacedealer.RepoDealerInterface
}

func NewDealerService(repo interfacedealer.RepoDealerInterface) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, params filter.BaseParams) ([]domaindealer.Dealer, int64, error) {
	return s.repo.GetAll(ctx, params)
}

func (s *Service) Create(ctx context.Context, req dto.DealerRequest) (domaindealer.Dealer, error) {
	dealer := domaindealer.Dealer{
		Id:        utils.CreateUUID(),
		Name:      strings.TrimSpace(req.Name),
		Regency:   strings.TrimSpace(req.Regency),
		Province:  strings.TrimSpace(req.Province),
		District:  strings.TrimSpace(req.District),
		Village:   strings.TrimSpace(req.Village),
		Phone:     strings.TrimSpace(req.Phone),
		Address:   strings.TrimSpace(req.Address),
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
	}
	if err := s.repo.Store(ctx, dealer); err != nil {
		return domaindealer.Dealer{}, err
	}
	return dealer, nil
}

func (s *Service) Update(ctx context.Context, id string, req dto.DealerRequest) (domaindealer.Dealer, error) {
	normalizedID, err := sharedsvc.NormalizeRequiredUUID(id, "id")
	if err != nil {
		return domaindealer.Dealer{}, err
	}

	dealer, err := s.repo.GetByID(ctx, normalizedID)
	if err != nil {
		return domaindealer.Dealer{}, err
	}

	dealer.Name = strings.TrimSpace(req.Name)
	dealer.Regency = strings.TrimSpace(req.Regency)
	dealer.Province = strings.TrimSpace(req.Province)
	dealer.District = strings.TrimSpace(req.District)
	dealer.Village = strings.TrimSpace(req.Village)
	dealer.Phone = strings.TrimSpace(req.Phone)
	dealer.Address = strings.TrimSpace(req.Address)
	dealer.Latitude = req.Latitude
	dealer.Longitude = req.Longitude

	if err := s.repo.Update(ctx, dealer); err != nil {
		return domaindealer.Dealer{}, err
	}
	return dealer, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
