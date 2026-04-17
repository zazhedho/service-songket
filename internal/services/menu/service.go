package servicemenu

import (
	"fmt"
	domainmenu "service-songket/internal/domain/menu"
	"service-songket/internal/dto"
	interfacemenu "service-songket/internal/interfaces/menu"
	interfacepermission "service-songket/internal/interfaces/permission"
	serviceshared "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"strings"
	"time"

	"github.com/google/uuid"
)

type MenuService struct {
	MenuRepo       interfacemenu.RepoMenuInterface
	PermissionRepo interfacepermission.RepoPermissionInterface
}

func NewMenuService(menuRepo interfacemenu.RepoMenuInterface, permissionRepo interfacepermission.RepoPermissionInterface) *MenuService {
	return &MenuService{
		MenuRepo:       menuRepo,
		PermissionRepo: permissionRepo,
	}
}

func (s *MenuService) GetByID(id string) (domainmenu.MenuItem, error) {
	return s.MenuRepo.GetByID(id)
}

func (s *MenuService) GetAll(params filter.BaseParams) ([]domainmenu.MenuItem, int64, error) {
	return s.MenuRepo.GetAll(params)
}

func (s *MenuService) GetActiveMenus() ([]domainmenu.MenuItem, error) {
	return s.MenuRepo.GetActiveMenus()
}

func (s *MenuService) GetUserMenus(userId string) ([]domainmenu.MenuItem, error) {
	activeMenus, err := s.MenuRepo.GetActiveMenus()
	if err != nil {
		return nil, err
	}

	permissions, err := s.PermissionRepo.GetUserPermissions(userId)
	if err != nil {
		return nil, err
	}

	resources := make([]string, 0, len(permissions))
	for _, permission := range permissions {
		if permission.Resource == "" {
			continue
		}
		resources = append(resources, permission.Resource)
	}

	return serviceshared.ResolveAccessibleMenus(activeMenus, resources), nil
}

func (s *MenuService) Update(id string, req dto.MenuUpdate) (domainmenu.MenuItem, error) {
	menu, err := s.MenuRepo.GetByID(id)
	if err != nil {
		return domainmenu.MenuItem{}, err
	}

	if req.DisplayName != "" {
		menu.DisplayName = req.DisplayName
	}
	if req.Path != "" {
		menu.Path = req.Path
	}
	if req.Icon != "" {
		menu.Icon = req.Icon
	}
	if req.ParentId != nil {
		parentId, err := normalizeOptionalParentID(req.ParentId)
		if err != nil {
			return domainmenu.MenuItem{}, err
		}
		menu.ParentId = parentId
	}
	if req.OrderIndex != nil {
		menu.OrderIndex = *req.OrderIndex
	}
	if req.IsActive != nil {
		menu.IsActive = *req.IsActive
	}
	now := time.Now()
	menu.UpdatedAt = &now

	if err := s.MenuRepo.Update(menu); err != nil {
		return domainmenu.MenuItem{}, err
	}

	return menu, nil
}

func normalizeOptionalParentID(parentID *string) (*string, error) {
	if parentID == nil {
		return nil, nil
	}

	trimmed := strings.TrimSpace(*parentID)
	if trimmed == "" {
		return nil, nil
	}

	if _, err := uuid.Parse(trimmed); err != nil {
		return nil, fmt.Errorf("parent_id must be a valid UUID")
	}

	return &trimmed, nil
}

var _ interfacemenu.ServiceMenuInterface = (*MenuService)(nil)
