package interfacenews

import (
	"context"

	domainnews "service-songket/internal/domain/news"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceNewsInterface interface {
	UpsertSource(req dto.NewsSourceRequest) (domainnews.NewsSource, error)
	ListSources(params filter.BaseParams) ([]domainnews.NewsSource, int64, error)
	Latest(category string) (map[string]domainnews.NewsItem, error)
	ListItems(category string, params filter.BaseParams) ([]domainnews.NewsItem, int64, error)
	DeleteItem(id string) error
	Scrape(ctx context.Context, urls []string) ([]domainnews.NewsScrapedArticle, error)
	Import(items []domainnews.NewsScrapedArticle) ([]domainnews.NewsItem, error)
	AutoImport(ctx context.Context) (int, int, error)
}
