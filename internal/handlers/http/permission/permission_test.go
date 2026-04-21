package handlerpermission

import (
	"context"
	"net/http"
	"net/http/httptest"
	domainpermission "service-songket/internal/domain/permission"
	"service-songket/internal/dto"
	interfacepermission "service-songket/internal/interfaces/permission"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"testing"

	"github.com/gin-gonic/gin"
)

type permissionServiceMock struct {
	getUserPermissionsUserID string
	getUserPermissionsResp   []domainpermission.Permission
	getUserPermissionsErr    error
}

func (m *permissionServiceMock) Create(ctx context.Context, req dto.PermissionCreate) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, nil
}
func (m *permissionServiceMock) GetByID(ctx context.Context, id string) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, nil
}
func (m *permissionServiceMock) GetAll(ctx context.Context, params filter.BaseParams) ([]domainpermission.Permission, int64, error) {
	return nil, 0, nil
}
func (m *permissionServiceMock) GetByResource(ctx context.Context, resource string) ([]domainpermission.Permission, error) {
	return nil, nil
}
func (m *permissionServiceMock) GetUserPermissions(ctx context.Context, userId string) ([]domainpermission.Permission, error) {
	m.getUserPermissionsUserID = userId
	return m.getUserPermissionsResp, m.getUserPermissionsErr
}
func (m *permissionServiceMock) GetUserDirectPermissions(ctx context.Context, userId string) ([]domainpermission.Permission, error) {
	return nil, nil
}
func (m *permissionServiceMock) SetUserPermissions(ctx context.Context, userId string, permissionIDs []string) error {
	return nil
}
func (m *permissionServiceMock) ListUserPermissionIDs(ctx context.Context, userId string) ([]string, error) {
	return nil, nil
}
func (m *permissionServiceMock) Update(ctx context.Context, id string, req dto.PermissionUpdate) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, nil
}
func (m *permissionServiceMock) Delete(ctx context.Context, id string) error { return nil }

var _ interfacepermission.ServicePermissionInterface = (*permissionServiceMock)(nil)

func TestGetUserPermissionsFallsBackToAuthDataUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &permissionServiceMock{
		getUserPermissionsResp: []domainpermission.Permission{
			{Name: "view_dashboard", Resource: "dashboard", Action: "view"},
		},
	}
	handler := NewPermissionHandler(service)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/permissions/me", nil)
	ctx.Set(utils.CtxKeyAuthData, map[string]interface{}{
		"user_id": "11111111-1111-1111-1111-111111111111",
		"role":    utils.RoleDealer,
	})

	handler.GetUserPermissions(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if service.getUserPermissionsUserID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("expected fallback user id from auth data, got %q", service.getUserPermissionsUserID)
	}
}

func TestGetUserPermissionsUsesContextUserIDWhenPresent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &permissionServiceMock{}
	handler := NewPermissionHandler(service)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/permissions/me", nil)
	ctx.Set("userId", "22222222-2222-2222-2222-222222222222")
	ctx.Set(utils.CtxKeyAuthData, map[string]interface{}{
		"user_id": "11111111-1111-1111-1111-111111111111",
		"role":    utils.RoleDealer,
	})

	handler.GetUserPermissions(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if service.getUserPermissionsUserID != "22222222-2222-2222-2222-222222222222" {
		t.Fatalf("expected context userId to win, got %q", service.getUserPermissionsUserID)
	}
}

func TestGetUserPermissionsRejectsWhenNoUserContextExists(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &permissionServiceMock{}
	handler := NewPermissionHandler(service)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/permissions/me", nil)

	handler.GetUserPermissions(ctx)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}
