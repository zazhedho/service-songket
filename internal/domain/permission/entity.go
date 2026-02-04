package domainpermission

import (
	"time"

	"gorm.io/gorm"
)

func (Permission) TableName() string {
	return "permissions"
}

type Permission struct {
	Id          string         `json:"id" gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	Name        string         `json:"name" gorm:"column:name;type:varchar(100);uniqueIndex;not null"`
	DisplayName string         `json:"display_name" gorm:"column:display_name;type:varchar(150);not null"`
	Description string         `json:"description,omitempty" gorm:"column:description"`
	Resource    string         `json:"resource" gorm:"column:resource;type:varchar(50);not null"`
	Action      string         `json:"action" gorm:"column:action;type:varchar(50);not null"`
	CreatedAt   time.Time      `json:"created_at,omitempty" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   *time.Time     `json:"updated_at,omitempty" gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}
