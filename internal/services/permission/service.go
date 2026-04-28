package servicepermission

import (
	"context"
	"errors"
	"fmt"
	domainpermission "service-songket/internal/domain/permission"
	"service-songket/internal/dto"
	interfacepermission "service-songket/internal/interfaces/permission"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"strings"
	"time"

	"github.com/google/uuid"
)

type PermissionService struct {
	PermissionRepo interfacepermission.RepoPermissionInterface
}

func NewPermissionService(permissionRepo interfacepermission.RepoPermissionInterface) *PermissionService {
	return &PermissionService{
		PermissionRepo: permissionRepo,
	}
}

func (s *PermissionService) Create(ctx context.Context, req dto.PermissionCreate) (domainpermission.Permission, error) {
	existing, _ := s.PermissionRepo.GetByName(ctx, req.Name)
	if existing.Id != "" {
		return domainpermission.Permission{}, errors.New("permission with this name already exists")
	}

	data := domainpermission.Permission{
		Id:          utils.CreateUUID(),
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		Resource:    req.Resource,
		Action:      req.Action,
		CreatedAt:   time.Now(),
	}

	if err := s.PermissionRepo.Store(ctx, data); err != nil {
		return domainpermission.Permission{}, err
	}

	return data, nil
}

func (s *PermissionService) GetByID(ctx context.Context, id string) (domainpermission.Permission, error) {
	return s.PermissionRepo.GetByID(ctx, id)
}

func (s *PermissionService) GetAll(ctx context.Context, params filter.BaseParams) ([]domainpermission.Permission, int64, error) {
	return s.PermissionRepo.GetAll(ctx, params)
}

func (s *PermissionService) GetByResource(ctx context.Context, resource string) ([]domainpermission.Permission, error) {
	return s.PermissionRepo.GetByResource(ctx, resource)
}

func (s *PermissionService) GetUserPermissions(ctx context.Context, userId string) ([]domainpermission.Permission, error) {
	return s.PermissionRepo.GetUserPermissions(ctx, userId)
}

func (s *PermissionService) GetUserDirectPermissions(ctx context.Context, userId string) ([]domainpermission.Permission, error) {
	return s.PermissionRepo.GetUserDirectPermissions(ctx, userId)
}

func (s *PermissionService) SetUserPermissions(ctx context.Context, userId string, permissionIDs []string) error {
	trimmedUserID := strings.TrimSpace(userId)
	if _, err := uuid.Parse(trimmedUserID); err != nil {
		return errors.New("invalid user ID")
	}

	normalizedPermissionIDs := make([]string, 0, len(permissionIDs))
	seen := make(map[string]struct{}, len(permissionIDs))

	for _, rawID := range permissionIDs {
		trimmedID := strings.TrimSpace(rawID)
		if trimmedID == "" {
			continue
		}

		if _, err := uuid.Parse(trimmedID); err != nil {
			return fmt.Errorf("permission_ids contains invalid UUID: %s", trimmedID)
		}

		if _, exists := seen[trimmedID]; exists {
			continue
		}
		seen[trimmedID] = struct{}{}
		normalizedPermissionIDs = append(normalizedPermissionIDs, trimmedID)
	}

	if len(permissionIDs) > 0 && len(normalizedPermissionIDs) == 0 {
		return errors.New("permission_ids must contain valid UUID values")
	}

	for _, permissionID := range normalizedPermissionIDs {
		if _, err := s.PermissionRepo.GetByID(ctx, permissionID); err != nil {
			return errors.New("invalid permission ID: " + permissionID)
		}
	}

	return s.PermissionRepo.SetUserPermissions(ctx, trimmedUserID, normalizedPermissionIDs)
}

func (s *PermissionService) ListUserPermissionIDs(ctx context.Context, userId string) ([]string, error) {
	return s.PermissionRepo.ListUserPermissionIDs(ctx, userId)
}

func (s *PermissionService) Update(ctx context.Context, id string, req dto.PermissionUpdate) (domainpermission.Permission, error) {
	permission, err := s.PermissionRepo.GetByID(ctx, id)
	if err != nil {
		return domainpermission.Permission{}, err
	}

	if req.DisplayName != "" {
		permission.DisplayName = req.DisplayName
	}
	permission.Description = req.Description
	if req.Resource != "" {
		permission.Resource = req.Resource
	}
	if req.Action != "" {
		permission.Action = req.Action
	}
	now := time.Now()
	permission.UpdatedAt = &now

	if err := s.PermissionRepo.Update(ctx, permission); err != nil {
		return domainpermission.Permission{}, err
	}

	return permission, nil
}

func (s *PermissionService) Delete(ctx context.Context, id string) error {
	return s.PermissionRepo.Delete(ctx, id)
}

var _ interfacepermission.ServicePermissionInterface = (*PermissionService)(nil)
