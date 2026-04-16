package servicejob

import (
	"fmt"
	"strings"

	domainjob "service-songket/internal/domain/job"
	"service-songket/internal/dto"
	interfacejob "service-songket/internal/interfaces/job"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo interfacejob.RepoJobInterface
}

func NewJobService(repo interfacejob.RepoJobInterface) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(params filter.BaseParams) ([]domainjob.JobItem, int64, error) {
	jobs, total, err := s.repo.GetAll(params)
	if err != nil {
		return nil, 0, err
	}

	items := make([]domainjob.JobItem, 0, len(jobs))
	for _, job := range jobs {
		items = append(items, domainjob.JobItem{
			Id:        job.Id,
			Name:      job.Name,
			CreatedAt: job.CreatedAt,
			UpdatedAt: job.UpdatedAt,
		})
	}
	return items, total, nil
}

func (s *Service) GetByID(id string) (domainjob.JobItem, error) {
	job, err := s.repo.GetByID(id)
	if err != nil {
		return domainjob.JobItem{}, err
	}
	return domainjob.JobItem{
		Id:        job.Id,
		Name:      job.Name,
		CreatedAt: job.CreatedAt,
		UpdatedAt: job.UpdatedAt,
	}, nil
}

func (s *Service) Create(req dto.JobRequest) (domainjob.JobItem, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return domainjob.JobItem{}, fmt.Errorf("name is required")
	}

	job := domainjob.Job{
		Id:   utils.CreateUUID(),
		Name: name,
	}
	if err := s.repo.Store(job); err != nil {
		return domainjob.JobItem{}, err
	}

	return domainjob.JobItem{
		Id:        job.Id,
		Name:      job.Name,
		CreatedAt: job.CreatedAt,
		UpdatedAt: job.UpdatedAt,
	}, nil
}

func (s *Service) Update(id string, req dto.JobRequest) (domainjob.JobItem, error) {
	normalizedID, err := sharedsvc.NormalizeRequiredUUID(id, "id")
	if err != nil {
		return domainjob.JobItem{}, err
	}

	job, err := s.repo.GetByID(normalizedID)
	if err != nil {
		return domainjob.JobItem{}, err
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return domainjob.JobItem{}, fmt.Errorf("name is required")
	}

	job.Name = name
	if err := s.repo.Update(job); err != nil {
		return domainjob.JobItem{}, err
	}

	return domainjob.JobItem{
		Id:        job.Id,
		Name:      job.Name,
		CreatedAt: job.CreatedAt,
		UpdatedAt: job.UpdatedAt,
	}, nil
}

func (s *Service) Delete(id string) error {
	return s.repo.Delete(id)
}
