package serviceuser

import (
	"context"
	"errors"
	"regexp"
	"service-songket/internal/authscope"
	domainauth "service-songket/internal/domain/auth"
	domaindealer "service-songket/internal/domain/dealer"
	domainpermission "service-songket/internal/domain/permission"
	domainuser "service-songket/internal/domain/user"
	"service-songket/internal/dto"
	interfaceauth "service-songket/internal/interfaces/auth"
	interfacepermission "service-songket/internal/interfaces/permission"
	interfacerole "service-songket/internal/interfaces/role"
	interfaceuser "service-songket/internal/interfaces/user"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type ServiceUser struct {
	UserRepo       interfaceuser.RepoUserInterface
	BlacklistRepo  interfaceauth.RepoAuthInterface
	RoleRepo       interfacerole.RepoRoleInterface
	PermissionRepo interfacepermission.RepoPermissionInterface
}

func NewUserService(userRepo interfaceuser.RepoUserInterface, blacklistRepo interfaceauth.RepoAuthInterface, roleRepo interfacerole.RepoRoleInterface, permissionRepo interfacepermission.RepoPermissionInterface) *ServiceUser {
	return &ServiceUser{
		UserRepo:       userRepo,
		BlacklistRepo:  blacklistRepo,
		RoleRepo:       roleRepo,
		PermissionRepo: permissionRepo,
	}
}

func ValidatePasswordStrength(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters long")
	}

	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	if !hasLower {
		return errors.New("password must contain at least 1 lowercase letter (a-z)")
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	if !hasUpper {
		return errors.New("password must contain at least 1 uppercase letter (A-Z)")
	}

	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	if !hasNumber {
		return errors.New("password must contain at least 1 number (0-9)")
	}

	hasSymbol := regexp.MustCompile(`[^a-zA-Z0-9]`).MatchString(password)
	if !hasSymbol {
		return errors.New("password must contain at least 1 symbol (!@#$%^&*...)")
	}

	return nil
}

func (s *ServiceUser) RegisterUser(ctx context.Context, req dto.UserRegister) (domainuser.Users, error) {
	phone := utils.NormalizePhoneTo62(req.Phone)
	email := utils.SanitizeEmail(req.Email)

	data, _ := s.UserRepo.GetByEmail(ctx, email)
	if data.Id != "" {
		return domainuser.Users{}, errors.New("email already exists")
	}

	phoneData, _ := s.UserRepo.GetByPhone(ctx, phone)
	if phoneData.Id != "" {
		return domainuser.Users{}, errors.New("phone number already exists")
	}

	if err := ValidatePasswordStrength(req.Password); err != nil {
		return domainuser.Users{}, err
	}

	roleName := defaultRegisterRoleName()
	roleEntity, err := s.RoleRepo.GetByName(ctx, roleName)
	if err != nil || roleEntity.Id == "" {
		return domainuser.Users{}, errors.New("invalid role: " + roleName)
	}
	roleId := roleEntity.Id

	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return domainuser.Users{}, err
	}

	data = domainuser.Users{
		Id:        utils.CreateUUID(),
		Name:      utils.TitleCase(req.Name),
		Phone:     phone,
		Email:     email,
		Password:  string(hashedPwd),
		Role:      roleName,
		RoleId:    &roleId,
		CreatedAt: time.Now(),
	}

	if err = s.UserRepo.Store(ctx, data); err != nil {
		return domainuser.Users{}, err
	}

	return data, nil
}

