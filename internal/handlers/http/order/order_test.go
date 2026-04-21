package handlerorder

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"service-songket/internal/authscope"
	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	interfaceorder "service-songket/internal/interfaces/order"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"testing"

	"github.com/gin-gonic/gin"
)

type orderServiceMock struct {
	lastCreateReq              dto.CreateOrderRequest
	lastCreateUserID           string
	lastCreateRole             string
	createResp                 domainorder.Order
	createErr                  error
	lastListParams             filter.BaseParams
	lastListRole               string
	lastListUserID             string
	listResp                   []domainorder.Order
	listTotal                  int64
	listErr                    error
	lastDashboardReq           dto.DashboardSummaryQuery
	lastDashboardRole          string
	lastDashboardUserID        string
	dashboardResp              map[string]interface{}
	dashboardErr               error
	lastUpdateUserID           string
	lastUpdateRole             string
	updateErr                  error
	lastDeleteUserID           string
	lastDeleteRole             string
	deleteErr                  error
	lastStartExportReq         dto.OrderExportRequest
	lastStartExportRole        string
	lastStartExportUserID      string
	lastStartExportScopeUserID string
	startExportResp            domainorder.OrderExportJob
	startExportErr             error
	lastGetExportJobID         string
	lastGetExportJobRole       string
	lastGetExportJobUserID     string
	getExportJobResp           domainorder.OrderExportJob
	getExportJobErr            error
	lastDownloadExportID       string
	lastDownloadExportRole     string
	lastDownloadExportUserID   string
	downloadExportResp         domainorder.OrderExportDownload
	downloadExportErr          error
}

func (m *orderServiceMock) Create(ctx context.Context, req dto.CreateOrderRequest) (domainorder.Order, error) {
	authScope := authscope.FromContext(ctx)
	m.lastCreateReq = req
	m.lastCreateUserID = authScope.UserID
	m.lastCreateRole = authScope.Role
	return m.createResp, m.createErr
}
func (m *orderServiceMock) List(ctx context.Context, params filter.BaseParams) ([]domainorder.Order, int64, error) {
	authScope := authscope.FromContext(ctx)
	m.lastListParams = params
	m.lastListRole = authScope.Role
	m.lastListUserID = authScope.ScopedUserID("orders", "list_all")
	return m.listResp, m.listTotal, m.listErr
}
func (m *orderServiceMock) DashboardSummary(ctx context.Context, req dto.DashboardSummaryQuery) (map[string]interface{}, error) {
	authScope := authscope.FromContext(ctx)
	m.lastDashboardReq = req
	m.lastDashboardRole = authScope.Role
	m.lastDashboardUserID = authScope.ScopedUserID("orders", "list_all")
	return m.dashboardResp, m.dashboardErr
}
func (m *orderServiceMock) Update(ctx context.Context, id string, req dto.UpdateOrderRequest) (domainorder.Order, error) {
	authScope := authscope.FromContext(ctx)
	m.lastUpdateRole = authScope.Role
	m.lastUpdateUserID = authScope.ScopedUserID("orders", "update_all")
	return domainorder.Order{}, m.updateErr
}
func (m *orderServiceMock) Delete(ctx context.Context, id string) error {
	authScope := authscope.FromContext(ctx)
	m.lastDeleteRole = authScope.Role
	m.lastDeleteUserID = authScope.ScopedUserID("orders", "delete_all")
	return m.deleteErr
}
func (m *orderServiceMock) StartExport(ctx context.Context, req dto.OrderExportRequest) (domainorder.OrderExportJob, error) {
	authScope := authscope.FromContext(ctx)
	m.lastStartExportReq = req
	m.lastStartExportRole = authScope.Role
	m.lastStartExportUserID = authScope.UserID
	m.lastStartExportScopeUserID = authScope.ScopedUserID("orders", "list_all")
	return m.startExportResp, m.startExportErr
}
func (m *orderServiceMock) GetExportJob(ctx context.Context, jobID string) (domainorder.OrderExportJob, error) {
	authScope := authscope.FromContext(ctx)
	m.lastGetExportJobID = jobID
	m.lastGetExportJobRole = authScope.Role
	m.lastGetExportJobUserID = authScope.UserID
	return m.getExportJobResp, m.getExportJobErr
}
func (m *orderServiceMock) DownloadExport(ctx context.Context, jobID string) (domainorder.OrderExportDownload, error) {
	authScope := authscope.FromContext(ctx)
	m.lastDownloadExportID = jobID
	m.lastDownloadExportRole = authScope.Role
	m.lastDownloadExportUserID = authScope.UserID
	return m.downloadExportResp, m.downloadExportErr
}

