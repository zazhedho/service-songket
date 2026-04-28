package domainscrapesource

import "time"

type ScrapeSource struct {
	Id        string    `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string    `gorm:"column:name" json:"name"`
	URL       string    `gorm:"column:url" json:"url"`
	Type      string    `gorm:"column:type;type:varchar(20);default:'prices'" json:"type"`
	Category  string    `gorm:"column:category" json:"category"`
	IsActive  bool      `gorm:"column:is_active;default:true" json:"is_active"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (ScrapeSource) TableName() string { return "scrape_sources" }
