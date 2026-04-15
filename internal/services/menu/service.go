package servicemenu

import (
	"errors"
	"fmt"
	domainmenu "service-songket/internal/domain/menu"
	"service-songket/internal/dto"
	interfacemenu "service-songket/internal/interfaces/menu"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"strings"
	"time"

	"github.com/google/uuid"
)

type MenuService struct {
	MenuRepo interfacemenu.RepoMenuInterface
}

func NewMenuService(menuRepo interfacemenu.RepoMenuInterface) *MenuService {
	return &MenuService{
		MenuRepo: menuRepo,
	}
}

func (s *MenuService) Create(req dto.MenuCreate) (domainmenu.MenuItem, error) {
	existing, _ := s.MenuRepo.GetByName(req.Name)
	if existing.Id != "" {
		return domainmenu.MenuItem{}, errors.New("menu with this name already exists")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	parentId, err := normalizeOptionalParentID(req.ParentId)
	if err != nil {
		return domainmenu.MenuItem{}, err
	}

	data := domainmenu.MenuItem{
		Id:          utils.CreateUUID(),
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Path:        req.Path,
		Icon:        req.Icon,
		ParentId:    parentId,
		OrderIndex:  req.OrderIndex,
		IsActive:    isActive,
		CreatedAt:   time.Now(),
	}

	if err := s.MenuRepo.Store(data); err != nil {
		return domainmenu.MenuItem{}, err
	}

	return data, nil
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
	return s.MenuRepo.GetUserMenus(userId)
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

func (s *MenuService) Delete(id string) error {
	return s.MenuRepo.Delete(id)
}

var _ interfacemenu.ServiceMenuInterface = (*MenuService)(nil)
