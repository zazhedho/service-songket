package serviceuser

import (
	"context"
	"errors"
	"service-songket/internal/authscope"
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
	users     []domainuser.Users
	total     int64
	usersByID map[string]domainuser.Users
	updated   domainuser.Users
	emailUser domainuser.Users
	emailErr  error
	phoneUser domainuser.Users
	phoneErr  error
	dealerIDs []string
}

func (m *userRepoMock) Store(ctx context.Context, data domainuser.Users) error {
	m.user = data
	return nil
}

func (m *userRepoMock) GetByEmail(ctx context.Context, email string) (domainuser.Users, error) {
	if m.emailErr != nil {
		return domainuser.Users{}, m.emailErr
	}
	return m.emailUser, nil
}

func (m *userRepoMock) GetByPhone(ctx context.Context, phone string) (domainuser.Users, error) {
	if m.phoneErr != nil {
		return domainuser.Users{}, m.phoneErr
	}
	return m.phoneUser, nil
}

func (m *userRepoMock) GetByID(ctx context.Context, id string) (domainuser.Users, error) {
	if m.usersByID != nil {
		user, ok := m.usersByID[id]
		if !ok {
			return domainuser.Users{}, errors.New("not found")
		}
		return user, nil
	}
	return m.user, nil
}

func (m *userRepoMock) GetAll(ctx context.Context, params filter.BaseParams) ([]domainuser.Users, int64, error) {
	return append([]domainuser.Users{}, m.users...), m.total, nil
}

func (m *userRepoMock) Update(ctx context.Context, data domainuser.Users) error {
	m.updated = data
	m.user = data
	return nil
}

func (m *userRepoMock) Delete(ctx context.Context, id string) error { return nil }

func (m *userRepoMock) ListUserDealerIDs(ctx context.Context, userID string) ([]string, error) {
	return append([]string{}, m.dealerIDs...), nil
}

func (m *userRepoMock) ListUserDealers(ctx context.Context, userID string) ([]domainuser.UserDealerAccess, error) {
	rows := make([]domainuser.UserDealerAccess, 0, len(m.dealerIDs))
	for _, dealerID := range m.dealerIDs {
		rows = append(rows, domainuser.UserDealerAccess{UserID: userID, DealerID: dealerID})
	}
	return rows, nil
}

func (m *userRepoMock) SetUserDealerIDs(ctx context.Context, userID string, dealerIDs []string) error {
	m.dealerIDs = append([]string{}, dealerIDs...)
	return nil
}

type authRepoMock struct{}

func (m *authRepoMock) Store(ctx context.Context, data domainauth.Blacklist) error { return nil }
func (m *authRepoMock) GetByToken(ctx context.Context, token string) (domainauth.Blacklist, error) {
	return domainauth.Blacklist{}, nil
}
func (m *authRepoMock) ExistsByToken(token string) (bool, error) { return false, nil }

type roleRepoMock struct {
	roles map[string]domainrole.Role
}

func (m *roleRepoMock) Store(ctx context.Context, data domainrole.Role) error { return nil }
func (m *roleRepoMock) GetByID(ctx context.Context, id string) (domainrole.Role, error) {
	return domainrole.Role{}, errors.New("not implemented")
}
func (m *roleRepoMock) GetByName(ctx context.Context, name string) (domainrole.Role, error) {
	role, ok := m.roles[name]
	if !ok {
		return domainrole.Role{}, errors.New("not found")
	}
	return role, nil
}
func (m *roleRepoMock) GetAll(ctx context.Context, params filter.BaseParams) ([]domainrole.Role, int64, error) {
	return nil, 0, nil
}
func (m *roleRepoMock) Update(ctx context.Context, data domainrole.Role) error { return nil }
func (m *roleRepoMock) Delete(ctx context.Context, id string) error            { return nil }
func (m *roleRepoMock) AssignPermissions(ctx context.Context, roleId string, permissionIds []string) error {
	return nil
}
func (m *roleRepoMock) RemovePermissions(ctx context.Context, roleId string, permissionIds []string) error {
	return nil
}
func (m *roleRepoMock) GetRolePermissions(ctx context.Context, roleId string) ([]string, error) {
	return nil, nil
}

type permissionRepoMock struct {
	userPermissions []domainpermission.Permission
	setCalls        []struct {
		userID        string
		permissionIDs []string
	}
}

func (m *permissionRepoMock) Store(ctx context.Context, data domainpermission.Permission) error {
	return nil
}
func (m *permissionRepoMock) GetByID(ctx context.Context, id string) (domainpermission.Permission, error) {
	return domainpermission.Permission{}, errors.New("not implemented")
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
	m.setCalls = append(m.setCalls, struct {
		userID        string
		permissionIDs []string
	}{userID: userId, permissionIDs: append([]string{}, permissionIDs...)})
	return nil
}
func (m *permissionRepoMock) ListUserPermissionIDs(ctx context.Context, userId string) ([]string, error) {
	return nil, nil
}

