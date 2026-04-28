package repositorymastersetting

import (
	"context"

	domainmastersetting "service-songket/internal/domain/mastersetting"
	interfacemastersetting "service-songket/internal/interfaces/mastersetting"
	repositorygeneric "service-songket/internal/repositories/generic"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type repo struct {
	*repositorygeneric.GenericRepository[domainmastersetting.MasterSetting]
	db *gorm.DB
}

type txRepo struct {
	*repositorygeneric.GenericRepository[domainmastersetting.MasterSetting]
	db          *gorm.DB
	historyRepo *repositorygeneric.GenericRepository[domainmastersetting.MasterSettingHistory]
}

func masterSettingQueryOptions() repositorygeneric.QueryOptions {
	return repositorygeneric.QueryOptions{
		Search:         repositorygeneric.BuildSearchFunc("key", "description"),
		AllowedFilters: []string{"id", "key", "is_active", "interval_minutes", "created_at", "updated_at"},
		AllowedOrderColumns: []string{
			"key",
			"is_active",
			"interval_minutes",
			"created_at",
			"updated_at",
		},
		DefaultOrders: []string{"created_at DESC"},
	}
}

func NewMasterSettingRepo(db *gorm.DB) interfacemastersetting.RepoMasterSettingInterface {
	return &repo{
		GenericRepository: repositorygeneric.New[domainmastersetting.MasterSetting](db),
		db:                db,
	}
}

func (r *repo) GetByKey(ctx context.Context, key string) (domainmastersetting.MasterSetting, error) {
	return r.GenericRepository.GetOneByField(ctx, "key", key)
}

func (r *repo) GetAll(ctx context.Context, params filter.BaseParams) ([]domainmastersetting.MasterSetting, int64, error) {
	return r.GenericRepository.GetAll(ctx, params, masterSettingQueryOptions())
}

func (r *repo) StoreHistory(ctx context.Context, history domainmastersetting.MasterSettingHistory) error {
	return r.db.WithContext(ctx).Create(&history).Error
}

func (r *repo) ListHistoryByKey(ctx context.Context, key string, limit int) ([]domainmastersetting.MasterSettingHistory, error) {
	rows := make([]domainmastersetting.MasterSettingHistory, 0, limit)
	if err := r.db.WithContext(ctx).Where("key = ?", key).Order("created_at DESC").Limit(limit).Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) Transaction(ctx context.Context, fn func(tx interfacemastersetting.RepoMasterSettingTxInterface) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(&txRepo{
			GenericRepository: repositorygeneric.New[domainmastersetting.MasterSetting](tx),
			db:                tx,
			historyRepo:       repositorygeneric.New[domainmastersetting.MasterSettingHistory](tx),
		})
	})
}

func (r *txRepo) StoreHistory(ctx context.Context, history domainmastersetting.MasterSettingHistory) error {
	return r.historyRepo.Store(ctx, history)
}

func (r *txRepo) GetAll(ctx context.Context, params filter.BaseParams) ([]domainmastersetting.MasterSetting, int64, error) {
	return r.GenericRepository.GetAll(ctx, params, masterSettingQueryOptions())
}
