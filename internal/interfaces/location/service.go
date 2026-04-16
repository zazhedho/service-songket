package interfacelocation

import (
	"context"

	domainlocation "service-songket/internal/domain/location"
)

type ServiceLocationInterface interface {
	GetProvince(ctx context.Context, year string) ([]domainlocation.LocationItem, error)
	GetCity(ctx context.Context, year, provinceCode string) ([]domainlocation.LocationItem, error)
	GetDistrict(ctx context.Context, year, provinceCode, cityCode string) ([]domainlocation.LocationItem, error)
}
