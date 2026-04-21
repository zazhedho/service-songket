package interfacerole

import (
	"context"
	domainrole "service-songket/internal/domain/role"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceRoleInterface interface {
	Create(req dto.RoleCreate) (domainrole.Role, error)
	GetByID(id string) (domainrole.Role, error)
	GetByIDWithDetails(id string) (dto.RoleWithDetails, error)
	GetAll(ctx context.Context, params filter.BaseParams) ([]domainrole.Role, int64, error)
	Update(id string, req dto.RoleUpdate) (domainrole.Role, error)
	Delete(id string) error
	AssignPermissions(ctx context.Context, roleId string, req dto.AssignPermissions) error
	GetRolePermissions(roleId string) ([]string, error)
}
