package servicescrapesource

import (
	"strings"

	domainscrapesource "service-songket/internal/domain/scrapesource"
	"service-songket/internal/dto"
	interfacescrapesource "service-songket/internal/interfaces/scrapesource"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo interfacescrapesource.RepoScrapeSourceInterface
}

func NewScrapeSourceService(repo interfacescrapesource.RepoScrapeSourceInterface) interfacescrapesource.ServiceScrapeSourceInterface {
	return &Service{repo: repo}
}

func (s *Service) List(params filter.BaseParams) ([]domainscrapesource.ScrapeSource, int64, error) {
	return s.repo.GetAll(params)
}

func (s *Service) Create(req dto.ScrapeSourceRequest) (domainscrapesource.ScrapeSource, error) {
	row := domainscrapesource.ScrapeSource{
		Id:       utils.CreateUUID(),
		Name:     strings.TrimSpace(req.Name),
		URL:      strings.TrimSpace(req.URL),
		Type:     normalizeScrapeSourceType(req.Type),
		Category: strings.TrimSpace(req.Category),
		IsActive: req.IsActive,
	}

	if err := s.repo.Transaction(func(tx interfacescrapesource.RepoScrapeSourceTxInterface) error {
		if row.IsActive {
			if err := tx.DeactivateActiveByType(row.Type, ""); err != nil {
				return err
			}
		}
		return tx.Store(row)
	}); err != nil {
		return domainscrapesource.ScrapeSource{}, err
	}
	return row, nil
}

func (s *Service) Update(id string, req dto.ScrapeSourceRequest) (domainscrapesource.ScrapeSource, error) {
	row := domainscrapesource.ScrapeSource{
		Id:       strings.TrimSpace(id),
		Name:     strings.TrimSpace(req.Name),
		URL:      strings.TrimSpace(req.URL),
		Type:     normalizeScrapeSourceType(req.Type),
		Category: strings.TrimSpace(req.Category),
		IsActive: req.IsActive,
	}

	if err := s.repo.Transaction(func(tx interfacescrapesource.RepoScrapeSourceTxInterface) error {
		if row.IsActive {
			if err := tx.DeactivateActiveByType(row.Type, row.Id); err != nil {
				return err
			}
		}
		return tx.Update(row)
	}); err != nil {
		return domainscrapesource.ScrapeSource{}, err
	}
	return row, nil
}

func (s *Service) Delete(id string) error {
	return s.repo.Delete(strings.TrimSpace(id))
}

func normalizeScrapeSourceType(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "prices"
	}
	return trimmed
}
