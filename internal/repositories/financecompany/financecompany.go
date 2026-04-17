package repositoryfinancecompany

import (
	"fmt"
	"strings"

	domainfinancecompany "service-songket/internal/domain/financecompany"
	interfacefinancecompany "service-songket/internal/interfaces/financecompany"
	interfacelocation "service-songket/internal/interfaces/location"
	repositorygeneric "service-songket/internal/repositories/generic"
	repositorylocation "service-songket/internal/repositories/location"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domainfinancecompany.FinanceCompany]
	locationRepo interfacelocation.RepoLocationInterface
}

func NewFinanceCompanyRepo(db *gorm.DB) interfacefinancecompany.RepoFinanceCompanyInterface {
	return &repo{
		GenericRepository: repositorygeneric.New[domainfinancecompany.FinanceCompany](db),
		locationRepo:      repositorylocation.NewLocationRepo(db),
	}
}

func (r *repo) GetAll(params filter.BaseParams) ([]domainfinancecompany.FinanceCompany, int64, error) {
	query := r.DB.Model(&domainfinancecompany.FinanceCompany{})

	if v, ok := params.Filters["province"]; ok {
		provinces, _ := r.locationRepo.ListProvinceCache()
		aliases := sharedsvc.ResolveProvinceAliases(v, provinces)
		query = sharedsvc.ApplyStringAliasesFilter(query, "province", aliases)
	}
	if v, ok := params.Filters["regency"]; ok {
		query = sharedsvc.ApplyStringAliasesFilter(query, "regency", []string{strings.TrimSpace(fmt.Sprint(v))})
	}
	if v, ok := params.Filters["district"]; ok {
		query = sharedsvc.ApplyStringAliasesFilter(query, "district", []string{strings.TrimSpace(fmt.Sprint(v))})
	}
	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(regency) LIKE ? OR LOWER(phone) LIKE ?", search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var companies []domainfinancecompany.FinanceCompany
	if err := query.Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&companies).Error; err != nil {
		return nil, 0, err
	}

	return companies, total, nil
}
