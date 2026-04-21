package servicerole

import (
	"context"
	"errors"
	"fmt"
	"service-songket/internal/authscope"
	domainpermission "service-songket/internal/domain/permission"
	domainrole "service-songket/internal/domain/role"
	"service-songket/internal/dto"
	interfacemenu "service-songket/internal/interfaces/menu"
	interfacepermission "service-songket/internal/interfaces/permission"
	interfacerole "service-songket/internal/interfaces/role"
	serviceshared "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"strings"
	"time"

	"github.com/google/uuid"
)

type RoleService struct {
	RoleRepo       interfacerole.RepoRoleInterface
	PermissionRepo interfacepermission.RepoPermissionInterface
	MenuRepo       interfacemenu.RepoMenuInterface
}

func NewRoleService(
	roleRepo interfacerole.RepoRoleInterface,
	permissionRepo interfacepermission.RepoPermissionInterface,
	menuRepo interfacemenu.RepoMenuInterface,
) *RoleService {
	return &RoleService{
		RoleRepo:       roleRepo,
		PermissionRepo: permissionRepo,
		MenuRepo:       menuRepo,
	}
}

func (s *RoleService) Create(req dto.RoleCreate) (domainrole.Role, error) {
	existing, _ := s.RoleRepo.GetByName(req.Name)
	if existing.Id != "" {
		return domainrole.Role{}, errors.New("role with this name already exists")
	}

	data := domainrole.Role{
		Id:          utils.CreateUUID(),
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		IsSystem:    false,
		CreatedAt:   time.Now(),
	}

	if err := s.RoleRepo.Store(data); err != nil {
		return domainrole.Role{}, err
	}

	return data, nil
}

func (s *RoleService) GetByID(id string) (domainrole.Role, error) {
	return s.RoleRepo.GetByID(id)
}

func (s *RoleService) GetByIDWithDetails(id string) (dto.RoleWithDetails, error) {
	role, err := s.RoleRepo.GetByID(id)
	if err != nil {
		return dto.RoleWithDetails{}, err
	}

	permissionIds, err := s.RoleRepo.GetRolePermissions(id)
	if err != nil {
		return dto.RoleWithDetails{}, err
	}

	menuIds, err := s.deriveMenuIDsFromPermissions(permissionIds)
	if err != nil {
		return dto.RoleWithDetails{}, err
	}

	updatedAt := ""
	if role.UpdatedAt != nil {
		updatedAt = role.UpdatedAt.Format(time.RFC3339)
	}

	return dto.RoleWithDetails{
		Id:            role.Id,
		Name:          role.Name,
		DisplayName:   role.DisplayName,
		Description:   role.Description,
		IsSystem:      role.IsSystem,
		PermissionIds: permissionIds,
		MenuIds:       menuIds,
		CreatedAt:     role.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     updatedAt,
	}, nil
}

func (s *RoleService) GetAll(ctx context.Context, params filter.BaseParams) ([]domainrole.Role, int64, error) {
	roles, total, err := s.RoleRepo.GetAll(params)
	if err != nil {
		return nil, 0, err
	}
	scope := authscope.FromContext(ctx)

	if scope.Role != utils.RoleSuperAdmin {
		filteredRoles := make([]domainrole.Role, 0)
		for _, role := range roles {
			if role.Name != utils.RoleSuperAdmin {
				filteredRoles = append(filteredRoles, role)
			}
		}
		superadminCount := int64(len(roles) - len(filteredRoles))
		return filteredRoles, total - superadminCount, nil
	}

	return roles, total, nil
}

func (s *RoleService) Update(id string, req dto.RoleUpdate) (domainrole.Role, error) {
	role, err := s.RoleRepo.GetByID(id)
	if err != nil {
		return domainrole.Role{}, err
	}

	if role.IsSystem {
		return domainrole.Role{}, errors.New("cannot update system roles")
	}

	if req.DisplayName != "" {
		role.DisplayName = req.DisplayName
	}
	role.Description = req.Description
	now := time.Now()
	role.UpdatedAt = &now

	if err := s.RoleRepo.Update(role); err != nil {
		return domainrole.Role{}, err
	}

	return role, nil
}

func (s *RoleService) Delete(id string) error {
	role, err := s.RoleRepo.GetByID(id)
	if err != nil {
		return err
	}

	if role.IsSystem {
		return errors.New("cannot delete system roles")
	}

	return s.RoleRepo.Delete(id)
}

func (s *RoleService) AssignPermissions(ctx context.Context, roleId string, req dto.AssignPermissions) error {
	if _, err := uuid.Parse(strings.TrimSpace(roleId)); err != nil {
		return errors.New("invalid role ID")
	}
	scope := authscope.FromContext(ctx)

	permissionIDs, err := sanitizeUUIDList("permission_ids", req.PermissionIds)
	if err != nil {
		return err
	}

	role, err := s.RoleRepo.GetByID(roleId)
	if err != nil {
		return err
	}

	if role.IsSystem {
		if !scope.Has("roles", "manage_system") {
			return errors.New("access denied: missing permission roles:manage_system")
		}
		if role.Name == utils.RoleSuperAdmin && scope.Role != utils.RoleSuperAdmin {
			return errors.New("access denied: cannot modify superadmin role")
		}
	}

	for _, permId := range permissionIDs {
		if _, err := s.PermissionRepo.GetByID(permId); err != nil {
			return errors.New("invalid permission ID: " + permId)
		}
	}

	return s.RoleRepo.AssignPermissions(roleId, permissionIDs)
}

func sanitizeUUIDList(fieldName string, values []string) ([]string, error) {
	out := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))

	for _, raw := range values {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}

		if _, err := uuid.Parse(trimmed); err != nil {
			return nil, fmt.Errorf("%s contains invalid UUID: %s", fieldName, trimmed)
		}

		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}

	if len(out) == 0 {
		return nil, fmt.Errorf("%s must contain at least 1 valid UUID", fieldName)
	}

	return out, nil
}

func (s *RoleService) GetRolePermissions(roleId string) ([]string, error) {
	return s.RoleRepo.GetRolePermissions(roleId)
}

func (s *RoleService) deriveMenuIDsFromPermissions(permissionIds []string) ([]string, error) {
	resources := make([]string, 0, len(permissionIds))

	for _, permissionId := range permissionIds {
		permission, err := s.PermissionRepo.GetByID(permissionId)
		if err != nil {
			return nil, err
		}
		if permission.Resource == "" {
			continue
		}
		resources = append(resources, permission.Resource)
	}

	activeMenus, err := s.MenuRepo.GetActiveMenus()
	if err != nil {
		return nil, err
	}

	return serviceshared.ResolveAccessibleMenuIDs(activeMenus, resources), nil
}

func hasPermission(permissions []domainpermission.Permission, resource, action string) bool {
	for _, permission := range permissions {
		if permission.Resource == resource && permission.Action == action {
			return true
		}
	}
	return false
}

var _ interfacerole.ServiceRoleInterface = (*RoleService)(nil)
