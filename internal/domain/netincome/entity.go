package domainnetincome

import (
	"time"

	domainjob "service-songket/internal/domain/job"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type NetIncome struct {
	Id            string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	JobID         string         `gorm:"column:job_id;type:uuid;not null;uniqueIndex" json:"job_id"`
	Job           *domainjob.Job `gorm:"foreignKey:JobID" json:"job,omitempty"`
	NetIncome     float64        `gorm:"column:net_income;type:numeric(18,2);not null;default:0" json:"net_income"`
	AreaNetIncome datatypes.JSON `gorm:"column:area_net_income;type:jsonb;not null;default:'[]'" json:"area_net_income"`
	CreatedAt     time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (NetIncome) TableName() string { return "job_net_incomes" }

type AreaItem struct {
	ProvinceCode string `json:"province_code"`
	ProvinceName string `json:"province_name"`
	RegencyCode  string `json:"regency_code"`
	RegencyName  string `json:"regency_name"`
}

type NetIncomeItem struct {
	Id            string     `json:"id"`
	JobID         string     `json:"job_id"`
	JobName       string     `json:"job_name"`
	NetIncome     float64    `json:"net_income"`
	AreaNetIncome []AreaItem `json:"area_net_income"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}
