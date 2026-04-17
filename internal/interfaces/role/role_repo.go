package interfacerole

import (
	domainrole "service-songket/internal/domain/role"
	"service-songket/pkg/filter"
)

type RepoRoleInterface interface {
	Store(m domainrole.Role) error
	GetByID(id string) (domainrole.Role, error)
	GetByName(name string) (domainrole.Role, error)
	GetAll(params filter.BaseParams) ([]domainrole.Role, int64, error)
	Update(m domainrole.Role) error
	Delete(id string) error

	AssignPermissions(roleId string, permissionIds []string) error
	RemovePermissions(roleId string, permissionIds []string) error
	GetRolePermissions(roleId string) ([]string, error)
}
