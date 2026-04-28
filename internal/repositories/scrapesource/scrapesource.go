package repositoryscrapesource

import (
	"fmt"
	"strings"

	domainscrapesource "service-songket/internal/domain/scrapesource"
	interfacescrapesource "service-songket/internal/interfaces/scrapesource"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	db *gorm.DB
}

type txRepo struct {
	db *gorm.DB
}

func NewScrapeSourceRepo(db *gorm.DB) interfacescrapesource.RepoScrapeSourceInterface {
	return &repo{db: db}
}

func (r *repo) GetAll(params filter.BaseParams) ([]domainscrapesource.ScrapeSource, int64, error) {
	query := r.db.Model(&domainscrapesource.ScrapeSource{})

	if v, ok := params.Filters["type"]; ok {
		query = query.Where("type = ?", v)
	}
	if v, ok := params.Filters["category"]; ok {
		query = query.Where("category = ?", v)
	}
	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(url) LIKE ? OR LOWER(category) LIKE ?", search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	rows := make([]domainscrapesource.ScrapeSource, 0)
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *repo) Store(data domainscrapesource.ScrapeSource) error {
	return r.db.Create(&data).Error
}

func (r *repo) Update(data domainscrapesource.ScrapeSource) error {
	return r.db.Model(&domainscrapesource.ScrapeSource{}).Where("id = ?", data.Id).Updates(data).Error
}

func (r *repo) Delete(id string) error {
	return r.db.Delete(&domainscrapesource.ScrapeSource{}, "id = ?", id).Error
}

func (r *repo) DeactivateActiveByType(sourceType, excludeID string) error {
	query := r.db.Model(&domainscrapesource.ScrapeSource{}).Where("type = ?", sourceType)
	if strings.TrimSpace(excludeID) != "" {
		query = query.Where("id <> ?", excludeID)
	}
	return query.Update("is_active", false).Error
}

func (r *repo) Transaction(fc func(repo interfacescrapesource.RepoScrapeSourceTxInterface) error) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return fc(&txRepo{db: tx})
	})
}

func (r *txRepo) Store(data domainscrapesource.ScrapeSource) error {
	return r.db.Create(&data).Error
}

func (r *txRepo) Update(data domainscrapesource.ScrapeSource) error {
	return r.db.Model(&domainscrapesource.ScrapeSource{}).Where("id = ?", data.Id).Updates(data).Error
}

func (r *txRepo) DeactivateActiveByType(sourceType, excludeID string) error {
	query := r.db.Model(&domainscrapesource.ScrapeSource{}).Where("type = ?", sourceType)
	if strings.TrimSpace(excludeID) != "" {
		query = query.Where("id <> ?", excludeID)
	}
	return query.Update("is_active", false).Error
}

func (r *txRepo) Delete(id string) error {
	return r.db.Delete(&domainscrapesource.ScrapeSource{}, "id = ?", id).Error
}