var _ interfaceorder.ServiceOrderInterface = (*orderServiceMock)(nil)

func withOrderAuth(ctx *gin.Context) {
	ctx.Set(utils.CtxKeyAuthData, map[string]interface{}{
		"user_id": "11111111-1111-1111-1111-111111111111",
		"role":    utils.RoleDealer,
	})
	ctx.Request = ctx.Request.WithContext(authscope.WithContext(ctx.Request.Context(), authscope.New(
		"11111111-1111-1111-1111-111111111111",
		utils.RoleDealer,
		nil,
	)))
}

func withOrderAuthAndPermissions(ctx *gin.Context, permissions ...string) {
	ctx.Set(utils.CtxKeyAuthData, map[string]interface{}{
		"user_id":     "11111111-1111-1111-1111-111111111111",
		"role":        utils.RoleDealer,
		"permissions": permissions,
	})
	ctx.Request = ctx.Request.WithContext(authscope.WithContext(ctx.Request.Context(), authscope.New(
		"11111111-1111-1111-1111-111111111111",
		utils.RoleDealer,
		permissions,
	)))
}

func TestGetAllPassesScopedUserIDWhenNoListAllPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &orderServiceMock{}
	handler := NewOrderHandler(service)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/orders", nil)
	withOrderAuthAndPermissions(ctx, "orders:list")

	handler.GetAll(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if service.lastListUserID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("expected scoped user id, got %q", service.lastListUserID)
	}
}

func TestGetAllClearsScopedUserIDWhenListAllPermissionExists(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &orderServiceMock{}
	handler := NewOrderHandler(service)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/orders", nil)
	withOrderAuthAndPermissions(ctx, "orders:list", "orders:list_all")

	handler.GetAll(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if service.lastListUserID != "" {
		t.Fatalf("expected unscoped user id, got %q", service.lastListUserID)
	}
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
		t.Fatalf("expected owner user id to be forwarded, got %q", service.lastStartExportUserID)
	}
	if service.lastStartExportScopeUserID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("expected scoped user id to be forwarded, got %q", service.lastStartExportScopeUserID)
	}
	if service.lastStartExportReq.FromDate != "2026-04-01" || service.lastStartExportReq.ToDate != "2026-04-10" {
		t.Fatalf("expected request to be forwarded, got %+v", service.lastStartExportReq)
	}
}

func TestStartExportClearsScopedUserIDWhenListAllPermissionExists(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &orderServiceMock{startExportResp: domainorder.OrderExportJob{ID: "job-1", Status: "queued"}}
	handler := NewOrderHandler(service)

	body, _ := json.Marshal(dto.OrderExportRequest{
		FromDate: "2026-04-01",
		ToDate:   "2026-04-10",
	})

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/order/export", bytes.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")
	withOrderAuthAndPermissions(ctx, "orders:list", "orders:list_all")

	handler.StartExport(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if service.lastStartExportUserID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("expected owner user id to stay intact, got %q", service.lastStartExportUserID)
	}
	if service.lastStartExportScopeUserID != "" {
		t.Fatalf("expected unscoped export filter user id, got %q", service.lastStartExportScopeUserID)
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
