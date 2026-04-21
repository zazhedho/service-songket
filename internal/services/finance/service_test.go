package servicefinance

import (
	"context"
	"errors"
	"reflect"
	domainfinance "service-songket/internal/domain/finance"
	"service-songket/pkg/filter"
	"testing"

	"gorm.io/gorm"
)

type financeRepoMock struct {
	base             domainfinance.DealerMetricsBase
	fcRows           []domainfinance.DealerFinanceCompanyMetricRow
	groupingRows     []domainfinance.FinanceApprovalGroupingRow
	transitionRows   []domainfinance.FinanceApprovalTransitionRow
	anchorFinance2ID string
	anchorErr        error
	reportRows       []domainfinance.FinanceMigrationReportItem
	reportTotal      int64
	lastReportParams filter.BaseParams
	lastReportMonth  int
	lastReportYear   int
}

func (m *financeRepoMock) GetDealerMetricsBase(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (domainfinance.DealerMetricsBase, error) {
	return m.base, nil
}
func (m *financeRepoMock) ListDealerFinanceCompanyMetrics(ctx context.Context, dealerID string, dateRange domainfinance.DateRange) ([]domainfinance.DealerFinanceCompanyMetricRow, error) {
	return append([]domainfinance.DealerFinanceCompanyMetricRow{}, m.fcRows...), nil
}
func (m *financeRepoMock) ListFinanceCompanyDealerMetrics(ctx context.Context, financeCompanyID string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceCompanyDealerMetricRow, error) {
	return nil, nil
}
func (m *financeRepoMock) ListDealerFinanceApprovalGrouping(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceApprovalGroupingRow, error) {
	return append([]domainfinance.FinanceApprovalGroupingRow{}, m.groupingRows...), nil
}
func (m *financeRepoMock) ListDealerFinanceApprovalTransitions(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) ([]domainfinance.FinanceApprovalTransitionRow, error) {
	return append([]domainfinance.FinanceApprovalTransitionRow{}, m.transitionRows...), nil
}
func (m *financeRepoMock) ListMigrationReport(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	m.lastReportParams = params
	m.lastReportMonth = month
	m.lastReportYear = year
	return append([]domainfinance.FinanceMigrationReportItem{}, m.reportRows...), m.reportTotal, nil
}
func (m *financeRepoMock) ListMigrationReportGroupedByFinance2(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	return nil, 0, nil
}
func (m *financeRepoMock) GetMigrationSummary(ctx context.Context, params filter.BaseParams, month, year int) (domainfinance.FinanceMigrationSummary, error) {
	return domainfinance.FinanceMigrationSummary{}, nil
}
func (m *financeRepoMock) GetMigrationOrderInSummary(ctx context.Context, params filter.BaseParams, month, year int) (domainfinance.FinanceMigrationDetailSummary, error) {
	return domainfinance.FinanceMigrationDetailSummary{}, nil
}
func (m *financeRepoMock) GetMigrationAnchorFinance2CompanyID(ctx context.Context, anchorOrderID string) (string, error) {
	if m.anchorErr != nil {
		return "", m.anchorErr
	}
	return m.anchorFinance2ID, nil
}

func TestDealerMetricsCalculatesRatesAndSortsGrouping(t *testing.T) {
	lead := 3600.0
	service := NewFinanceService(&financeRepoMock{
		base: domainfinance.DealerMetricsBase{
			TotalOrders:        4,
			ApprovedOrders:     1,
			RescuedOrders:      1,
			LeadTimeSecondsAvg: &lead,
		},
		fcRows: []domainfinance.DealerFinanceCompanyMetricRow{
			{FinanceCompanyID: "fc-b", FinanceCompanyName: "B Finance", TotalOrders: 2, ApprovedCount: 1, RejectedCount: 1},
		},
		groupingRows: []domainfinance.FinanceApprovalGroupingRow{
			{FinanceCompanyID: "fc-b", FinanceCompanyName: "B Finance", Status: "reject", TotalData: 1},
			{FinanceCompanyID: "fc-b", FinanceCompanyName: "B Finance", Status: "approve", TotalData: 1},
		},
		transitionRows: []domainfinance.FinanceApprovalTransitionRow{
			{Finance1CompanyName: "B Finance", Finance2CompanyName: "A Finance", TotalData: 2, ApprovedCount: 1, RejectedCount: 1},
		},
	}).(*Service)

	result, err := service.DealerMetrics(context.Background(), "dealer-1", nil, domainfinance.DateRange{})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}

	if result["approval_rate"].(float64) != 0.25 {
		t.Fatalf("expected approval rate 0.25, got %v", result["approval_rate"])
	}

	groupings := reflect.ValueOf(result["finance_approval_grouping"])
	if groupings.Len() != 2 {
		t.Fatalf("expected 2 grouping rows, got %d", groupings.Len())
	}
	firstGrouping := groupings.Index(0)
	if firstGrouping.FieldByName("Status").String() != "approve" || firstGrouping.FieldByName("ApprovalRate").Float() != 0.5 {
		t.Fatalf("expected approve row first with rate 0.5, got %+v", firstGrouping.Interface())
	}

	transitions := reflect.ValueOf(result["finance_approval_transitions"])
	if transitions.Len() != 1 || transitions.Index(0).FieldByName("ApprovalRate").Float() != 0.5 {
		t.Fatalf("expected transition rate 0.5, got %+v", result["finance_approval_transitions"])
	}
}

func TestListMigrationOrderInDetailReturnsEmptyWhenAnchorMissing(t *testing.T) {
	service := NewFinanceService(&financeRepoMock{anchorErr: gorm.ErrRecordNotFound}).(*Service)

	rows, total, err := service.ListMigrationOrderInDetail(context.Background(), "order-1", filter.BaseParams{}, 4, 2026)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(rows) != 0 || total != 0 {
		t.Fatalf("expected empty result, got rows=%d total=%d", len(rows), total)
	}
}

func TestListMigrationOrderInDetailForwardsAnchorFinance2AndOptionalFinance1Filter(t *testing.T) {
	repo := &financeRepoMock{
		anchorFinance2ID: "fc-2",
		reportRows:       []domainfinance.FinanceMigrationReportItem{{OrderID: "order-1"}},
		reportTotal:      1,
	}
	service := NewFinanceService(repo).(*Service)

	rows, total, err := service.ListMigrationOrderInDetail(context.Background(), "order-1", filter.BaseParams{
		Filters: map[string]interface{}{"finance_1_company_id": "fc-1"},
	}, 4, 2026)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(rows) != 1 || total != 1 {
		t.Fatalf("expected forwarded rows, got rows=%d total=%d", len(rows), total)
	}
	if repo.lastReportParams.Filters["finance_2_company_id"] != "fc-2" {
		t.Fatalf("expected finance_2_company_id filter, got %+v", repo.lastReportParams.Filters)
	}
	if repo.lastReportParams.Filters["finance_1_company_id"] != "fc-1" {
		t.Fatalf("expected finance_1_company_id filter, got %+v", repo.lastReportParams.Filters)
	}
}

func TestListMigrationOrderInDetailReturnsErrorOnUnexpectedAnchorLookupFailure(t *testing.T) {
	service := NewFinanceService(&financeRepoMock{anchorErr: errors.New("db down")}).(*Service)
	_, _, err := service.ListMigrationOrderInDetail(context.Background(), "order-1", filter.BaseParams{}, 4, 2026)
	if err == nil || err.Error() != "db down" {
		t.Fatalf("expected db error, got %v", err)
	}
}
