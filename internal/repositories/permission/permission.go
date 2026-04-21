package repositorypermission

import (
	"context"
	"log"
	domainpermission "service-songket/internal/domain/permission"
	interfacepermission "service-songket/internal/interfaces/permission"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"
	"service-songket/utils"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type repo struct {
	*repositorygeneric.GenericRepository[domainpermission.Permission]
}

func NewPermissionRepo(db *gorm.DB) interfacepermission.RepoPermissionInterface {
	return &repo{GenericRepository: repositorygeneric.New[domainpermission.Permission](db)}
}

func (r *repo) GetByName(ctx context.Context, name string) (ret domainpermission.Permission, err error) {
	return r.GetOneByField(ctx, "name", name)
}

func (r *repo) GetAll(ctx context.Context, params filter.BaseParams) (ret []domainpermission.Permission, totalData int64, err error) {
	return r.GenericRepository.GetAll(ctx, params, repositorygeneric.QueryOptions{
		Search:         repositorygeneric.BuildSearchFunc("name", "display_name", "description", "resource"),
		AllowedFilters: []string{"id", "name", "display_name", "resource", "action", "created_at", "updated_at"},
		AllowedOrderColumns: []string{
			"name",
			"display_name",
			"resource",
			"action",
			"created_at",
			"updated_at",
		},
	})
}

func (r *repo) GetByResource(ctx context.Context, resource string) (ret []domainpermission.Permission, err error) {
	return r.GetManyByField(ctx, "resource", resource)
}

func (r *repo) GetUserPermissions(ctx context.Context, userId string) (ret []domainpermission.Permission, err error) {
	var user struct {
		RoleId *string
		Role   string
	}
	if err = r.DB.WithContext(ctx).Table("users").Select("role_id, role").Where("id = ?", userId).First(&user).Error; err != nil {
		return nil, err
	}

	if user.Role == utils.RoleSuperAdmin {
		if err = r.DB.WithContext(ctx).Where("deleted_at IS NULL").Order("resource, action").Find(&ret).Error; err != nil {
			return nil, err
		}
		return ret, nil
	}

	if user.RoleId == nil || *user.RoleId == "" {
		return r.GetUserDirectPermissions(ctx, userId)
	}

	query := `
		SELECT DISTINCT p.*
		FROM permissions p
		LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = ?
		LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
		WHERE p.deleted_at IS NULL
		  AND (rp.id IS NOT NULL OR up.user_id IS NOT NULL)
		ORDER BY p.resource, p.action
	`
	if err = r.DB.WithContext(ctx).Raw(query, *user.RoleId, userId).Scan(&ret).Error; err != nil {
		return nil, err
	}

	return ret, nil
}

// GetUserDirectPermissions returns only permissions assigned directly to the user (user_permissions table).
func (r *repo) GetUserDirectPermissions(ctx context.Context, userId string) (ret []domainpermission.Permission, err error) {
	query := `
		SELECT DISTINCT p.*
		FROM permissions p
		INNER JOIN user_permissions up ON up.permission_id = p.id
		WHERE up.user_id = ? AND p.deleted_at IS NULL
		ORDER BY resource, action
	`
	if err = r.DB.WithContext(ctx).Raw(query, userId).Scan(&ret).Error; err != nil {
		return nil, err
	}
	return ret, nil
}

func (r *repo) SetUserPermissions(ctx context.Context, userId string, permissionIDs []string) error {
	tx := r.DB.WithContext(ctx).Begin()
	if err := tx.Where("user_id = ?", userId).Delete(&domainpermission.UserPermission{}).Error; err != nil {
		tx.Rollback()
		return err
	}
	if len(permissionIDs) > 0 {
		log.Println("Setting permissions:", permissionIDs)
		for _, pid := range permissionIDs {
			up := domainpermission.UserPermission{
				UserId:       userId,
				PermissionId: pid,
			}
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "user_id"}, {Name: "permission_id"}},
				DoNothing: true,
			}).Create(&up).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	} else {
		log.Println("No permission ids provided")
	}
	return tx.Commit().Error
}

func (r *repo) ListUserPermissionIDs(ctx context.Context, userId string) ([]string, error) {
	var ids []string
	if err := r.DB.WithContext(ctx).Table("user_permissions").Where("user_id = ?", userId).Pluck("permission_id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}
