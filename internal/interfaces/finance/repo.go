package interfacefinance

import (
	"context"
	domainfinance "service-songket/internal/domain/finance"
	"service-songket/pkg/filter"
)

type RepoFinanceInterface interface {
	GetDealerMetricsBase(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (domainfinance.DealerMetricsBase, error)
	ListDealerFinanceCompanyMetrics(ctx context.Context, dealerID string, dateRange domainfinance.DateRange) ([]domainfinance.DealerFinanceCompanyMetricRow, error)
	ListDealerFinanceApprovalGrouping(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceApprovalGroupingRow, error)
	ListDealerFinanceApprovalTransitions(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceApprovalTransitionRow, error)
	ListMigrationReport(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	ListMigrationReportGroupedByFinance2(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error)
	GetMigrationAnchorFinance2CompanyID(ctx context.Context, anchorOrderID string) (string, error)
}
