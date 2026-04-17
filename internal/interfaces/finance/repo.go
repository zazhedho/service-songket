package interfacefinance

import (
	domainfinance "service-songket/internal/domain/finance"
	"service-songket/pkg/filter"
)

type RepoFinanceInterface interface {
	GetDealerMetricsBase(dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (domainfinance.DealerMetricsBase, error)
	ListDealerFinanceCompanyMetrics(dealerID string, dateRange domainfinance.DateRange) ([]domainfinance.DealerFinanceCompanyMetricRow, error)
	ListDealerFinanceApprovalGrouping(dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceApprovalGroupingRow, error)
	ListDealerFinanceApprovalTransitions(dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceApprovalTransitionRow, error)
	ListMigrationReport(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	ListMigrationReportGroupedByFinance2(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	GetMigrationAnchorFinance2CompanyID(anchorOrderID string) (string, error)
}
