package interfacelocation

import domainlocation "service-songket/internal/domain/location"

type RepoLocationInterface interface {
	EnsureSchema() error
	ListProvinceCache() ([]domainlocation.LocationItem, error)
	ListCityCache(provinceCode string) ([]domainlocation.LocationItem, error)
	ListDistrictCache(provinceCode, cityCode string) ([]domainlocation.LocationItem, error)
	UpsertProvinceCache(items []domainlocation.LocationItem, source string) error
	UpsertCityCache(provinceCode string, items []domainlocation.LocationItem, source string) error
	UpsertDistrictCache(provinceCode, cityCode string, items []domainlocation.LocationItem, source string) error
}
