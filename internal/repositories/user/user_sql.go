package repositoryuser

import (
	"context"
	"service-songket/internal/authscope"
	domainuser "service-songket/internal/domain/user"
	interfaceuser "service-songket/internal/interfaces/user"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"
	"service-songket/utils"
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

func (r *repo) ListUserDealerIDs(ctx context.Context, userID string) ([]string, error) {
	rows := make([]domainuser.UserDealerAccess, 0)
	if err := r.DB.WithContext(ctx).
		Where("user_id = ?", strings.TrimSpace(userID)).
		Order("created_at ASC, id ASC").
		Find(&rows).Error; err != nil {
		if isMissingUserDealerAccessTable(err) {
			return []string{}, nil
		}
		return nil, err
	}

	dealerIDs := make([]string, 0, len(rows))
	seen := map[string]struct{}{}
	for _, row := range rows {
		dealerID := strings.TrimSpace(row.DealerID)
		if dealerID == "" {
			continue
		}
		if _, exists := seen[dealerID]; exists {
			continue
		}
		seen[dealerID] = struct{}{}
		dealerIDs = append(dealerIDs, dealerID)
	}
	return dealerIDs, nil
}

func (r *repo) ListUserDealers(ctx context.Context, userID string) ([]domainuser.UserDealerAccess, error) {
	rows := make([]domainuser.UserDealerAccess, 0)
	if err := r.DB.WithContext(ctx).
		Preload("Dealer").
		Where("user_id = ?", strings.TrimSpace(userID)).
		Order("created_at ASC, id ASC").
		Find(&rows).Error; err != nil {
		if isMissingUserDealerAccessTable(err) {
			return []domainuser.UserDealerAccess{}, nil
		}
		return nil, err
	}
	return rows, nil
}

func (r *repo) SetUserDealerIDs(ctx context.Context, userID string, dealerIDs []string) error {
	normalizedUserID := strings.TrimSpace(userID)
	cleanDealerIDs := make([]string, 0, len(dealerIDs))
	seen := map[string]struct{}{}
	for _, dealerID := range dealerIDs {
		trimmedID := strings.TrimSpace(dealerID)
		if trimmedID == "" {
			continue
		}
		if _, exists := seen[trimmedID]; exists {
			continue
		}
		seen[trimmedID] = struct{}{}
		cleanDealerIDs = append(cleanDealerIDs, trimmedID)
	}

	return r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", normalizedUserID).Delete(&domainuser.UserDealerAccess{}).Error; err != nil {
			return err
		}
		if len(cleanDealerIDs) == 0 {
			return nil
		}

		rows := make([]domainuser.UserDealerAccess, 0, len(cleanDealerIDs))
		for _, dealerID := range cleanDealerIDs {
			rows = append(rows, domainuser.UserDealerAccess{
				UserID:   normalizedUserID,
				DealerID: dealerID,
			})
		}
		return tx.Create(&rows).Error
	})
}

func isMissingUserDealerAccessTable(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "user_dealer_access") &&
		(strings.Contains(message, "does not exist") || strings.Contains(message, "undefined_table"))
}

func (r *repo) GetAll(ctx context.Context, params filter.BaseParams) (ret []domainuser.Users, totalData int64, err error) {
	return r.GenericRepository.GetAll(ctx, params, repositorygeneric.QueryOptions{
		BaseQuery: func(query *gorm.DB) *gorm.DB {
			if authscope.FromContext(ctx).Role == utils.RoleSuperAdmin {
				return query
			}
			return query.Where("role <> ?", utils.RoleSuperAdmin)
		},
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
