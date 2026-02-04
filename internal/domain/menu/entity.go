package domainmenu

import (
	"time"

	"gorm.io/gorm"
	"starter-kit/utils"
)

func (MenuItem) TableName() string {
	return "menu_items"
}

func (m *MenuItem) BeforeCreate(tx *gorm.DB) error {
	if m.Id == "" {
		m.Id = utils.CreateUUID()
	}
	return nil
}

type MenuItem struct {
	Id          string         `json:"id" gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	Name        string         `json:"name" gorm:"column:name;type:varchar(50);uniqueIndex;not null"`
	DisplayName string         `json:"display_name" gorm:"column:display_name;type:varchar(100);not null"`
	Path        string         `json:"path" gorm:"column:path;type:varchar(255);not null"`
	Icon        string         `json:"icon,omitempty" gorm:"column:icon;type:varchar(50)"`
	ParentId    *string        `json:"parent_id,omitempty" gorm:"column:parent_id;type:uuid"`
	OrderIndex  int            `json:"order_index" gorm:"column:order_index;default:0"`
	IsActive    bool           `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt   time.Time      `json:"created_at,omitempty" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   *time.Time     `json:"updated_at,omitempty" gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}
