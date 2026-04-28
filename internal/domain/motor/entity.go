package domainmotor

import (
	"time"

	"gorm.io/gorm"
)

type MotorType struct {
	Id           string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name         string         `gorm:"column:name;not null;index" json:"name"`
	Brand        string         `gorm:"column:brand" json:"brand"`
	Model        string         `gorm:"column:model" json:"model"`
	VariantType  string         `gorm:"column:variant_type" json:"type"`
	OTR          float64        `gorm:"column:otr;not null" json:"otr"`
	ProvinceCode string         `gorm:"column:province_code;index" json:"province_code"`
	ProvinceName string         `gorm:"column:province_name" json:"province_name"`
	RegencyCode  string         `gorm:"column:regency_code;index" json:"regency_code"`
	RegencyName  string         `gorm:"column:regency_name" json:"regency_name"`
	CreatedAt    time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (MotorType) TableName() string { return "motor_types" }
