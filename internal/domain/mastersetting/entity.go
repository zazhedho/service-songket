package domainmastersetting

import (
	"time"

	"gorm.io/gorm"
)

const (
	MasterSettingKeyNewsScrapeCron  = "cron_scrape_news"
	MasterSettingKeyPriceScrapeCron = "cron_scrape_prices"
)

type MasterSetting struct {
	Id              string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Key             string         `gorm:"column:key;not null;uniqueIndex" json:"key"`
	IsActive        bool           `gorm:"column:is_active;not null;default:false" json:"is_active"`
	IntervalMinutes int            `gorm:"column:interval_minutes;not null;default:5" json:"interval_minutes"`
	Description     string         `gorm:"column:description" json:"description"`
	CreatedAt       time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (MasterSetting) TableName() string { return "master_settings" }

type MasterSettingHistory struct {
	Id                      string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	SettingID               string         `gorm:"column:setting_id;type:uuid;index;not null" json:"setting_id"`
	Key                     string         `gorm:"column:key;index;not null" json:"key"`
	PreviousIsActive        bool           `gorm:"column:previous_is_active;not null;default:false" json:"previous_is_active"`
	PreviousIntervalMinutes int            `gorm:"column:previous_interval_minutes;not null;default:1" json:"previous_interval_minutes"`
	NewIsActive             bool           `gorm:"column:new_is_active;not null;default:false" json:"new_is_active"`
	NewIntervalMinutes      int            `gorm:"column:new_interval_minutes;not null;default:1" json:"new_interval_minutes"`
	ChangedByUserID         *string        `gorm:"column:changed_by_user_id;type:uuid;index" json:"changed_by_user_id,omitempty"`
	ChangedByName           string         `gorm:"column:changed_by_name" json:"changed_by_name"`
	CreatedAt               time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	DeletedAt               gorm.DeletedAt `gorm:"index" json:"-"`
}

func (MasterSettingHistory) TableName() string { return "master_setting_histories" }
