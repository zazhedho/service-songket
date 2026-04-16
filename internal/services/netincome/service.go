package servicenetincome

import (
	"fmt"
	"strings"

	domainnetincome "service-songket/internal/domain/netincome"
	"service-songket/internal/dto"
	interfacejob "service-songket/internal/interfaces/job"
	interfacenetincome "service-songket/internal/interfaces/netincome"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo    interfacenetincome.RepoNetIncomeInterface
	jobRepo interfacejob.RepoJobInterface
}

func NewNetIncomeService(repo interfacenetincome.RepoNetIncomeInterface, jobRepo interfacejob.RepoJobInterface) *Service {
	return &Service{repo: repo, jobRepo: jobRepo}
}

func (s *Service) List(params filter.BaseParams) ([]domainnetincome.NetIncomeItem, int64, error) {
	rows, total, err := s.repo.GetAll(params)
	if err != nil {
		return nil, 0, err
	}
	items := make([]domainnetincome.NetIncomeItem, 0, len(rows))
	for _, row := range rows {
		jobName := "-"
		if row.Job != nil && strings.TrimSpace(row.Job.Name) != "" {
			jobName = row.Job.Name
		}
		items = append(items, domainnetincome.NetIncomeItem{
			Id:            row.Id,
			JobID:         row.JobID,
			JobName:       jobName,
			NetIncome:     row.NetIncome,
			AreaNetIncome: sharedsvc.DecodeAreaNetIncome(row.AreaNetIncome),
			CreatedAt:     row.CreatedAt,
			UpdatedAt:     row.UpdatedAt,
		})
	}
	return items, total, nil
}

func (s *Service) GetByID(id string) (domainnetincome.NetIncomeItem, error) {
	row, err := s.repo.GetByID(id)
	if err != nil {
		return domainnetincome.NetIncomeItem{}, err
	}
	jobName := "-"
	if row.Job != nil && strings.TrimSpace(row.Job.Name) != "" {
		jobName = row.Job.Name
	}
	return domainnetincome.NetIncomeItem{
		Id:            row.Id,
		JobID:         row.JobID,
		JobName:       jobName,
		NetIncome:     row.NetIncome,
		AreaNetIncome: sharedsvc.DecodeAreaNetIncome(row.AreaNetIncome),
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

func (s *Service) Create(req dto.NetIncomeRequest) (domainnetincome.NetIncomeItem, error) {
	if req.NetIncome < 0 {
		return domainnetincome.NetIncomeItem{}, fmt.Errorf("net_income must be greater than or equal to 0")
	}

	areas := sharedsvc.NormalizeAreaNetIncome(req.AreaNetIncome)
	if len(areas) == 0 {
		return domainnetincome.NetIncomeItem{}, fmt.Errorf("area_net_income must contain at least one valid province and regency")
	}

	job, err := s.jobRepo.GetByID(req.JobID)
	if err != nil {
		return domainnetincome.NetIncomeItem{}, fmt.Errorf("job not found")
	}

	row := domainnetincome.NetIncome{
		Id:            utils.CreateUUID(),
		JobID:         req.JobID,
		NetIncome:     req.NetIncome,
		AreaNetIncome: sharedsvc.EncodeAreaNetIncome(areas),
	}
	if err := s.repo.Store(row); err != nil {
		return domainnetincome.NetIncomeItem{}, err
	}

	return domainnetincome.NetIncomeItem{
		Id:            row.Id,
		JobID:         row.JobID,
		JobName:       job.Name,
		NetIncome:     row.NetIncome,
		AreaNetIncome: areas,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

func (s *Service) Update(id string, req dto.NetIncomeRequest) (domainnetincome.NetIncomeItem, error) {
	normalizedID, err := sharedsvc.NormalizeRequiredUUID(id, "id")
	if err != nil {
		return domainnetincome.NetIncomeItem{}, err
	}

	normalizedJobID, err := sharedsvc.NormalizeRequiredUUID(req.JobID, "job_id")
	if err != nil {
		return domainnetincome.NetIncomeItem{}, err
	}

	row, err := s.repo.GetByID(normalizedID)
	if err != nil {
		return domainnetincome.NetIncomeItem{}, err
	}

	if req.NetIncome < 0 {
		return domainnetincome.NetIncomeItem{}, fmt.Errorf("net_income must be greater than or equal to 0")
	}

	areas := sharedsvc.NormalizeAreaNetIncome(req.AreaNetIncome)
	if len(areas) == 0 {
		return domainnetincome.NetIncomeItem{}, fmt.Errorf("area_net_income must contain at least one valid province and regency")
	}

	job, err := s.jobRepo.GetByID(normalizedJobID)
	if err != nil {
		return domainnetincome.NetIncomeItem{}, fmt.Errorf("job not found")
	}

	row.JobID = normalizedJobID
	row.NetIncome = req.NetIncome
	row.AreaNetIncome = sharedsvc.EncodeAreaNetIncome(areas)
	if err := s.repo.Update(row); err != nil {
		return domainnetincome.NetIncomeItem{}, err
	}

	return domainnetincome.NetIncomeItem{
		Id:            row.Id,
		JobID:         row.JobID,
		JobName:       job.Name,
		NetIncome:     row.NetIncome,
		AreaNetIncome: areas,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

func (s *Service) Delete(id string) error {
	return s.repo.Delete(id)
}
