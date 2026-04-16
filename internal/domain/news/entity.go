package domainnews

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type NewsSource struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	URL       string         `gorm:"column:url;not null" json:"url"`
	Category  string         `gorm:"column:category" json:"category"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (NewsSource) TableName() string { return "news_sources" }

type NewsItem struct {
	Id          string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	SourceID    *string        `gorm:"column:source_id;type:uuid;index" json:"source_id"`
	Source      *NewsSource    `gorm:"foreignKey:SourceID" json:"source,omitempty"`
	SourceName  string         `gorm:"column:source_name" json:"source_name"`
	Title       string         `gorm:"column:title" json:"title"`
	Content     string         `gorm:"column:content;type:text" json:"content"`
	Images      datatypes.JSON `gorm:"column:images;type:jsonb" json:"images"`
	URL         string         `gorm:"column:url" json:"url"`
	Category    string         `gorm:"column:category" json:"category"`
	PublishedAt time.Time      `gorm:"column:published_at;index" json:"published_at"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (NewsItem) TableName() string { return "news_items" }

type NewsScrapedImages struct {
	Main string   `json:"foto_utama"`
	List []string `json:"dalam_berita"`
}

type NewsScrapedArticle struct {
	Title     string            `json:"judul"`
	Content   string            `json:"isi"`
	Images    NewsScrapedImages `json:"images"`
	CreatedAt string            `json:"created_at"`
	Source    string            `json:"sumber"`
	URL       string            `json:"url"`
	SourceURL string            `json:"source_url,omitempty"`
	SourceID  string            `json:"source_id,omitempty"`
	Category  string            `json:"category,omitempty"`
}
