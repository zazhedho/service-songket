package repositoryauth

import (
	"context"
	domainauth "service-songket/internal/domain/auth"
	interfaceauth "service-songket/internal/interfaces/auth"

	"gorm.io/gorm"
)

type blacklistRepo struct {
	DB *gorm.DB
}

func NewBlacklistRepo(db *gorm.DB) interfaceauth.RepoAuthInterface {
	return &blacklistRepo{
		DB: db,
	}
}

func (r *blacklistRepo) Store(ctx context.Context, blacklist domainauth.Blacklist) error {
	return r.DB.WithContext(ctx).Create(&blacklist).Error
}

func (r *blacklistRepo) GetByToken(ctx context.Context, token string) (domainauth.Blacklist, error) {
	var blacklist domainauth.Blacklist
	err := r.DB.WithContext(ctx).Where("token = ?", token).First(&blacklist).Error
	return blacklist, err
}
