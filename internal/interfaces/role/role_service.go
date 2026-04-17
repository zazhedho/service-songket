package interfacerole

import (
	domainrole "service-songket/internal/domain/role"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceRoleInterface interface {
	Create(req dto.RoleCreate) (domainrole.Role, error)
	GetByID(id string) (domainrole.Role, error)
	GetByIDWithDetails(id string) (dto.RoleWithDetails, error)
	GetAll(params filter.BaseParams, currentUserRole string) ([]domainrole.Role, int64, error)
	Update(id string, req dto.RoleUpdate) (domainrole.Role, error)
	Delete(id string) error
	AssignPermissions(roleId string, req dto.AssignPermissions, currentUserId, currentUserRole string) error
	GetRolePermissions(roleId string) ([]string, error)
}
