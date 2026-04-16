package repositorynetincome

import (
	"strings"

	domainnetincome "service-songket/internal/domain/netincome"
	interfacenetincome "service-songket/internal/interfaces/netincome"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domainnetincome.NetIncome]
}

func NewNetIncomeRepo(db *gorm.DB) interfacenetincome.RepoNetIncomeInterface {
	return &repo{GenericRepository: repositorygeneric.New[domainnetincome.NetIncome](db)}
}

func (r *repo) GetAll(params filter.BaseParams) ([]domainnetincome.NetIncome, int64, error) {
	query := r.DB.Model(&domainnetincome.NetIncome{}).
		Joins("LEFT JOIN jobs ON jobs.id = job_net_incomes.job_id")

	if v, ok := params.Filters["job_id"]; ok {
		query = query.Where("job_net_incomes.job_id = ?", v)
	}
	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(jobs.name) LIKE ?", search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "job_net_incomes." + orderBy
	}

	var rows []domainnetincome.NetIncome
	if err := query.Preload("Job").
		Order(orderBy + " " + params.OrderDirection).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	return rows, total, nil
}
