package domainuser

import (
	"time"

	domaindealer "service-songket/internal/domain/dealer"

	"gorm.io/gorm"
)

func (Users) TableName() string {
	return "users"
}

type Users struct {
	Id        string                `json:"id" gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	Name      string                `json:"name" gorm:"column:name;type:varchar(100);not null"`
	Email     string                `json:"email,omitempty" gorm:"column:email;type:varchar(255);uniqueIndex;not null"`
	Phone     string                `json:"phone,omitempty" gorm:"column:phone;type:varchar(20);uniqueIndex"`
	Password  string                `json:"-" gorm:"column:password;type:varchar(255);not null"`
	Role      string                `json:"role,omitempty" gorm:"column:role;type:varchar(50);default:'dealer'"`
	RoleId    *string               `json:"role_id,omitempty" gorm:"column:role_id;type:uuid"`
	DealerIDs []string              `json:"dealer_ids,omitempty" gorm:"-"`
	Dealers   []domaindealer.Dealer `json:"dealers,omitempty" gorm:"-"`
	CreatedAt time.Time             `json:"created_at,omitempty" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt *time.Time            `json:"updated_at,omitempty" gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt gorm.DeletedAt        `json:"-" gorm:"index"`
}

type UserDealerAccess struct {
	Id        string               `json:"id" gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    string               `json:"user_id" gorm:"column:user_id;type:uuid;not null"`
	DealerID  string               `json:"dealer_id" gorm:"column:dealer_id;type:uuid;not null"`
	Dealer    *domaindealer.Dealer `json:"dealer,omitempty" gorm:"foreignKey:DealerID"`
	CreatedAt time.Time            `json:"created_at,omitempty" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time            `json:"updated_at,omitempty" gorm:"column:updated_at;autoUpdateTime"`
}

func (UserDealerAccess) TableName() string {
	return "user_dealer_access"
}