func (s *ServiceUser) AdminCreateUser(ctx context.Context, req dto.AdminCreateUser) (domainuser.Users, error) {
	phone := utils.NormalizePhoneTo62(req.Phone)
	email := utils.SanitizeEmail(req.Email)
	scope := authscope.FromContext(ctx)

	data, _ := s.UserRepo.GetByEmail(ctx, email)
	if data.Id != "" {
		return domainuser.Users{}, errors.New("email already exists")
	}

	if phone == "" {
		return domainuser.Users{}, errors.New("phone number is required")
	}
	phoneData, _ := s.UserRepo.GetByPhone(ctx, phone)
	if phoneData.Id != "" {
		return domainuser.Users{}, errors.New("phone number already exists")
	}

	if err := ValidatePasswordStrength(req.Password); err != nil {
		return domainuser.Users{}, err
	}

	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return domainuser.Users{}, err
	}

	roleName := normalizeRoleName(req.Role)
	if roleName == "" {
		roleName = defaultRegisterRoleName()
	}

	if roleName != defaultRegisterRoleName() && !scope.Has("users", "assign_role") {
		return domainuser.Users{}, errors.New("access denied: missing permission users:assign_role")
	}

	if roleName == utils.RoleSuperAdmin && scope.Role != utils.RoleSuperAdmin {
		return domainuser.Users{}, errors.New("only superadmin can create superadmin users")
	}

	var roleId *string
	roleEntity, err := s.RoleRepo.GetByName(ctx, roleName)
	if err == nil && roleEntity.Id != "" {
		roleId = &roleEntity.Id
	} else {
		return domainuser.Users{}, errors.New("invalid role: " + roleName)
	}

	data = domainuser.Users{
		Id:        utils.CreateUUID(),
		Name:      utils.TitleCase(req.Name),
		Phone:     phone,
		Email:     email,
		Password:  string(hashedPwd),
		Role:      roleName,
		RoleId:    roleId,
		CreatedAt: time.Now(),
	}

	if err = s.UserRepo.Store(ctx, data); err != nil {
		return domainuser.Users{}, err
	}

	// Apply user-specific permissions if provided
	if len(req.PermissionIDs) > 0 {
		if err := s.PermissionRepo.SetUserPermissions(ctx, data.Id, req.PermissionIDs); err != nil {
			return domainuser.Users{}, err
		}
	}

	if len(req.DealerIDs) > 0 {
		if err := s.UserRepo.SetUserDealerIDs(ctx, data.Id, req.DealerIDs); err != nil {
			return domainuser.Users{}, err
		}
	}
	data, _ = s.hydrateUserDealerAccess(ctx, data)

	return data, nil
}

