package interfaceorder

import (
	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceOrderInterface interface {
	Create(req dto.CreateOrderRequest, createdBy string, role string) (domainorder.Order, error)
	List(params filter.BaseParams, role, userID string) ([]domainorder.Order, int64, error)
	DashboardSummary(req dto.DashboardSummaryQuery, role, userID string) (map[string]interface{}, error)
	Update(id string, req dto.UpdateOrderRequest, role, userID string) (domainorder.Order, error)
	Delete(id string, role, userID string) error
	StartExport(req dto.OrderExportRequest, role, userID string) (domainorder.OrderExportJob, error)
	GetExportJob(jobID, role, userID string) (domainorder.OrderExportJob, error)
	DownloadExport(jobID, role, userID string) (domainorder.OrderExportDownload, error)
}
