package handlerorder

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	interfaceorder "service-songket/internal/interfaces/order"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"testing"

	"github.com/gin-gonic/gin"
)

type orderServiceMock struct {
	lastListParams           filter.BaseParams
	lastListRole             string
	lastListUserID           string
	listResp                 []domainorder.Order
	listTotal                int64
	listErr                  error
	lastDashboardReq         dto.DashboardSummaryQuery
	lastDashboardRole        string
	lastDashboardUserID      string
	dashboardResp            map[string]interface{}
	dashboardErr             error
	lastStartExportReq       dto.OrderExportRequest
	lastStartExportRole      string
	lastStartExportUserID    string
	startExportResp          domainorder.OrderExportJob
	startExportErr           error
	lastGetExportJobID       string
	lastGetExportJobRole     string
	lastGetExportJobUserID   string
	getExportJobResp         domainorder.OrderExportJob
	getExportJobErr          error
	lastDownloadExportID     string
	lastDownloadExportRole   string
	lastDownloadExportUserID string
	downloadExportResp       domainorder.OrderExportDownload
	downloadExportErr        error
}

func (m *orderServiceMock) Create(req dto.CreateOrderRequest, createdBy string, role string) (domainorder.Order, error) {
	return domainorder.Order{}, nil
}
func (m *orderServiceMock) List(params filter.BaseParams, role, userID string) ([]domainorder.Order, int64, error) {
	m.lastListParams = params
	m.lastListRole = role
	m.lastListUserID = userID
	return m.listResp, m.listTotal, m.listErr
}
func (m *orderServiceMock) DashboardSummary(req dto.DashboardSummaryQuery, role, userID string) (map[string]interface{}, error) {
	m.lastDashboardReq = req
	m.lastDashboardRole = role
	m.lastDashboardUserID = userID
	return m.dashboardResp, m.dashboardErr
}
func (m *orderServiceMock) Update(id string, req dto.UpdateOrderRequest, role, userID string) (domainorder.Order, error) {
	return domainorder.Order{}, nil
}
func (m *orderServiceMock) Delete(id string, role, userID string) error { return nil }
func (m *orderServiceMock) StartExport(req dto.OrderExportRequest, role, userID string) (domainorder.OrderExportJob, error) {
	m.lastStartExportReq = req
	m.lastStartExportRole = role
	m.lastStartExportUserID = userID
	return m.startExportResp, m.startExportErr
}
func (m *orderServiceMock) GetExportJob(jobID, role, userID string) (domainorder.OrderExportJob, error) {
	m.lastGetExportJobID = jobID
	m.lastGetExportJobRole = role
	m.lastGetExportJobUserID = userID
	return m.getExportJobResp, m.getExportJobErr
}
func (m *orderServiceMock) DownloadExport(jobID, role, userID string) (domainorder.OrderExportDownload, error) {
	m.lastDownloadExportID = jobID
	m.lastDownloadExportRole = role
	m.lastDownloadExportUserID = userID
	return m.downloadExportResp, m.downloadExportErr
}

var _ interfaceorder.ServiceOrderInterface = (*orderServiceMock)(nil)

func withOrderAuth(ctx *gin.Context) {
	ctx.Set(utils.CtxKeyAuthData, map[string]interface{}{
		"user_id": "11111111-1111-1111-1111-111111111111",
		"role":    utils.RoleDealer,
	})
}

func TestDashboardSummaryRejectsInvalidAnalysis(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &orderServiceMock{}
	handler := NewOrderHandler(service)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/dashboard/summary?analysis=weekly", nil)
	withOrderAuth(ctx)

	handler.DashboardSummary(ctx)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestDashboardSummaryPassesQueryAndAuthToService(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &orderServiceMock{dashboardResp: map[string]interface{}{"ok": true}}
	handler := NewOrderHandler(service)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/dashboard/summary?analysis=custom&from=2026-04-01&to=2026-04-10&result_status=approve", nil)
	withOrderAuth(ctx)

	handler.DashboardSummary(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if service.lastDashboardRole != utils.RoleDealer {
		t.Fatalf("expected role to be forwarded, got %q", service.lastDashboardRole)
	}
	if service.lastDashboardUserID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("expected user id to be forwarded, got %q", service.lastDashboardUserID)
	}
	if service.lastDashboardReq.Analysis != "custom" || service.lastDashboardReq.From != "2026-04-01" || service.lastDashboardReq.To != "2026-04-10" {
		t.Fatalf("expected query to be forwarded, got %+v", service.lastDashboardReq)
	}
}

func TestStartExportPassesAuthToService(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &orderServiceMock{startExportResp: domainorder.OrderExportJob{ID: "job-1", Status: "queued"}}
	handler := NewOrderHandler(service)

	body, _ := json.Marshal(dto.OrderExportRequest{
		FromDate: "2026-04-01",
		ToDate:   "2026-04-10",
		Status:   "approve",
	})

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/order/export", bytes.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")
	withOrderAuth(ctx)

	handler.StartExport(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if service.lastStartExportRole != utils.RoleDealer {
		t.Fatalf("expected role to be forwarded, got %q", service.lastStartExportRole)
	}
	if service.lastStartExportUserID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("expected user id to be forwarded, got %q", service.lastStartExportUserID)
	}
	if service.lastStartExportReq.FromDate != "2026-04-01" || service.lastStartExportReq.ToDate != "2026-04-10" {
		t.Fatalf("expected request to be forwarded, got %+v", service.lastStartExportReq)
	}
}

func TestGetExportStatusMapsDomainErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &orderServiceMock{getExportJobErr: domainorder.ErrOrderExportForbidden}
	handler := NewOrderHandler(service)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Params = gin.Params{{Key: "id", Value: "job-1"}}
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/order/export/job-1/status", nil)
	withOrderAuth(ctx)

	handler.GetExportStatus(ctx)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", w.Code)
	}
	if service.lastGetExportJobID != "job-1" {
		t.Fatalf("expected job id to be forwarded, got %q", service.lastGetExportJobID)
	}
}

func TestDownloadExportMapsNotReadyToConflict(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &orderServiceMock{downloadExportErr: domainorder.ErrOrderExportNotReady}
	handler := NewOrderHandler(service)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Params = gin.Params{{Key: "id", Value: "job-1"}}
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/order/export/job-1/download", nil)
	withOrderAuth(ctx)

	handler.DownloadExport(ctx)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d", w.Code)
	}
	if service.lastDownloadExportID != "job-1" {
		t.Fatalf("expected job id to be forwarded, got %q", service.lastDownloadExportID)
	}
}
