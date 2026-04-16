package domaindealer

import (
	"time"

	"gorm.io/gorm"
)

type Dealer struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	Regency   string         `gorm:"column:regency" json:"regency"`
	Province  string         `gorm:"column:province" json:"province"`
	District  string         `gorm:"column:district" json:"district"`
	Village   string         `gorm:"column:village" json:"village"`
	Phone     string         `gorm:"column:phone" json:"phone"`
	Address   string         `gorm:"column:address" json:"address"`
	Latitude  float64        `gorm:"column:lat" json:"lat"`
	Longitude float64        `gorm:"column:lng" json:"lng"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Dealer) TableName() string { return "dealers" }
