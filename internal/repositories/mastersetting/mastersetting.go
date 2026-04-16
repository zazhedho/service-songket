package repositorymastersetting

import (
	domainmastersetting "service-songket/internal/domain/mastersetting"
	interfacemastersetting "service-songket/internal/interfaces/mastersetting"

	"gorm.io/gorm"
)

type repo struct {
	db *gorm.DB
}

type txRepo struct {
	db *gorm.DB
}

func NewMasterSettingRepo(db *gorm.DB) interfacemastersetting.RepoMasterSettingInterface {
	return &repo{db: db}
}

func (r *repo) GetByKey(key string) (domainmastersetting.MasterSetting, error) {
	var ret domainmastersetting.MasterSetting
	if err := r.db.Where("key = ?", key).First(&ret).Error; err != nil {
		return domainmastersetting.MasterSetting{}, err
	}
	return ret, nil
}

func (r *repo) Store(setting domainmastersetting.MasterSetting) error {
	return r.db.Create(&setting).Error
}

func (r *repo) Update(setting domainmastersetting.MasterSetting) error {
	return r.db.Save(&setting).Error
}

func (r *repo) Delete(setting domainmastersetting.MasterSetting) error {
	return r.db.Delete(&setting).Error
}

func (r *repo) StoreHistory(history domainmastersetting.MasterSettingHistory) error {
	return r.db.Create(&history).Error
}

func (r *repo) ListHistoryByKey(key string, limit int) ([]domainmastersetting.MasterSettingHistory, error) {
	rows := make([]domainmastersetting.MasterSettingHistory, 0, limit)
	if err := r.db.Where("key = ?", key).Order("created_at DESC").Limit(limit).Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) Transaction(fn func(tx interfacemastersetting.RepoMasterSettingTxInterface) error) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return fn(&txRepo{db: tx})
	})
}

func (r *txRepo) Store(setting domainmastersetting.MasterSetting) error {
	return r.db.Create(&setting).Error
}

func (r *txRepo) Update(setting domainmastersetting.MasterSetting) error {
	return r.db.Save(&setting).Error
}

func (r *txRepo) Delete(setting domainmastersetting.MasterSetting) error {
	return r.db.Delete(&setting).Error
}

func (r *txRepo) StoreHistory(history domainmastersetting.MasterSettingHistory) error {
	return r.db.Create(&history).Error
}