func (s *ServiceUser) LoginUser(ctx context.Context, req dto.Login, logId string) (string, error) {
	email := utils.SanitizeEmail(req.Email)

	data, err := s.UserRepo.GetByEmail(ctx, email)
	if err != nil {
		return "", err
	}

	if err = bcrypt.CompareHashAndPassword([]byte(data.Password), []byte(req.Password)); err != nil {
		return "", err
	}

	token, err := utils.GenerateJwt(&data, logId)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (s *ServiceUser) LogoutUser(ctx context.Context, token string) error {
	blacklist := domainauth.Blacklist{
		ID:        utils.CreateUUID(),
		Token:     token,
		CreatedAt: time.Now(),
	}

	err := s.BlacklistRepo.Store(ctx, blacklist)
	if err != nil {
		return err
	}

	return nil
}

func normalizeRoleName(r string) string {
	role := strings.ToLower(strings.TrimSpace(r))
	role = strings.ReplaceAll(role, " ", "_")
	role = strings.ReplaceAll(role, "-", "_")
	return role
}

func defaultRegisterRoleName() string {
	if strings.TrimSpace(utils.RoleDealer) != "" {
		return utils.RoleDealer
	}
	return "dealer"
}

func hasUserPermission(permissions []domainpermission.Permission, resource, action string) bool {
	for _, permission := range permissions {
		if permission.Resource == resource && permission.Action == action {
			return true
		}
	}
	return false
}

func (s *ServiceUser) GetUserById(ctx context.Context, id string) (domainuser.Users, error) {
	user, err := s.UserRepo.GetByID(ctx, id)
	if err != nil {
		return domainuser.Users{}, err
	}
	if user.Role == utils.RoleSuperAdmin && authscope.FromContext(ctx).Role != utils.RoleSuperAdmin {
		return domainuser.Users{}, gorm.ErrRecordNotFound
	}
	return s.hydrateUserDealerAccess(ctx, user)
}

func (s *ServiceUser) GetUserByEmail(ctx context.Context, email string) (domainuser.Users, error) {
	return s.UserRepo.GetByEmail(ctx, utils.SanitizeEmail(email))
}

func (s *ServiceUser) GetUserByAuth(ctx context.Context, id string) (map[string]interface{}, error) {
	user, err := s.UserRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	user, _ = s.hydrateUserDealerAccess(ctx, user)

	permissions, err := s.PermissionRepo.GetUserPermissions(ctx, user.Id)
	if err != nil {
		return map[string]interface{}{
			"id":          user.Id,
			"name":        user.Name,
			"email":       user.Email,
			"phone":       user.Phone,
			"role":        user.Role,
			"dealer_ids":  user.DealerIDs,
			"dealers":     user.Dealers,
			"permissions": []string{},
			"created_at":  user.CreatedAt,
			"updated_at":  user.UpdatedAt,
		}, nil
	}

	permissionNames := []string{}
	for _, permission := range permissions {
		permissionNames = append(permissionNames, permission.Name)
	}

	return map[string]interface{}{
		"id":          user.Id,
		"name":        user.Name,
		"email":       user.Email,
		"phone":       user.Phone,
		"role":        user.Role,
		"dealer_ids":  user.DealerIDs,
		"dealers":     user.Dealers,
		"permissions": permissionNames,
		"created_at":  user.CreatedAt,
		"updated_at":  user.UpdatedAt,
	}, nil
}

func (s *ServiceUser) GetAllUsers(ctx context.Context, params filter.BaseParams) ([]domainuser.Users, int64, error) {
	users, total, err := s.UserRepo.GetAll(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	scope := authscope.FromContext(ctx)

	if scope.Role != utils.RoleSuperAdmin {
		filteredUsers := make([]domainuser.Users, 0)
		for _, user := range users {
			if user.Role != utils.RoleSuperAdmin {
				user, _ = s.hydrateUserDealerAccess(ctx, user)
				filteredUsers = append(filteredUsers, user)
			}
		}
		superadminCount := int64(len(users) - len(filteredUsers))
		return filteredUsers, total - superadminCount, nil
	}

	for i := range users {
		users[i], _ = s.hydrateUserDealerAccess(ctx, users[i])
	}
	return users, total, nil
}

func (s *ServiceUser) Update(ctx context.Context, id string, req dto.UserUpdate) (domainuser.Users, error) {
	data, err := s.UserRepo.GetByID(ctx, id)
	if err != nil {
		return domainuser.Users{}, err
	}
	scope := authscope.FromContext(ctx)

	if data.Role == utils.RoleSuperAdmin && scope.Role != utils.RoleSuperAdmin {
		return domainuser.Users{}, errors.New("cannot modify superadmin users")
	}

	if req.Name != "" {
		data.Name = req.Name
	}

	if req.Phone != "" {
		phone := utils.NormalizePhoneTo62(req.Phone)
		phoneData, _ := s.UserRepo.GetByPhone(ctx, phone)
		if phoneData.Id != "" && phoneData.Id != data.Id {
			return domainuser.Users{}, errors.New("phone number already exists")
		}
		data.Phone = phone
	}

	if strings.TrimSpace(data.Phone) == "" {
		return domainuser.Users{}, errors.New("phone number is required")
	}

	if req.Email != "" {
		email := utils.SanitizeEmail(req.Email)
		emailData, _ := s.UserRepo.GetByEmail(ctx, email)
		if emailData.Id != "" && emailData.Id != data.Id {
			return domainuser.Users{}, errors.New("email already exists")
		}
		data.Email = email
	}

	if req.Password != "" {
		if err := ValidatePasswordStrength(req.Password); err != nil {
			return domainuser.Users{}, err
		}

		hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return domainuser.Users{}, err
		}
		data.Password = string(hashedPwd)
	}

	if strings.TrimSpace(req.Role) != "" {
		newRoleName := normalizeRoleName(req.Role)
		if newRoleName != strings.TrimSpace(data.Role) {
			if !scope.Has("users", "assign_role") {
				return domainuser.Users{}, errors.New("access denied: missing permission users:assign_role")
			}

			if newRoleName == utils.RoleSuperAdmin && scope.Role != utils.RoleSuperAdmin {
				return domainuser.Users{}, errors.New("cannot assign superadmin role")
			}

			roleEntity, err := s.RoleRepo.GetByName(ctx, newRoleName)
			if err != nil || roleEntity.Id == "" {
				return domainuser.Users{}, errors.New("invalid role: " + newRoleName)
			}

			data.Role = newRoleName
			data.RoleId = &roleEntity.Id
		}
	}

	if err = s.UserRepo.Update(ctx, data); err != nil {
		return domainuser.Users{}, err
	}

	if req.DealerIDs != nil {
		if err := s.UserRepo.SetUserDealerIDs(ctx, data.Id, req.DealerIDs); err != nil {
			return domainuser.Users{}, err
		}
	}

	return s.hydrateUserDealerAccess(ctx, data)
}

func (s *ServiceUser) ChangePassword(ctx context.Context, id string, req dto.ChangePassword) (domainuser.Users, error) {
	if req.CurrentPassword == req.NewPassword {
		return domainuser.Users{}, errors.New("new password must be different from current password")
	}

	if err := ValidatePasswordStrength(req.NewPassword); err != nil {
		return domainuser.Users{}, err
	}

	data, err := s.UserRepo.GetByID(ctx, id)
	if err != nil {
		return domainuser.Users{}, err
	}

	if err = bcrypt.CompareHashAndPassword([]byte(data.Password), []byte(req.CurrentPassword)); err != nil {
		return domainuser.Users{}, err
	}

	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return domainuser.Users{}, err
	}

	data.Password = string(hashedPwd)

	if err = s.UserRepo.Update(ctx, data); err != nil {
		return domainuser.Users{}, err
	}

	return data, nil
}

