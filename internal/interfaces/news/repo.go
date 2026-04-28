package interfacenews

import (
	domainnews "service-songket/internal/domain/news"
	"service-songket/pkg/filter"
)

type RepoNewsInterface interface {
	StoreSource(data domainnews.NewsSource) error
	GetSourceByName(name string) (domainnews.NewsSource, error)
	UpdateSource(data domainnews.NewsSource) error
	GetAllSources(params filter.BaseParams) ([]domainnews.NewsSource, int64, error)
	GetSources(category string) ([]domainnews.NewsSource, error)
	GetLatestItemBySource(sourceID string) (domainnews.NewsItem, error)
	GetAllItems(category string, params filter.BaseParams) ([]domainnews.NewsItem, int64, error)
	DeleteItem(id string) error
	GetSourceByURLCandidates(urls []string) (domainnews.NewsSource, error)
	UpdateSourceFields(id string, updates map[string]interface{}) error
	StoreItem(data domainnews.NewsItem) error
	GetItemByURLCandidates(urls []string) (domainnews.NewsItem, error)
	ListActiveScrapeSourceURLs(sourceType string) ([]string, error)
}
