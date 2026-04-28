package interfacemastersetting

import (
	"context"

	domainmastersetting "service-songket/internal/domain/mastersetting"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoMasterSettingInterface interface {
	interfacegeneric.GenericRepository[domainmastersetting.MasterSetting]
	GetByKey(ctx context.Context, key string) (domainmastersetting.MasterSetting, error)
	StoreHistory(ctx context.Context, history domainmastersetting.MasterSettingHistory) error
	ListHistoryByKey(ctx context.Context, key string, limit int) ([]domainmastersetting.MasterSettingHistory, error)
	Transaction(ctx context.Context, fn func(tx RepoMasterSettingTxInterface) error) error
}

type RepoMasterSettingTxInterface interface {
	interfacegeneric.GenericRepository[domainmastersetting.MasterSetting]
	StoreHistory(ctx context.Context, history domainmastersetting.MasterSettingHistory) error
}
