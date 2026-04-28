package repositorydealer

import (
	"context"
	"fmt"
	"strings"

	domaindealer "service-songket/internal/domain/dealer"
	interfacedealer "service-songket/internal/interfaces/dealer"
	interfacelocation "service-songket/internal/interfaces/location"
	repositorygeneric "service-songket/internal/repositories/generic"
	repositorylocation "service-songket/internal/repositories/location"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domaindealer.Dealer]
	locationRepo interfacelocation.RepoLocationInterface
}

func NewDealerRepo(db *gorm.DB) interfacedealer.RepoDealerInterface {
	return &repo{
		GenericRepository: repositorygeneric.New[domaindealer.Dealer](db),
		locationRepo:      repositorylocation.NewLocationRepo(db),
	}
}

func (r *repo) GetAll(ctx context.Context, params filter.BaseParams) ([]domaindealer.Dealer, int64, error) {
	query := r.DB.WithContext(ctx).Model(&domaindealer.Dealer{})

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

	var dealers []domaindealer.Dealer
	if err := query.Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&dealers).Error; err != nil {
		return nil, 0, err
	}

	return dealers, total, nil
}
