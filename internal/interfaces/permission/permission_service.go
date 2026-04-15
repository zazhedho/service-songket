package interfacepermission

import (
	domainpermission "service-songket/internal/domain/permission"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServicePermissionInterface interface {
	Create(req dto.PermissionCreate) (domainpermission.Permission, error)
	GetByID(id string) (domainpermission.Permission, error)
	GetAll(params filter.BaseParams) ([]domainpermission.Permission, int64, error)
	GetByResource(resource string) ([]domainpermission.Permission, error)
	GetUserPermissions(userId string) ([]domainpermission.Permission, error)       // role + user perms
	GetUserDirectPermissions(userId string) ([]domainpermission.Permission, error) // only user_permissions
	SetUserPermissions(userId string, permissionIDs []string) error
	ListUserPermissionIDs(userId string) ([]string, error)
	Update(id string, req dto.PermissionUpdate) (domainpermission.Permission, error)
	Delete(id string) error
}
