package serviceorder

import (
	"service-songket/internal/dto"
	"testing"
	"time"
)

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
