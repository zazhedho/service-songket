package servicemenu

import (
	domainmenu "service-songket/internal/domain/menu"
	domainpermission "service-songket/internal/domain/permission"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
	"testing"
)

type menuRepoMock struct {
	activeMenus []domainmenu.MenuItem
}

func (m *menuRepoMock) Store(data domainmenu.MenuItem) error { return nil }
func (m *menuRepoMock) GetByID(id string) (domainmenu.MenuItem, error) {
	return domainmenu.MenuItem{}, nil
}
func (m *menuRepoMock) GetByName(name string) (domainmenu.MenuItem, error) {
	return domainmenu.MenuItem{}, nil
}
func (m *menuRepoMock) GetAll(params filter.BaseParams) ([]domainmenu.MenuItem, int64, error) {
	return nil, 0, nil
}
func (m *menuRepoMock) Update(data domainmenu.MenuItem) error { return nil }
func (m *menuRepoMock) Delete(id string) error                { return nil }
func (m *menuRepoMock) GetActiveMenus() ([]domainmenu.MenuItem, error) {
	return append([]domainmenu.MenuItem{}, m.activeMenus...), nil
}
func (m *menuRepoMock) GetUserMenus(userId string) ([]domainmenu.MenuItem, error) {
	return nil, nil
}

type permissionRepoMock struct {
	userPermissions []domainpermission.Permission
	requestedUserID string
}

func (m *permissionRepoMock) Store(data domainpermission.Permission) error { return nil }
func (m *permissionRepoMock) GetByID(id string) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, nil
}
func (m *permissionRepoMock) GetByName(name string) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, nil
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
	return append([]domainpermission.Permission{}, m.userPermissions...), nil
}
func (m *permissionRepoMock) GetUserDirectPermissions(userId string) ([]domainpermission.Permission, error) {
	return nil, nil
}
func (m *permissionRepoMock) SetUserPermissions(userId string, permissionIDs []string) error {
	return nil
}
func (m *permissionRepoMock) ListUserPermissionIDs(userId string) ([]string, error) { return nil, nil }

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
	menus, err := service.GetUserMenus("user-1")
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
	_, err := service.Update("menu-1", dto.MenuUpdate{ParentId: ptr("not-a-uuid")})
	if err == nil || err.Error() != "parent_id must be a valid UUID" {
		t.Fatalf("expected invalid parent_id error, got %v", err)
	}
}

func ptr[T any](v T) *T { return &v }
