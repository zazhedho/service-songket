package interfacefinance

import (
	"context"
	domainfinance "service-songket/internal/domain/finance"
	"service-songket/pkg/filter"
)

type RepoFinanceInterface interface {
	GetDealerMetricsBase(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (domainfinance.DealerMetricsBase, error)
	ListDealerFinanceCompanyMetrics(ctx context.Context, dealerID string, dateRange domainfinance.DateRange) ([]domainfinance.DealerFinanceCompanyMetricRow, error)
	ListFinanceCompanyDealerMetrics(ctx context.Context, financeCompanyID string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceCompanyDealerMetricRow, error)
	ListDealerFinanceApprovalGrouping(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceApprovalGroupingRow, error)
	ListDealerFinanceApprovalTransitions(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceApprovalTransitionRow, error)
	ListMigrationReport(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	ListMigrationReportGroupedByFinance2(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	GetMigrationSummary(ctx context.Context, params filter.BaseParams, month, year int) (domainfinance.FinanceMigrationSummary, error)
	GetMigrationOrderInSummary(ctx context.Context, params filter.BaseParams, month, year int) (domainfinance.FinanceMigrationDetailSummary, error)
	GetMigrationAnchorFinance2CompanyID(ctx context.Context, anchorOrderID string) (string, error)
}
