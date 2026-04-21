package serviceorder

import (
	"context"
	"service-songket/internal/authscope"
	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	interfaceorder "service-songket/internal/interfaces/order"
	"service-songket/pkg/filter"
	"testing"
	"time"
)

type exportRepoStub struct{}

func (exportRepoStub) GetByID(id string) (domainorder.Order, error) {
	return domainorder.Order{}, nil
}

func (exportRepoStub) GetByIDWithAttempts(id string) (domainorder.Order, error) {
	return domainorder.Order{}, nil
}

func (exportRepoStub) GetAll(ctx context.Context, params filter.BaseParams) ([]domainorder.Order, int64, error) {
	return nil, 0, nil
}

func (exportRepoStub) ListForExport(ctx context.Context, req dto.OrderExportRequest) ([]domainorder.Order, error) {
	return []domainorder.Order{}, nil
}

func (exportRepoStub) ListDashboardSummaryRows(ctx context.Context, req dto.DashboardSummaryQuery) ([]domainorder.DashboardSummaryRow, error) {
	return nil, nil
}

func (exportRepoStub) ListDashboardFinanceDecisionDailyRows(ctx context.Context, req dto.DashboardSummaryQuery) ([]domainorder.DashboardFinanceDecisionDailyRow, error) {
	return nil, nil
}

func (exportRepoStub) ListDashboardFinanceDecisionByCompanyRows(ctx context.Context, req dto.DashboardSummaryQuery) ([]domainorder.DashboardFinanceDecisionByCompanyRow, error) {
	return nil, nil
}

func (exportRepoStub) CountDashboardOrders(ctx context.Context, req dto.DashboardSummaryQuery) (int64, error) {
	return 0, nil
}

func (exportRepoStub) GetDashboardDecisionTotals(ctx context.Context, req dto.DashboardSummaryQuery) (domainorder.DashboardDecisionTotals, error) {
	return domainorder.DashboardDecisionTotals{}, nil
}

func (exportRepoStub) Delete(id string) error {
	return nil
}

func (exportRepoStub) Transaction(fn func(tx interfaceorder.RepoOrderTxInterface) error) error {
	return nil
}

func TestValidateOrderExportRequestRejectsInvalidDateRange(t *testing.T) {
	err := validateOrderExportRequest(dto.OrderExportRequest{
		FromDate: "2026-04-10",
		ToDate:   "2026-04-01",
	})
	if err == nil || err.Error() != "from_date cannot be after to_date" {
		t.Fatalf("expected invalid range error, got %v", err)
	}
}

func TestValidateOrderExportRequestRejectsInvalidStatus(t *testing.T) {
	err := validateOrderExportRequest(dto.OrderExportRequest{
		FromDate: "2026-04-01",
		ToDate:   "2026-04-10",
		Status:   "processing",
	})
	if err == nil || err.Error() != "status must be one of: approve, reject, pending" {
		t.Fatalf("expected invalid status error, got %v", err)
	}
}

func TestResolveDashboardPeriodWindowForCustomRange(t *testing.T) {
	window := resolveDashboardPeriodWindow(dto.DashboardSummaryQuery{
		Analysis: "custom",
		From:     "2026-04-01",
		To:       "2026-04-10",
	}, time.Date(2026, 4, 17, 0, 0, 0, 0, time.UTC))

	if window.CurrentFrom.Format("2006-01-02") != "2026-04-01" || window.CurrentTo.Format("2006-01-02") != "2026-04-10" {
		t.Fatalf("expected current range to match custom input, got %+v", window)
	}
	if window.PreviousFrom.Format("2006-01-02") != "2026-03-22" || window.PreviousTo.Format("2006-01-02") != "2026-03-31" {
		t.Fatalf("expected previous comparison range to be derived, got %+v", window)
	}
}

func TestCanAccessOrderExportRequiresCreatorForNonSuperadmin(t *testing.T) {
	job := domainorder.OrderExportJob{CreatedBy: "user-1"}
	if canAccessOrderExport(&job, authscope.New("user-2", "dealer", nil)) {
		t.Fatal("expected non creator to be denied")
	}
	if !canAccessOrderExport(&job, authscope.New("user-1", "dealer", nil)) {
		t.Fatal("expected creator to be allowed")
	}
}

func TestCanAccessOrderExportAllowsSuperadminBypass(t *testing.T) {
	job := domainorder.OrderExportJob{CreatedBy: "user-1"}
	if !canAccessOrderExport(&job, authscope.New("user-2", "superadmin", nil)) {
		t.Fatal("expected superadmin bypass to be allowed")
	}
}

func TestStartExportUsesScopeUserForDataAndOwnerForJob(t *testing.T) {
	service := &Service{repo: exportRepoStub{}}
	job, err := service.StartExport(
		authscope.WithContext(context.Background(), authscope.New("user-1", "dealer", []string{"orders:list", "orders:list_all"})),
		dto.OrderExportRequest{FromDate: "2026-04-01", ToDate: "2026-04-10"},
	)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if job.CreatedBy != "user-1" {
		t.Fatalf("expected export job owner to remain user-1, got %q", job.CreatedBy)
	}
}
