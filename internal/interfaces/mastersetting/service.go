package interfacemastersetting

import (
	domainmastersetting "service-songket/internal/domain/mastersetting"
	"service-songket/internal/dto"
)

type ServiceMasterSettingInterface interface {
	GetNewsScrapeCronSetting() (domainmastersetting.MasterSetting, error)
	CreateNewsScrapeCronSetting(req dto.NewsScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error)
	UpdateNewsScrapeCronSetting(req dto.NewsScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error)
	ListNewsScrapeCronSettingHistory(limit int) ([]domainmastersetting.MasterSettingHistory, error)
	DeleteNewsScrapeCronSetting(actorUserID, actorName string) error
	GetPriceScrapeCronSetting() (domainmastersetting.MasterSetting, error)
	CreatePriceScrapeCronSetting(req dto.PriceScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error)
	UpdatePriceScrapeCronSetting(req dto.PriceScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error)
	ListPriceScrapeCronSettingHistory(limit int) ([]domainmastersetting.MasterSettingHistory, error)
	DeletePriceScrapeCronSetting(actorUserID, actorName string) error
}
