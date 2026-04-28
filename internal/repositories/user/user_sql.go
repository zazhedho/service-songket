package repositoryuser

import (
	"context"
	domainuser "service-songket/internal/domain/user"
	interfaceuser "service-songket/internal/interfaces/user"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"
	"strings"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domainuser.Users]
}

func NewUserRepo(db *gorm.DB) interfaceuser.RepoUserInterface {
	return &repo{GenericRepository: repositorygeneric.New[domainuser.Users](db)}
}

func (r *repo) GetByEmail(ctx context.Context, email string) (domainuser.Users, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	var ret domainuser.Users
	if err := r.DB.WithContext(ctx).
		Where("LOWER(email) = ?", email).
		First(&ret).Error; err != nil {
		return domainuser.Users{}, err
	}
	return ret, nil
}

func (r *repo) GetByPhone(ctx context.Context, phone string) (ret domainuser.Users, err error) {
	return r.GetOneByField(ctx, "phone", phone)
}

func (r *repo) GetAll(ctx context.Context, params filter.BaseParams) (ret []domainuser.Users, totalData int64, err error) {
	return r.GenericRepository.GetAll(ctx, params, repositorygeneric.QueryOptions{
		Search:         repositorygeneric.BuildSearchFunc("name", "email", "phone"),
		AllowedFilters: []string{"id", "name", "email", "phone", "role", "role_id", "created_at", "updated_at"},
		AllowedOrderColumns: []string{
			"name",
			"email",
			"phone",
			"role",
			"last_login_at",
			"login_provider",
			"created_at",
			"updated_at",
		},
	})
}
