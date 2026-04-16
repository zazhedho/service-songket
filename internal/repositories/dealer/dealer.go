package repositorydealer

import (
	"fmt"
	"strings"

	domaindealer "service-songket/internal/domain/dealer"
	interfacedealer "service-songket/internal/interfaces/dealer"
	repositorygeneric "service-songket/internal/repositories/generic"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domaindealer.Dealer]
}

func NewDealerRepo(db *gorm.DB) interfacedealer.RepoDealerInterface {
	return &repo{GenericRepository: repositorygeneric.New[domaindealer.Dealer](db)}
}

func (r *repo) GetAll(params filter.BaseParams) ([]domaindealer.Dealer, int64, error) {
	query := r.DB.Model(&domaindealer.Dealer{})

	if v, ok := params.Filters["province"]; ok {
		aliases := sharedsvc.ResolveProvinceAliases(r.DB, v)
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
