package domainrole

import (
	"time"

	"gorm.io/gorm"
)

func (Role) TableName() string {
	return "roles"
}

type Role struct {
	Id          string         `json:"id" gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	Name        string         `json:"name" gorm:"column:name;type:varchar(50);uniqueIndex;not null"`
	DisplayName string         `json:"display_name" gorm:"column:display_name;type:varchar(100);not null"`
	Description string         `json:"description,omitempty" gorm:"column:description"`
	IsSystem    bool           `json:"is_system" gorm:"column:is_system;default:false"`
	CreatedAt   time.Time      `json:"created_at,omitempty" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   *time.Time     `json:"updated_at,omitempty" gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (RolePermission) TableName() string {
	return "role_permissions"
}

type RolePermission struct {
	Id           string    `json:"id" gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	RoleId       string    `json:"role_id" gorm:"column:role_id;type:uuid;not null;index:idx_role_permission,unique"`
	PermissionId string    `json:"permission_id" gorm:"column:permission_id;type:uuid;not null;index:idx_role_permission,unique"`
	CreatedAt    time.Time `json:"created_at,omitempty" gorm:"column:created_at;autoCreateTime"`
}

func (RoleMenu) TableName() string {
	return "role_menus"
}

type RoleMenu struct {
	Id         string    `json:"id" gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	RoleId     string    `json:"role_id" gorm:"column:role_id;type:uuid;not null;index:idx_role_menu,unique"`
	MenuItemId string    `json:"menu_item_id" gorm:"column:menu_item_id;type:uuid;not null;index:idx_role_menu,unique"`
	CreatedAt  time.Time `json:"created_at,omitempty" gorm:"column:created_at;autoCreateTime"`
}
