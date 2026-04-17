package interfaceorder

import (
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
	GetAll(params filter.BaseParams, createdBy string) ([]domainorder.Order, int64, error)
	ListForExport(req dto.OrderExportRequest, role, userID string) ([]domainorder.Order, error)
	ListDashboardSummaryRows(req dto.DashboardSummaryQuery, role, userID string) ([]domainorder.DashboardSummaryRow, error)
	ListDashboardFinanceDecisionDailyRows(req dto.DashboardSummaryQuery, role, userID string) ([]domainorder.DashboardFinanceDecisionDailyRow, error)
	ListDashboardFinanceDecisionByCompanyRows(req dto.DashboardSummaryQuery, role, userID string) ([]domainorder.DashboardFinanceDecisionByCompanyRow, error)
	CountDashboardOrders(req dto.DashboardSummaryQuery, role, userID string) (int64, error)
	GetDashboardDecisionTotals(req dto.DashboardSummaryQuery, role, userID string) (domainorder.DashboardDecisionTotals, error)
	Delete(id string) error
	Transaction(fn func(tx RepoOrderTxInterface) error) error
}
