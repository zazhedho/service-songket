package repositorynews

import (
	"fmt"
	"strings"

	domainnews "service-songket/internal/domain/news"
	domainscrapesource "service-songket/internal/domain/scrapesource"
	interfacenews "service-songket/internal/interfaces/news"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	db *gorm.DB
}

func NewNewsRepo(db *gorm.DB) interfacenews.RepoNewsInterface {
	return &repo{db: db}
}

func (r *repo) StoreSource(data domainnews.NewsSource) error {
	return r.db.Create(&data).Error
}

func (r *repo) GetSourceByName(name string) (domainnews.NewsSource, error) {
	var ret domainnews.NewsSource
	if err := r.db.Where("name = ?", name).First(&ret).Error; err != nil {
		return domainnews.NewsSource{}, err
	}
	return ret, nil
}

func (r *repo) UpdateSource(data domainnews.NewsSource) error {
	return r.db.Save(&data).Error
}

func (r *repo) GetAllSources(params filter.BaseParams) ([]domainnews.NewsSource, int64, error) {
	query := r.db.Model(&domainnews.NewsSource{})

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

	var rows []domainnews.NewsSource
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *repo) GetSources(category string) ([]domainnews.NewsSource, error) {
	rows := make([]domainnews.NewsSource, 0)
	query := r.db.Model(&domainnews.NewsSource{})
	if strings.TrimSpace(category) != "" {
		query = query.Where("category = ?", category)
	}
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) GetLatestItemBySource(sourceID string) (domainnews.NewsItem, error) {
	var ret domainnews.NewsItem
	if err := r.db.Where("source_id = ?", sourceID).Order("published_at DESC").First(&ret).Error; err != nil {
		return domainnews.NewsItem{}, err
	}
	return ret, nil
}

func (r *repo) GetAllItems(category string, params filter.BaseParams) ([]domainnews.NewsItem, int64, error) {
	query := r.db.Model(&domainnews.NewsItem{})

	if strings.TrimSpace(category) != "" {
		query = query.Where("category = ?", category)
	}
	if v, ok := params.Filters["source_id"]; ok {
		query = query.Where("source_id = ?", v)
	}
	if v, ok := params.Filters["source_name"]; ok {
		query = query.Where("source_name = ?", v)
	}
	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where(
			"LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(source_name) LIKE ? OR LOWER(url) LIKE ?",
			search, search, search, search,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	rows := make([]domainnews.NewsItem, 0)
	if err := query.
		Preload("Source").
		Order("news_items.published_at DESC").
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *repo) DeleteItem(id string) error {
	return r.db.Delete(&domainnews.NewsItem{}, "id = ?", id).Error
}

func (r *repo) GetSourceByURLCandidates(urls []string) (domainnews.NewsSource, error) {
	candidates := compactUniqueStrings(urls)
	if len(candidates) == 0 {
		return domainnews.NewsSource{}, gorm.ErrRecordNotFound
	}
	var ret domainnews.NewsSource
	if err := r.db.Where("url IN ?", candidates).First(&ret).Error; err != nil {
		return domainnews.NewsSource{}, err
	}
	return ret, nil
}

func (r *repo) UpdateSourceFields(id string, updates map[string]interface{}) error {
	return r.db.Model(&domainnews.NewsSource{}).Where("id = ?", id).Updates(updates).Error
}

func (r *repo) StoreItem(data domainnews.NewsItem) error {
	return r.db.Create(&data).Error
}

func (r *repo) GetItemByURLCandidates(urls []string) (domainnews.NewsItem, error) {
	candidates := compactUniqueStrings(urls)
	if len(candidates) == 0 {
		return domainnews.NewsItem{}, gorm.ErrRecordNotFound
	}
	var ret domainnews.NewsItem
	if err := r.db.Where("url IN ?", candidates).Order("created_at DESC").First(&ret).Error; err != nil {
		return domainnews.NewsItem{}, err
	}
	return ret, nil
}

func (r *repo) ListActiveScrapeSourceURLs(sourceType string) ([]string, error) {
	var sources []domainscrapesource.ScrapeSource
	if err := r.db.Where("is_active = ? AND type = ?", true, sourceType).Find(&sources).Error; err != nil {
		return nil, err
	}
	urls := make([]string, 0, len(sources))
	for _, src := range sources {
		if trimmed := strings.TrimSpace(src.URL); trimmed != "" {
			urls = append(urls, trimmed)
		}
	}
	return urls, nil
}

func compactUniqueStrings(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}
