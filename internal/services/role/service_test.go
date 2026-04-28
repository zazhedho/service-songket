package servicerole

import (
	"context"
	"errors"
	"service-songket/internal/authscope"
	domainmenu "service-songket/internal/domain/menu"
	domainpermission "service-songket/internal/domain/permission"
	domainrole "service-songket/internal/domain/role"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"testing"
)

type roleRepoMock struct {
	role                domainrole.Role
	roles               []domainrole.Role
	total               int64
	rolePermissions     []string
	assignedPermissions []string
}

func (m *roleRepoMock) Store(ctx context.Context, data domainrole.Role) error { return nil }
func (m *roleRepoMock) GetByID(ctx context.Context, id string) (domainrole.Role, error) {
	return m.role, nil
}
func (m *roleRepoMock) GetByName(ctx context.Context, name string) (domainrole.Role, error) {
	return domainrole.Role{}, errors.New("not implemented")
}
func (m *roleRepoMock) GetAll(ctx context.Context, params filter.BaseParams) ([]domainrole.Role, int64, error) {
	return append([]domainrole.Role{}, m.roles...), m.total, nil
}
func (m *roleRepoMock) Update(ctx context.Context, data domainrole.Role) error { return nil }
func (m *roleRepoMock) Delete(ctx context.Context, id string) error            { return nil }
func (m *roleRepoMock) AssignPermissions(ctx context.Context, roleId string, permissionIds []string) error {
	m.assignedPermissions = append([]string{}, permissionIds...)
	return nil
}
func (m *roleRepoMock) RemovePermissions(ctx context.Context, roleId string, permissionIds []string) error {
	return nil
}
func (m *roleRepoMock) GetRolePermissions(ctx context.Context, roleId string) ([]string, error) {
	return append([]string{}, m.rolePermissions...), nil
}

type permissionRepoMock struct {
	permissionsByID map[string]domainpermission.Permission
	userPermissions []domainpermission.Permission
}

func (m *permissionRepoMock) Store(ctx context.Context, data domainpermission.Permission) error {
	return nil
}
func (m *permissionRepoMock) GetByID(ctx context.Context, id string) (domainpermission.Permission, error) {
	permission, ok := m.permissionsByID[id]
	if !ok {
		return domainpermission.Permission{}, errors.New("not found")
	}
	return permission, nil
}
func (m *permissionRepoMock) GetByName(ctx context.Context, name string) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, errors.New("not implemented")
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

type menuRepoMock struct {
	activeMenus []domainmenu.MenuItem
}

