package interfaceorder

import (
	"context"
	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceOrderInterface interface {
	Create(ctx context.Context, req dto.CreateOrderRequest) (domainorder.Order, error)
	List(ctx context.Context, params filter.BaseParams) ([]domainorder.Order, int64, error)
	DashboardSummary(ctx context.Context, req dto.DashboardSummaryQuery) (map[string]interface{}, error)
	Update(ctx context.Context, id string, req dto.UpdateOrderRequest) (domainorder.Order, error)
	Delete(ctx context.Context, id string) error
	StartExport(ctx context.Context, req dto.OrderExportRequest) (domainorder.OrderExportJob, error)
	GetExportJob(ctx context.Context, jobID string) (domainorder.OrderExportJob, error)
	DownloadExport(ctx context.Context, jobID string) (domainorder.OrderExportDownload, error)
}
