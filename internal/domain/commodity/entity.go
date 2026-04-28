package domaincommodity

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Commodity struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	Unit      string         `gorm:"column:unit" json:"unit"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Commodity) TableName() string { return "commodities" }

type CommodityPrice struct {
	Id          string     `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CommodityID string     `gorm:"column:commodity_id;type:uuid;index" json:"commodity_id"`
	Commodity   *Commodity `gorm:"foreignKey:CommodityID" json:"commodity,omitempty"`
	Price       float64    `gorm:"column:price" json:"price"`
	CollectedAt time.Time  `gorm:"column:collected_at;index" json:"collected_at"`
	SourceURL   string     `gorm:"column:source_url" json:"source_url"`
}

func (CommodityPrice) TableName() string { return "commodity_prices" }

type ScrapeJob struct {
	Id         string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Status     string         `gorm:"column:status;type:varchar(20);index" json:"status"`
	Message    string         `gorm:"column:message" json:"message"`
	SourceUrls datatypes.JSON `gorm:"column:source_urls" json:"source_urls"`
	CreatedAt  time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	StartedAt  *time.Time     `gorm:"column:started_at" json:"started_at"`
	FinishedAt *time.Time     `gorm:"column:finished_at" json:"finished_at"`
}

func (ScrapeJob) TableName() string { return "scrape_jobs" }

type ScrapeResult struct {
	Id            string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	JobID         string         `gorm:"column:job_id;type:uuid;index" json:"job_id"`
	CommodityName string         `gorm:"column:commodity_name" json:"commodity_name"`
	Price         float64        `gorm:"column:price" json:"price"`
	Unit          string         `gorm:"column:unit" json:"unit"`
	SourceURL     string         `gorm:"column:source_url" json:"source_url"`
	ScrapedAt     time.Time      `gorm:"column:scraped_at" json:"scraped_at"`
	Raw           datatypes.JSON `gorm:"column:raw" json:"raw"`
}

func (ScrapeResult) TableName() string { return "scrape_results" }