func (m *menuRepoMock) Store(ctx context.Context, data domainmenu.MenuItem) error { return nil }
func (m *menuRepoMock) GetByID(ctx context.Context, id string) (domainmenu.MenuItem, error) {
	return domainmenu.MenuItem{}, errors.New("not implemented")
}
func (m *menuRepoMock) GetByName(ctx context.Context, name string) (domainmenu.MenuItem, error) {
	return domainmenu.MenuItem{}, errors.New("not implemented")
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

func TestAssignPermissionsRequiresManageSystemPermissionForSystemRole(t *testing.T) {
	service := &RoleService{
		RoleRepo: &roleRepoMock{
			role: domainrole.Role{Id: "role-1", Name: utils.RoleAdmin, IsSystem: true},
		},
		PermissionRepo: &permissionRepoMock{},
		MenuRepo:       &menuRepoMock{},
	}

	err := service.AssignPermissions(authscope.WithContext(context.Background(), authscope.New("user-1", utils.RoleAdmin, nil)), "11111111-1111-1111-1111-111111111111", dto.AssignPermissions{
		PermissionIds: []string{"22222222-2222-2222-2222-222222222222"},
	})
	if err == nil || err.Error() != "access denied: missing permission roles:manage_system" {
		t.Fatalf("expected manage_system access error, got %v", err)
	}
}

func TestAssignPermissionsRejectsSuperadminRoleForNonSuperadmin(t *testing.T) {
	service := &RoleService{
		RoleRepo: &roleRepoMock{
			role: domainrole.Role{Id: "role-1", Name: utils.RoleSuperAdmin, IsSystem: true},
		},
		PermissionRepo: &permissionRepoMock{
			userPermissions: []domainpermission.Permission{{Resource: "roles", Action: "manage_system"}},
		},
		MenuRepo: &menuRepoMock{},
	}

	err := service.AssignPermissions(authscope.WithContext(context.Background(), authscope.New("user-1", utils.RoleAdmin, []string{"roles:manage_system"})), "11111111-1111-1111-1111-111111111111", dto.AssignPermissions{
		PermissionIds: []string{"22222222-2222-2222-2222-222222222222"},
	})
	if err == nil || err.Error() != "access denied: cannot modify superadmin role" {
		t.Fatalf("expected superadmin protection error, got %v", err)
	}
}

func TestAssignPermissionsAllowsSystemRoleWhenPermissionPresent(t *testing.T) {
	roleRepo := &roleRepoMock{
		role: domainrole.Role{Id: "role-1", Name: utils.RoleAdmin, IsSystem: true},
	}
	service := &RoleService{
		RoleRepo: roleRepo,
		PermissionRepo: &permissionRepoMock{
			userPermissions: []domainpermission.Permission{{Resource: "roles", Action: "manage_system"}},
			permissionsByID: map[string]domainpermission.Permission{
				"22222222-2222-2222-2222-222222222222": {Id: "22222222-2222-2222-2222-222222222222", Resource: "users", Action: "view"},
			},
		},
		MenuRepo: &menuRepoMock{},
	}

	err := service.AssignPermissions(authscope.WithContext(context.Background(), authscope.New("user-1", utils.RoleAdmin, []string{"roles:manage_system"})), "11111111-1111-1111-1111-111111111111", dto.AssignPermissions{
		PermissionIds: []string{"22222222-2222-2222-2222-222222222222"},
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(roleRepo.assignedPermissions) != 1 || roleRepo.assignedPermissions[0] != "22222222-2222-2222-2222-222222222222" {
		t.Fatalf("expected assigned permission to be stored, got %v", roleRepo.assignedPermissions)
	}
}

func TestAssignPermissionsAllowsEmptyListToClearRolePermissions(t *testing.T) {
	roleRepo := &roleRepoMock{
		role: domainrole.Role{Id: "role-1", Name: "custom", IsSystem: false},
	}
	service := &RoleService{
		RoleRepo:       roleRepo,
		PermissionRepo: &permissionRepoMock{},
		MenuRepo:       &menuRepoMock{},
	}

	err := service.AssignPermissions(authscope.WithContext(context.Background(), authscope.New("user-1", utils.RoleAdmin, []string{"roles:assign_permissions"})), "11111111-1111-1111-1111-111111111111", dto.AssignPermissions{
		PermissionIds: []string{},
	})
	if err != nil {
		t.Fatalf("expected empty permission list to clear role permissions, got %v", err)
	}
	if len(roleRepo.assignedPermissions) != 0 {
		t.Fatalf("expected no assigned permissions, got %v", roleRepo.assignedPermissions)
	}
}

func TestGetAllHidesSuperadminRoleForNonSuperadmin(t *testing.T) {
	service := &RoleService{
		RoleRepo: &roleRepoMock{
			roles: []domainrole.Role{
				{Id: "role-superadmin", Name: utils.RoleSuperAdmin},
				{Id: "role-admin", Name: utils.RoleAdmin},
				{Id: "role-dealer", Name: utils.RoleDealer},
			},
			total: 3,
		},
		PermissionRepo: &permissionRepoMock{},
		MenuRepo:       &menuRepoMock{},
	}

	roles, total, err := service.GetAll(authscope.WithContext(context.Background(), authscope.New("user-1", utils.RoleAdmin, []string{"roles:list"})), filter.BaseParams{})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if total != 2 {
		t.Fatalf("expected total 2 after hiding superadmin, got %d", total)
	}
	for _, role := range roles {
		if role.Name == utils.RoleSuperAdmin {
			t.Fatalf("expected superadmin to be hidden, got %+v", roles)
		}
	}
}

func TestGetAllShowsSuperadminRoleForSuperadmin(t *testing.T) {
	service := &RoleService{
		RoleRepo: &roleRepoMock{
			roles: []domainrole.Role{
				{Id: "role-superadmin", Name: utils.RoleSuperAdmin},
				{Id: "role-admin", Name: utils.RoleAdmin},
			},
			total: 2,
		},
		PermissionRepo: &permissionRepoMock{},
		MenuRepo:       &menuRepoMock{},
	}

	roles, total, err := service.GetAll(authscope.WithContext(context.Background(), authscope.New("user-1", utils.RoleSuperAdmin, nil)), filter.BaseParams{})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if total != 2 || len(roles) != 2 {
		t.Fatalf("expected superadmin to see all roles, got total=%d roles=%+v", total, roles)
	}
}

func TestGetByIDWithDetailsHidesSuperadminRoleForNonSuperadmin(t *testing.T) {
	service := &RoleService{
		RoleRepo: &roleRepoMock{
			role: domainrole.Role{Id: "role-superadmin", Name: utils.RoleSuperAdmin},
		},
		PermissionRepo: &permissionRepoMock{},
		MenuRepo:       &menuRepoMock{},
	}

	_, err := service.GetByIDWithDetails(authscope.WithContext(context.Background(), authscope.New("user-1", utils.RoleAdmin, []string{"roles:view"})), "role-superadmin")
	if err == nil || err.Error() != "role not found" {
		t.Fatalf("expected role not found, got %v", err)
	}
}

func TestGetByIDWithDetailsDerivesMenuIDsFromPermissionResources(t *testing.T) {
	parentID := "menu-dashboard"
	service := &RoleService{
		RoleRepo: &roleRepoMock{
			role:            domainrole.Role{Id: "role-1", Name: "custom", DisplayName: "Custom"},
			rolePermissions: []string{"perm-orders"},
		},
		PermissionRepo: &permissionRepoMock{
			permissionsByID: map[string]domainpermission.Permission{
				"perm-orders": {Id: "perm-orders", Resource: "orders", Action: "list"},
			},
		},
		MenuRepo: &menuRepoMock{
			activeMenus: []domainmenu.MenuItem{
				{Id: "menu-dashboard", Name: "dashboard", DisplayName: "Dashboard", IsActive: true, OrderIndex: 1},
				{Id: "menu-orders", Name: "orders", DisplayName: "Orders", ParentId: &parentID, IsActive: true, OrderIndex: 2},
			},
		},
	}

	data, err := service.GetByIDWithDetails(context.Background(), "role-1")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(data.PermissionIds) != 1 || data.PermissionIds[0] != "perm-orders" {
		t.Fatalf("expected permission ids to be preserved, got %v", data.PermissionIds)
	}
	if len(data.MenuIds) != 2 || data.MenuIds[0] != "menu-dashboard" || data.MenuIds[1] != "menu-orders" {
		t.Fatalf("expected menu ids derived from permissions, got %v", data.MenuIds)
	}
}
