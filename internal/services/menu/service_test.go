package servicemenu

import (
	"context"
	domainmenu "service-songket/internal/domain/menu"
	domainpermission "service-songket/internal/domain/permission"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
	"testing"
)

type menuRepoMock struct {
	activeMenus []domainmenu.MenuItem
}

func (m *menuRepoMock) Store(ctx context.Context, data domainmenu.MenuItem) error { return nil }
func (m *menuRepoMock) GetByID(ctx context.Context, id string) (domainmenu.MenuItem, error) {
	return domainmenu.MenuItem{}, nil
}
func (m *menuRepoMock) GetByName(ctx context.Context, name string) (domainmenu.MenuItem, error) {
	return domainmenu.MenuItem{}, nil
}
func (m *menuRepoMock) GetAll(ctx context.Context, params filter.BaseParams) ([]domainmenu.MenuItem, int64, error) {
	return nil, 0, nil
}
func (m *menuRepoMock) Update(ctx context.Context, data domainmenu.MenuItem) error { return nil }
func (m *menuRepoMock) Delete(ctx context.Context, id string) error                { return nil }
func (m *menuRepoMock) GetActiveMenus(ctx context.Context) ([]domainmenu.MenuItem, error) {
	return append([]domainmenu.MenuItem{}, m.activeMenus...), nil
}
func (m *menuRepoMock) GetUserMenus(ctx context.Context, userId string) ([]domainmenu.MenuItem, error) {
	return nil, nil
}

type permissionRepoMock struct {
	userPermissions []domainpermission.Permission
	requestedUserID string
}

func (m *permissionRepoMock) Store(ctx context.Context, data domainpermission.Permission) error {
	return nil
}
func (m *permissionRepoMock) GetByID(ctx context.Context, id string) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, nil
}
func (m *permissionRepoMock) GetByName(ctx context.Context, name string) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, nil
}
func (m *permissionRepoMock) GetAll(ctx context.Context, params filter.BaseParams) ([]domainpermission.Permission, int64, error) {
	return nil, 0, nil
}
func (m *permissionRepoMock) Update(ctx context.Context, data domainpermission.Permission) error {
	return nil
}
func (m *permissionRepoMock) Delete(ctx context.Context, id string) error { return nil }
func (m *permissionRepoMock) GetByResource(ctx context.Context, resource string) ([]domainpermission.Permission, error) {
	return nil, nil
}
func (m *permissionRepoMock) GetUserPermissions(ctx context.Context, userId string) ([]domainpermission.Permission, error) {
	m.requestedUserID = userId
	return append([]domainpermission.Permission{}, m.userPermissions...), nil
}
func (m *permissionRepoMock) GetUserDirectPermissions(ctx context.Context, userId string) ([]domainpermission.Permission, error) {
	return nil, nil
}
func (m *permissionRepoMock) SetUserPermissions(ctx context.Context, userId string, permissionIDs []string) error {
	return nil
}
func (m *permissionRepoMock) ListUserPermissionIDs(ctx context.Context, userId string) ([]string, error) {
	return nil, nil
}

func TestGetUserMenusResolvesMenusFromPermissions(t *testing.T) {
	parentID := "dashboard"
	repoMenu := &menuRepoMock{
		activeMenus: []domainmenu.MenuItem{
			{Id: "dashboard", Name: "dashboard", DisplayName: "Dashboard", IsActive: true, OrderIndex: 1},
			{Id: "orders", Name: "orders", DisplayName: "Orders", ParentId: &parentID, IsActive: true, OrderIndex: 2},
			{Id: "finance", Name: "business", DisplayName: "Business", IsActive: true, OrderIndex: 3},
		},
	}
	repoPermission := &permissionRepoMock{
		userPermissions: []domainpermission.Permission{
			{Resource: "orders", Action: "list"},
			{Resource: "orders", Action: "create"},
			{Resource: "unknown", Action: "view"},
		},
	}

	service := NewMenuService(repoMenu, repoPermission)
	menus, err := service.GetUserMenus(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}

	if repoPermission.requestedUserID != "user-1" {
		t.Fatalf("expected permission lookup for user-1, got %q", repoPermission.requestedUserID)
	}
	if len(menus) != 2 {
		t.Fatalf("expected 2 menus (child + parent), got %d", len(menus))
	}
	if menus[0].Id != "dashboard" {
		t.Fatalf("expected parent dashboard first by active order, got %q", menus[0].Id)
	}
	if menus[1].Id != "orders" {
		t.Fatalf("expected orders menu second, got %q", menus[1].Id)
	}
}

func TestNormalizeOptionalParentIDAcceptsEmptyString(t *testing.T) {
	empty := "   "
	got, err := normalizeOptionalParentID(&empty)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if got != nil {
		t.Fatalf("expected nil parent id, got %v", *got)
	}
}

func TestMenuServiceUpdateRejectsInvalidParentID(t *testing.T) {
	service := NewMenuService(&menuRepoMock{}, &permissionRepoMock{})
	_, err := service.Update(context.Background(), "menu-1", dto.MenuUpdate{ParentId: ptr("not-a-uuid")})
	if err == nil || err.Error() != "parent_id must be a valid UUID" {
		t.Fatalf("expected invalid parent_id error, got %v", err)
	}
}

func ptr[T any](v T) *T { return &v }
