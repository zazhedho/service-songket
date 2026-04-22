package interfacemastersetting

import (
	"context"

	domainmastersetting "service-songket/internal/domain/mastersetting"
	"service-songket/internal/dto"
)

type ServiceMasterSettingInterface interface {
	GetNewsScrapeCronSetting(ctx context.Context) (domainmastersetting.MasterSetting, error)
	CreateNewsScrapeCronSetting(ctx context.Context, req dto.NewsScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error)
	UpdateNewsScrapeCronSetting(ctx context.Context, req dto.NewsScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error)
	ListNewsScrapeCronSettingHistory(ctx context.Context, limit int) ([]domainmastersetting.MasterSettingHistory, error)
	DeleteNewsScrapeCronSetting(ctx context.Context, actorUserID, actorName string) error
	GetPriceScrapeCronSetting(ctx context.Context) (domainmastersetting.MasterSetting, error)
	CreatePriceScrapeCronSetting(ctx context.Context, req dto.PriceScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error)
	UpdatePriceScrapeCronSetting(ctx context.Context, req dto.PriceScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error)
	ListPriceScrapeCronSettingHistory(ctx context.Context, limit int) ([]domainmastersetting.MasterSettingHistory, error)
	DeletePriceScrapeCronSetting(ctx context.Context, actorUserID, actorName string) error
}
