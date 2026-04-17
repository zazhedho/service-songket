package serviceuser

import (
	"errors"
	domainauth "service-songket/internal/domain/auth"
	domainpermission "service-songket/internal/domain/permission"
	domainrole "service-songket/internal/domain/role"
	domainuser "service-songket/internal/domain/user"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

type userRepoMock struct {
	user      domainuser.Users
	usersByID map[string]domainuser.Users
	updated   domainuser.Users
	emailUser domainuser.Users
	emailErr  error
	phoneUser domainuser.Users
	phoneErr  error
}

func (m *userRepoMock) Store(data domainuser.Users) error {
	m.user = data
	return nil
}

func (m *userRepoMock) GetByEmail(email string) (domainuser.Users, error) {
	if m.emailErr != nil {
		return domainuser.Users{}, m.emailErr
	}
	return m.emailUser, nil
}

func (m *userRepoMock) GetByPhone(phone string) (domainuser.Users, error) {
	if m.phoneErr != nil {
		return domainuser.Users{}, m.phoneErr
	}
	return m.phoneUser, nil
}

func (m *userRepoMock) GetByID(id string) (domainuser.Users, error) {
	if m.usersByID != nil {
		user, ok := m.usersByID[id]
		if !ok {
			return domainuser.Users{}, errors.New("not found")
		}
		return user, nil
	}
	return m.user, nil
}

func (m *userRepoMock) GetAll(params filter.BaseParams) ([]domainuser.Users, int64, error) {
	return nil, 0, nil
}

func (m *userRepoMock) Update(data domainuser.Users) error {
	m.updated = data
	m.user = data
	return nil
}

func (m *userRepoMock) Delete(id string) error { return nil }

type authRepoMock struct{}

func (m *authRepoMock) Store(data domainauth.Blacklist) error { return nil }
func (m *authRepoMock) GetByToken(token string) (domainauth.Blacklist, error) {
	return domainauth.Blacklist{}, nil
}
func (m *authRepoMock) ExistsByToken(token string) (bool, error) { return false, nil }

type roleRepoMock struct {
	roles map[string]domainrole.Role
}

func (m *roleRepoMock) Store(data domainrole.Role) error { return nil }
func (m *roleRepoMock) GetByID(id string) (domainrole.Role, error) {
	return domainrole.Role{}, errors.New("not implemented")
}
func (m *roleRepoMock) GetByName(name string) (domainrole.Role, error) {
	role, ok := m.roles[name]
	if !ok {
		return domainrole.Role{}, errors.New("not found")
	}
	return role, nil
}
func (m *roleRepoMock) GetAll(params filter.BaseParams) ([]domainrole.Role, int64, error) {
	return nil, 0, nil
}
func (m *roleRepoMock) Update(data domainrole.Role) error { return nil }
func (m *roleRepoMock) Delete(id string) error            { return nil }
func (m *roleRepoMock) AssignPermissions(roleId string, permissionIds []string) error {
	return nil
}
func (m *roleRepoMock) RemovePermissions(roleId string, permissionIds []string) error {
	return nil
}
func (m *roleRepoMock) GetRolePermissions(roleId string) ([]string, error) { return nil, nil }

type permissionRepoMock struct {
	userPermissions []domainpermission.Permission
	setCalls        []struct {
		userID        string
		permissionIDs []string
	}
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
	return append([]domainpermission.Permission{}, m.userPermissions...), nil
}
func (m *permissionRepoMock) GetUserDirectPermissions(userId string) ([]domainpermission.Permission, error) {
	return nil, nil
}
func (m *permissionRepoMock) SetUserPermissions(userId string, permissionIDs []string) error {
	m.setCalls = append(m.setCalls, struct {
		userID        string
		permissionIDs []string
	}{userID: userId, permissionIDs: append([]string{}, permissionIDs...)})
	return nil
}
func (m *permissionRepoMock) ListUserPermissionIDs(userId string) ([]string, error) { return nil, nil }

func TestRegisterUserDefaultsToDealerAndSanitizesFields(t *testing.T) {
	service := &ServiceUser{
		UserRepo:      &userRepoMock{},
		BlacklistRepo: &authRepoMock{},
		RoleRepo: &roleRepoMock{roles: map[string]domainrole.Role{
			utils.RoleDealer: {Id: "role-dealer", Name: utils.RoleDealer},
		}},
		PermissionRepo: &permissionRepoMock{},
	}

	user, err := service.RegisterUser(dto.UserRegister{
		Name:     "jane doe",
		Email:    " Jane.Doe@Example.COM ",
		Phone:    "0812-3456-789",
		Password: "Password1!",
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}

	if user.Role != utils.RoleDealer {
		t.Fatalf("expected default role %q, got %q", utils.RoleDealer, user.Role)
	}
	if user.Email != "jane.doe@example.com" {
		t.Fatalf("expected sanitized email, got %q", user.Email)
	}
	if user.Phone != "628123456789" {
		t.Fatalf("expected normalized phone, got %q", user.Phone)
	}
	if user.RoleId == nil || *user.RoleId != "role-dealer" {
		t.Fatalf("expected dealer role id to be assigned, got %+v", user.RoleId)
	}
	if user.Password == "Password1!" {
		t.Fatal("expected password to be hashed")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte("Password1!")); err != nil {
		t.Fatalf("expected password hash to match original password, got %v", err)
	}
}

func TestAdminCreateUserRequiresAssignRoleForNonDefaultRole(t *testing.T) {
	service := &ServiceUser{
		UserRepo:      &userRepoMock{},
		BlacklistRepo: &authRepoMock{},
		RoleRepo: &roleRepoMock{roles: map[string]domainrole.Role{
			utils.RoleAdmin: {Id: "role-admin", Name: utils.RoleAdmin},
		}},
		PermissionRepo: &permissionRepoMock{},
	}

	_, err := service.AdminCreateUser(dto.AdminCreateUser{
		Name:     "Jane Doe",
		Email:    "jane@example.com",
		Phone:    "08123456789",
		Password: "Password1!",
		Role:     utils.RoleAdmin,
	}, "creator-1", utils.RoleAdmin)
	if err == nil || err.Error() != "access denied: missing permission users:assign_role" {
		t.Fatalf("expected assign_role access error, got %v", err)
	}
}

func TestUpdateAllowsNonRoleChangesWithoutAssignRole(t *testing.T) {
	service := &ServiceUser{
		UserRepo: &userRepoMock{
			user: domainuser.Users{
				Id:    "user-1",
				Name:  "Old Name",
				Email: "old@example.com",
				Phone: "628000000000",
				Role:  utils.RoleDealer,
			},
		},
		BlacklistRepo:  &authRepoMock{},
		RoleRepo:       &roleRepoMock{},
		PermissionRepo: &permissionRepoMock{},
	}

	user, err := service.Update("user-1", "editor-1", utils.RoleAdmin, dto.UserUpdate{
		Name:  "Jane Doe",
		Email: " Jane.New@Example.COM ",
		Phone: "0812 3456 789",
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}

	if user.Role != utils.RoleDealer {
		t.Fatalf("expected role to stay unchanged, got %q", user.Role)
	}
	if user.Email != "jane.new@example.com" {
		t.Fatalf("expected sanitized email, got %q", user.Email)
	}
	if user.Phone != "628123456789" {
		t.Fatalf("expected normalized phone, got %q", user.Phone)
	}
}

func TestUpdateRequiresAssignRolePermissionWhenChangingRole(t *testing.T) {
	service := &ServiceUser{
		UserRepo: &userRepoMock{
			user: domainuser.Users{Id: "user-1", Role: utils.RoleDealer},
		},
		BlacklistRepo: &authRepoMock{},
		RoleRepo: &roleRepoMock{roles: map[string]domainrole.Role{
			utils.RoleAdmin: {Id: "role-admin", Name: utils.RoleAdmin},
		}},
		PermissionRepo: &permissionRepoMock{},
	}

	_, err := service.Update("user-1", "editor-1", utils.RoleAdmin, dto.UserUpdate{Role: utils.RoleAdmin})
	if err == nil || err.Error() != "access denied: missing permission users:assign_role" {
		t.Fatalf("expected assign_role access error, got %v", err)
	}
}

func TestUpdateWithAssignRolePermissionCanChangeRoleAndOtherFields(t *testing.T) {
	service := &ServiceUser{
		UserRepo: &userRepoMock{
			user: domainuser.Users{
				Id:    "user-1",
				Name:  "Old Name",
				Email: "old@example.com",
				Phone: "628111111111",
				Role:  utils.RoleDealer,
			},
		},
		BlacklistRepo: &authRepoMock{},
		RoleRepo: &roleRepoMock{roles: map[string]domainrole.Role{
			utils.RoleAdmin: {Id: "role-admin", Name: utils.RoleAdmin},
		}},
		PermissionRepo: &permissionRepoMock{
			userPermissions: []domainpermission.Permission{{Resource: "users", Action: "assign_role"}},
		},
	}

	user, err := service.Update("user-1", "editor-1", utils.RoleAdmin, dto.UserUpdate{
		Name:     "Jane Admin",
		Email:    "ADMIN@Example.COM",
		Phone:    "0812-0000-0000",
		Password: "Password1!",
		Role:     utils.RoleAdmin,
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}

	if user.Role != utils.RoleAdmin {
		t.Fatalf("expected role to change to admin, got %q", user.Role)
	}
	if user.RoleId == nil || *user.RoleId != "role-admin" {
		t.Fatalf("expected admin role id to be assigned, got %+v", user.RoleId)
	}
	if user.Email != "admin@example.com" {
		t.Fatalf("expected sanitized email, got %q", user.Email)
	}
	if user.Phone != "6281200000000" {
		t.Fatalf("expected normalized phone, got %q", user.Phone)
	}
	if user.Password == "Password1!" {
		t.Fatal("expected password to be hashed")
	}
}
