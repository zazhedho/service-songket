package domainfinancecompany

import (
	"time"

	"gorm.io/gorm"
)

type FinanceCompany struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	Province  string         `gorm:"column:province" json:"province"`
	Regency   string         `gorm:"column:regency" json:"regency"`
	District  string         `gorm:"column:district" json:"district"`
	Village   string         `gorm:"column:village" json:"village"`
	Address   string         `gorm:"column:address" json:"address"`
	Phone     string         `gorm:"column:phone" json:"phone"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (FinanceCompany) TableName() string { return "finance_companies" }