func TestRegisterUserDefaultsToDealerAndSanitizesFields(t *testing.T) {
	service := &ServiceUser{
		UserRepo:      &userRepoMock{},
		BlacklistRepo: &authRepoMock{},
		RoleRepo: &roleRepoMock{roles: map[string]domainrole.Role{
			utils.RoleDealer: {Id: "role-dealer", Name: utils.RoleDealer},
		}},
		PermissionRepo: &permissionRepoMock{},
	}

	user, err := service.RegisterUser(context.Background(), dto.UserRegister{
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

	_, err := service.AdminCreateUser(authscope.WithContext(context.Background(), authscope.New("creator-1", utils.RoleAdmin, nil)), dto.AdminCreateUser{
		Name:     "Jane Doe",
		Email:    "jane@example.com",
		Phone:    "08123456789",
		Password: "Password1!",
		Role:     utils.RoleAdmin,
	})
	if err == nil || err.Error() != "access denied: missing permission users:assign_role" {
		t.Fatalf("expected assign_role access error, got %v", err)
	}
}

func TestAdminCreateUserAssignsRoleIDFromSelectedRole(t *testing.T) {
	permissionRepo := &permissionRepoMock{}
	service := &ServiceUser{
		UserRepo:      &userRepoMock{},
		BlacklistRepo: &authRepoMock{},
		RoleRepo: &roleRepoMock{roles: map[string]domainrole.Role{
			utils.RoleAdmin: {Id: "role-admin", Name: utils.RoleAdmin},
		}},
		PermissionRepo: permissionRepo,
	}

	user, err := service.AdminCreateUser(
		authscope.WithContext(
			context.Background(),
			authscope.New("creator-1", utils.RoleAdmin, []string{"users:assign_role"}),
		),
		dto.AdminCreateUser{
			Name:     "Jane Admin",
			Email:    " Jane.Admin@Example.COM ",
			Phone:    "0812-2222-3333",
			Password: "Password1!",
			Role:     utils.RoleAdmin,
		},
	)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}

	if user.Role != utils.RoleAdmin {
		t.Fatalf("expected role %q, got %q", utils.RoleAdmin, user.Role)
	}
	if user.RoleId == nil || *user.RoleId != "role-admin" {
		t.Fatalf("expected admin role id to be assigned, got %+v", user.RoleId)
	}
	if user.Email != "jane.admin@example.com" {
		t.Fatalf("expected sanitized email, got %q", user.Email)
	}
	if user.Phone != "6281222223333" {
		t.Fatalf("expected normalized phone, got %q", user.Phone)
	}
	if len(permissionRepo.setCalls) != 0 {
		t.Fatalf("expected no direct user permission assignment, got %+v", permissionRepo.setCalls)
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

	user, err := service.Update(authscope.WithContext(context.Background(), authscope.New("editor-1", utils.RoleAdmin, nil)), "user-1", dto.UserUpdate{
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

func TestGetAllUsersHidesSuperadminForNonSuperadmin(t *testing.T) {
	service := &ServiceUser{
		UserRepo: &userRepoMock{
			users: []domainuser.Users{
				{Id: "user-superadmin", Role: utils.RoleSuperAdmin},
				{Id: "user-admin", Role: utils.RoleAdmin},
				{Id: "user-dealer", Role: utils.RoleDealer},
			},
			total: 3,
		},
		BlacklistRepo:  &authRepoMock{},
		RoleRepo:       &roleRepoMock{},
		PermissionRepo: &permissionRepoMock{},
	}

	users, total, err := service.GetAllUsers(authscope.WithContext(context.Background(), authscope.New("viewer-1", utils.RoleAdmin, []string{"users:list"})), filter.BaseParams{})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if total != 2 {
		t.Fatalf("expected total 2 after hiding superadmin, got %d", total)
	}
	for _, user := range users {
		if user.Role == utils.RoleSuperAdmin {
			t.Fatalf("expected superadmin user to be hidden, got %+v", users)
		}
	}
}

func TestGetAllUsersShowsSuperadminForSuperadmin(t *testing.T) {
	service := &ServiceUser{
		UserRepo: &userRepoMock{
			users: []domainuser.Users{
				{Id: "user-superadmin", Role: utils.RoleSuperAdmin},
				{Id: "user-admin", Role: utils.RoleAdmin},
			},
			total: 2,
		},
		BlacklistRepo:  &authRepoMock{},
		RoleRepo:       &roleRepoMock{},
		PermissionRepo: &permissionRepoMock{},
	}

	users, total, err := service.GetAllUsers(authscope.WithContext(context.Background(), authscope.New("viewer-1", utils.RoleSuperAdmin, nil)), filter.BaseParams{})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if total != 2 || len(users) != 2 {
		t.Fatalf("expected superadmin to see all users, got total=%d users=%+v", total, users)
	}
}

func TestGetUserByIDHidesSuperadminForNonSuperadmin(t *testing.T) {
	service := &ServiceUser{
		UserRepo: &userRepoMock{
			user: domainuser.Users{Id: "user-superadmin", Role: utils.RoleSuperAdmin},
		},
		BlacklistRepo:  &authRepoMock{},
		RoleRepo:       &roleRepoMock{},
		PermissionRepo: &permissionRepoMock{},
	}

	_, err := service.GetUserById(authscope.WithContext(context.Background(), authscope.New("viewer-1", utils.RoleAdmin, []string{"users:view"})), "user-superadmin")
	if err == nil {
		t.Fatal("expected hidden superadmin user to return error")
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

	_, err := service.Update(authscope.WithContext(context.Background(), authscope.New("editor-1", utils.RoleAdmin, nil)), "user-1", dto.UserUpdate{Role: utils.RoleAdmin})
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

	user, err := service.Update(authscope.WithContext(context.Background(), authscope.New("editor-1", utils.RoleAdmin, []string{"users:assign_role"})), "user-1", dto.UserUpdate{
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
