package middlewares

import (
	"errors"
	"net/http"
	"net/http/httptest"
	domainauth "service-songket/internal/domain/auth"
	domainpermission "service-songket/internal/domain/permission"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"testing"

	"github.com/gin-gonic/gin"
)

type authRepoMock struct{}

func (m *authRepoMock) Store(data domainauth.Blacklist) error { return nil }
func (m *authRepoMock) GetByToken(token string) (domainauth.Blacklist, error) {
	return domainauth.Blacklist{}, nil
}

type permissionRepoMock struct {
	userPermissions []domainpermission.Permission
	getErr          error
	requestedUserID string
}

func (m *permissionRepoMock) Store(data domainpermission.Permission) error { return nil }
func (m *permissionRepoMock) GetByID(id string) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, errors.New("not implemented")
}
func (m *permissionRepoMock) GetByName(name string) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, errors.New("not implemented")
}
func (m *permissionRepoMock) GetAll(params filter.BaseParams) ([]domainpermission.Permission, int64, error) {
	return nil, 0, nil
}
func (m *permissionRepoMock) Update(data domainpermission.Permission) error { return nil }
func (m *permissionRepoMock) Delete(id string) error                        { return nil }
func (m *permissionRepoMock) GetByResource(resource string) ([]domainpermission.Permission, error) {
	return nil, nil
}
func (m *permissionRepoMock) GetUserPermissions(userId string) ([]domainpermission.Permission, error) {
	m.requestedUserID = userId
	if m.getErr != nil {
		return nil, m.getErr
	}
	return append([]domainpermission.Permission{}, m.userPermissions...), nil
}
func (m *permissionRepoMock) GetUserDirectPermissions(userId string) ([]domainpermission.Permission, error) {
	return nil, nil
}
func (m *permissionRepoMock) SetUserPermissions(userId string, permissionIDs []string) error {
	return nil
}
func (m *permissionRepoMock) ListUserPermissionIDs(userId string) ([]string, error) { return nil, nil }

func withAuthData(data map[string]interface{}) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ctx.Set(utils.CtxKeyAuthData, data)
		ctx.Next()
	}
}

func newPermissionTestRouter(repo *permissionRepoMock) *gin.Engine {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	mdw := NewMiddleware(&authRepoMock{}, repo)
	router.GET(
		"/api/dashboard/summary",
		withAuthData(map[string]interface{}{
			"user_id": "user-1",
			"role":    utils.RoleDealer,
		}),
		mdw.PermissionMiddleware("dashboard", "view"),
		func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{"ok": true})
		},
	)

	return router
}

func TestPermissionMiddlewareDeniesWhenAuthDataMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &permissionRepoMock{}
	mdw := NewMiddleware(&authRepoMock{}, repo)
	router := gin.New()
	router.GET("/api/dashboard/summary", mdw.PermissionMiddleware("dashboard", "view"), func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/summary", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rec.Code)
	}
}

func TestPermissionMiddlewareAllowsDashboardViewPermission(t *testing.T) {
	repo := &permissionRepoMock{
		userPermissions: []domainpermission.Permission{
			{Resource: "dashboard", Action: "view"},
		},
	}
	router := newPermissionTestRouter(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/summary", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if repo.requestedUserID != "user-1" {
		t.Fatalf("expected permission lookup for user-1, got %q", repo.requestedUserID)
	}
}

func TestPermissionMiddlewareDeniesWithoutDashboardViewPermission(t *testing.T) {
	repo := &permissionRepoMock{
		userPermissions: []domainpermission.Permission{
			{Resource: "orders", Action: "list"},
		},
	}
	router := newPermissionTestRouter(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/summary", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rec.Code)
	}
}

func TestPermissionMiddlewareBypassesChecksForSuperadmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &permissionRepoMock{}
	mdw := NewMiddleware(&authRepoMock{}, repo)
	router := gin.New()
	router.GET(
		"/api/dashboard/summary",
		withAuthData(map[string]interface{}{
			"user_id": "super-user",
			"role":    utils.RoleSuperAdmin,
		}),
		mdw.PermissionMiddleware("dashboard", "view"),
		func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{"ok": true})
		},
	)

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/summary", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if repo.requestedUserID != "" {
		t.Fatalf("expected no permission lookup for superadmin, got %q", repo.requestedUserID)
	}
}
