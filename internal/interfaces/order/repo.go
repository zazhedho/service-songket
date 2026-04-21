package interfaceorder

import (
	"context"
	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type RepoOrderTxInterface interface {
	CountByPoolingNumber(poolingNumber string, excludeID string) (int64, error)
	HasInstallmentColumn() bool
	CreateOrder(order *domainorder.Order) error
	SaveOrder(order *domainorder.Order) error
	CreateAttempt(attempt *domainorder.OrderFinanceAttempt) error
	SaveAttempt(attempt *domainorder.OrderFinanceAttempt) error
	DeleteAttempt(attempt *domainorder.OrderFinanceAttempt) error
}

type RepoOrderInterface interface {
	GetByID(id string) (domainorder.Order, error)
	GetByIDWithAttempts(id string) (domainorder.Order, error)
	GetAll(ctx context.Context, params filter.BaseParams) ([]domainorder.Order, int64, error)
	ListForExport(ctx context.Context, req dto.OrderExportRequest) ([]domainorder.Order, error)
	ListDashboardSummaryRows(ctx context.Context, req dto.DashboardSummaryQuery) ([]domainorder.DashboardSummaryRow, error)
	ListDashboardFinanceDecisionDailyRows(ctx context.Context, req dto.DashboardSummaryQuery) ([]domainorder.DashboardFinanceDecisionDailyRow, error)
	ListDashboardFinanceDecisionByCompanyRows(ctx context.Context, req dto.DashboardSummaryQuery) ([]domainorder.DashboardFinanceDecisionByCompanyRow, error)
	CountDashboardOrders(ctx context.Context, req dto.DashboardSummaryQuery) (int64, error)
	GetDashboardDecisionTotals(ctx context.Context, req dto.DashboardSummaryQuery) (domainorder.DashboardDecisionTotals, error)
	Delete(id string) error
	Transaction(fn func(tx RepoOrderTxInterface) error) error
}
