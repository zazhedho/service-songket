package interfacefinance

import (
	domainfinance "service-songket/internal/domain/finance"
	"service-songket/pkg/filter"
)

type ServiceFinanceInterface interface {
	DealerMetrics(dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (map[string]interface{}, error)
	ListMigrationReport(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	ListMigrationReportGroupedByFinance2(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	ListMigrationOrderInDetail(orderID string, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
}
