package interfacerole

import (
	"context"
	domainrole "service-songket/internal/domain/role"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoRoleInterface interface {
	interfacegeneric.GenericRepository[domainrole.Role]

	GetByName(ctx context.Context, name string) (domainrole.Role, error)

	AssignPermissions(ctx context.Context, roleId string, permissionIds []string) error
	RemovePermissions(ctx context.Context, roleId string, permissionIds []string) error
	GetRolePermissions(ctx context.Context, roleId string) ([]string, error)
}
