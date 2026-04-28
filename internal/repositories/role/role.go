package repositoryrole

import (
	"context"
	"service-songket/internal/authscope"
	domainrole "service-songket/internal/domain/role"
	interfacerole "service-songket/internal/interfaces/role"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"
	"service-songket/utils"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domainrole.Role]
}

func NewRoleRepo(db *gorm.DB) interfacerole.RepoRoleInterface {
	return &repo{GenericRepository: repositorygeneric.New[domainrole.Role](db)}
}

func (r *repo) GetByName(ctx context.Context, name string) (ret domainrole.Role, err error) {
	return r.GetOneByField(ctx, "name", name)
}

func (r *repo) GetAll(ctx context.Context, params filter.BaseParams) (ret []domainrole.Role, totalData int64, err error) {
	return r.GenericRepository.GetAll(ctx, params, repositorygeneric.QueryOptions{
		BaseQuery: func(query *gorm.DB) *gorm.DB {
			if authscope.FromContext(ctx).Role == utils.RoleSuperAdmin {
				return query
			}
			return query.Where("name <> ?", utils.RoleSuperAdmin)
		},
		Search:         repositorygeneric.BuildSearchFunc("name", "display_name", "description"),
		AllowedFilters: []string{"id", "name", "display_name", "is_system", "created_at", "updated_at"},
		AllowedOrderColumns: []string{
			"name",
			"display_name",
			"is_system",
			"created_at",
			"updated_at",
		},
	})
}

func (r *repo) AssignPermissions(ctx context.Context, roleId string, permissionIds []string) error {
	tx := r.DB.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Where("role_id = ?", roleId).Delete(&domainrole.RolePermission{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	for _, permissionId := range permissionIds {
		rolePermission := domainrole.RolePermission{
			Id:           utils.CreateUUID(),
			RoleId:       roleId,
			PermissionId: permissionId,
		}
		if err := tx.Create(&rolePermission).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

func (r *repo) RemovePermissions(ctx context.Context, roleId string, permissionIds []string) error {
	return r.DB.WithContext(ctx).Where("role_id = ? AND permission_id IN ?", roleId, permissionIds).Delete(&domainrole.RolePermission{}).Error
}

func (r *repo) GetRolePermissions(ctx context.Context, roleId string) ([]string, error) {
	var rolePermissions []domainrole.RolePermission
	if err := r.DB.WithContext(ctx).Where("role_id = ?", roleId).Find(&rolePermissions).Error; err != nil {
		return nil, err
	}

	permissionIds := make([]string, len(rolePermissions))
	for i, rp := range rolePermissions {
		permissionIds[i] = rp.PermissionId
	}

	return permissionIds, nil
}
