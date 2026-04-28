package interfacepermission

import (
	"context"
	domainpermission "service-songket/internal/domain/permission"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoPermissionInterface interface {
	interfacegeneric.GenericRepository[domainpermission.Permission]

	GetByName(ctx context.Context, name string) (domainpermission.Permission, error)

	GetByResource(ctx context.Context, resource string) ([]domainpermission.Permission, error)
	GetUserPermissions(ctx context.Context, userId string) ([]domainpermission.Permission, error)       // role + user perms
	GetUserDirectPermissions(ctx context.Context, userId string) ([]domainpermission.Permission, error) // only user_permissions
	SetUserPermissions(ctx context.Context, userId string, permissionIDs []string) error
	ListUserPermissionIDs(ctx context.Context, userId string) ([]string, error)
}
