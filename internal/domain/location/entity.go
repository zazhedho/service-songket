package domainlocation

import (
	"time"

	"gorm.io/gorm"
)

type LocationItem struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type MasterProvince struct {
	ID        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	Code      string         `gorm:"column:code;type:varchar(16);not null;uniqueIndex"`
	Name      string         `gorm:"column:name;type:varchar(255);not null"`
	Source    string         `gorm:"column:source;type:varchar(32);not null;default:'third_party'"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (MasterProvince) TableName() string { return "master_provinces" }

type MasterRegency struct {
	ID           string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	ProvinceCode string         `gorm:"column:province_code;type:varchar(16);not null;index;uniqueIndex:idx_master_regencies_scope,priority:1"`
	Code         string         `gorm:"column:code;type:varchar(16);not null;uniqueIndex:idx_master_regencies_scope,priority:2"`
	Name         string         `gorm:"column:name;type:varchar(255);not null"`
	Source       string         `gorm:"column:source;type:varchar(32);not null;default:'third_party'"`
	CreatedAt    time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

func (MasterRegency) TableName() string { return "master_regencies" }

type MasterDistrict struct {
	ID           string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	ProvinceCode string         `gorm:"column:province_code;type:varchar(16);not null;index;uniqueIndex:idx_master_districts_scope,priority:1"`
	RegencyCode  string         `gorm:"column:regency_code;type:varchar(16);not null;index;uniqueIndex:idx_master_districts_scope,priority:2"`
	Code         string         `gorm:"column:code;type:varchar(16);not null;uniqueIndex:idx_master_districts_scope,priority:3"`
	Name         string         `gorm:"column:name;type:varchar(255);not null"`
	Source       string         `gorm:"column:source;type:varchar(32);not null;default:'third_party'"`
	CreatedAt    time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

func (MasterDistrict) TableName() string { return "master_districts" }
