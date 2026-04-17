package servicerole

import (
	"errors"
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
	rolePermissions     []string
	assignedPermissions []string
}

func (m *roleRepoMock) Store(data domainrole.Role) error { return nil }
func (m *roleRepoMock) GetByID(id string) (domainrole.Role, error) {
	return m.role, nil
}
func (m *roleRepoMock) GetByName(name string) (domainrole.Role, error) {
	return domainrole.Role{}, errors.New("not implemented")
}
func (m *roleRepoMock) GetAll(params filter.BaseParams) ([]domainrole.Role, int64, error) {
	return nil, 0, nil
}
func (m *roleRepoMock) Update(data domainrole.Role) error { return nil }
func (m *roleRepoMock) Delete(id string) error            { return nil }
func (m *roleRepoMock) AssignPermissions(roleId string, permissionIds []string) error {
	m.assignedPermissions = append([]string{}, permissionIds...)
	return nil
}
func (m *roleRepoMock) RemovePermissions(roleId string, permissionIds []string) error { return nil }
func (m *roleRepoMock) GetRolePermissions(roleId string) ([]string, error) {
	return append([]string{}, m.rolePermissions...), nil
}

type permissionRepoMock struct {
	permissionsByID map[string]domainpermission.Permission
	userPermissions []domainpermission.Permission
}

func (m *permissionRepoMock) Store(data domainpermission.Permission) error { return nil }
func (m *permissionRepoMock) GetByID(id string) (domainpermission.Permission, error) {
	permission, ok := m.permissionsByID[id]
	if !ok {
		return domainpermission.Permission{}, errors.New("not found")
	}
	return permission, nil
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
	return append([]domainpermission.Permission{}, m.userPermissions...), nil
}
func (m *permissionRepoMock) GetUserDirectPermissions(userId string) ([]domainpermission.Permission, error) {
	return nil, nil
}
func (m *permissionRepoMock) SetUserPermissions(userId string, permissionIDs []string) error {
	return nil
}
func (m *permissionRepoMock) ListUserPermissionIDs(userId string) ([]string, error) { return nil, nil }

type menuRepoMock struct {
	activeMenus []domainmenu.MenuItem
}

func (m *menuRepoMock) Store(data domainmenu.MenuItem) error { return nil }
func (m *menuRepoMock) GetByID(id string) (domainmenu.MenuItem, error) {
	return domainmenu.MenuItem{}, errors.New("not implemented")
}
func (m *menuRepoMock) GetByName(name string) (domainmenu.MenuItem, error) {
	return domainmenu.MenuItem{}, errors.New("not implemented")
}
func (m *menuRepoMock) GetAll(params filter.BaseParams) ([]domainmenu.MenuItem, int64, error) {
	return nil, 0, nil
}
func (m *menuRepoMock) Update(data domainmenu.MenuItem) error { return nil }
func (m *menuRepoMock) Delete(id string) error                { return nil }
func (m *menuRepoMock) GetActiveMenus() ([]domainmenu.MenuItem, error) {
	return append([]domainmenu.MenuItem{}, m.activeMenus...), nil
}
func (m *menuRepoMock) GetUserMenus(userId string) ([]domainmenu.MenuItem, error) { return nil, nil }

func TestAssignPermissionsRequiresManageSystemPermissionForSystemRole(t *testing.T) {
	service := &RoleService{
		RoleRepo: &roleRepoMock{
			role: domainrole.Role{Id: "role-1", Name: utils.RoleAdmin, IsSystem: true},
		},
		PermissionRepo: &permissionRepoMock{},
		MenuRepo:       &menuRepoMock{},
	}

	err := service.AssignPermissions("11111111-1111-1111-1111-111111111111", dto.AssignPermissions{
		PermissionIds: []string{"22222222-2222-2222-2222-222222222222"},
	}, "user-1", utils.RoleAdmin)
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

	err := service.AssignPermissions("11111111-1111-1111-1111-111111111111", dto.AssignPermissions{
		PermissionIds: []string{"22222222-2222-2222-2222-222222222222"},
	}, "user-1", utils.RoleAdmin)
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

	err := service.AssignPermissions("11111111-1111-1111-1111-111111111111", dto.AssignPermissions{
		PermissionIds: []string{"22222222-2222-2222-2222-222222222222"},
	}, "user-1", utils.RoleAdmin)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(roleRepo.assignedPermissions) != 1 || roleRepo.assignedPermissions[0] != "22222222-2222-2222-2222-222222222222" {
		t.Fatalf("expected assigned permission to be stored, got %v", roleRepo.assignedPermissions)
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

	data, err := service.GetByIDWithDetails("role-1")
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
