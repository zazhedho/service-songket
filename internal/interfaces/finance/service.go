package interfacefinance

import (
	"context"
	domainfinance "service-songket/internal/domain/finance"
	"service-songket/pkg/filter"
)

type ServiceFinanceInterface interface {
	DealerMetrics(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (map[string]interface{}, error)
	FinanceCompanyMetrics(ctx context.Context, financeCompanyID string, dateRange domainfinance.DateRange) (map[string]interface{}, error)
	ListMigrationReport(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	ListMigrationReportGroupedByFinance2(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	GetMigrationSummary(ctx context.Context, params filter.BaseParams, month, year int) (domainfinance.FinanceMigrationSummary, error)
	ListMigrationOrderInDetail(ctx context.Context, orderID string, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	GetMigrationOrderInSummary(ctx context.Context, orderID string, params filter.BaseParams, month, year int) (domainfinance.FinanceMigrationDetailSummary, error)
}
