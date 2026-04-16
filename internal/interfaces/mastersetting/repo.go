package interfacemastersetting

import domainmastersetting "service-songket/internal/domain/mastersetting"

type RepoMasterSettingInterface interface {
	GetByKey(key string) (domainmastersetting.MasterSetting, error)
	Store(setting domainmastersetting.MasterSetting) error
	Update(setting domainmastersetting.MasterSetting) error
	Delete(setting domainmastersetting.MasterSetting) error
	StoreHistory(history domainmastersetting.MasterSettingHistory) error
	ListHistoryByKey(key string, limit int) ([]domainmastersetting.MasterSettingHistory, error)
	Transaction(fn func(tx RepoMasterSettingTxInterface) error) error
}

type RepoMasterSettingTxInterface interface {
	Store(setting domainmastersetting.MasterSetting) error
	Update(setting domainmastersetting.MasterSetting) error
	Delete(setting domainmastersetting.MasterSetting) error
	StoreHistory(history domainmastersetting.MasterSettingHistory) error
}