func (s *ServiceUser) ForgotPassword(ctx context.Context, req dto.ForgotPasswordRequest) (string, error) {
	data, err := s.UserRepo.GetByEmail(ctx, utils.SanitizeEmail(req.Email))
	if err != nil {
		return "", nil
	}

	token, err := utils.GenerateJwt(&data, "reset_password")
	if err != nil {
		return "", err
	}

	return token, nil
}

func (s *ServiceUser) ResetPassword(ctx context.Context, req dto.ResetPasswordRequest) error {
	if err := ValidatePasswordStrength(req.NewPassword); err != nil {
		return err
	}

	claims, err := utils.JwtClaim(req.Token)
	if err != nil {
		return errors.New("invalid or expired token")
	}

	userId := claims["user_id"].(string)

	data, err := s.UserRepo.GetByID(ctx, userId)
	if err != nil {
		return errors.New("user not found")
	}

	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	data.Password = string(hashedPwd)

	if err = s.UserRepo.Update(ctx, data); err != nil {
		return err
	}

	_ = s.LogoutUser(ctx, req.Token)

	return nil
}

func (s *ServiceUser) Delete(ctx context.Context, id string) error {
	return s.UserRepo.Delete(ctx, id)
}

var _ interfaceuser.ServiceUserInterface = (*ServiceUser)(nil)

func (s *ServiceUser) hydrateUserDealerAccess(ctx context.Context, user domainuser.Users) (domainuser.Users, error) {
	accessRows, err := s.UserRepo.ListUserDealers(ctx, user.Id)
	if err != nil {
		return user, err
	}

	user.DealerIDs = make([]string, 0, len(accessRows))
	user.Dealers = make([]domaindealer.Dealer, 0, len(accessRows))
	for _, row := range accessRows {
		dealerID := strings.TrimSpace(row.DealerID)
		if dealerID == "" {
			continue
		}
		user.DealerIDs = append(user.DealerIDs, dealerID)
		if row.Dealer != nil {
			user.Dealers = append(user.Dealers, *row.Dealer)
		}
	}
	return user, nil
}
