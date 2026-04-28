package domaininstallment

import (
	"time"

	domainmotor "service-songket/internal/domain/motor"

	"gorm.io/gorm"
)

type Installment struct {
	Id          string                 `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	MotorTypeID string                 `gorm:"column:motor_type_id;type:uuid;not null;index" json:"motor_type_id"`
	MotorType   *domainmotor.MotorType `gorm:"foreignKey:MotorTypeID" json:"motor_type,omitempty"`
	Amount      float64                `gorm:"column:amount;type:numeric(18,2);not null" json:"amount"`
	CreatedAt   time.Time              `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time              `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt         `gorm:"index" json:"-"`
}

func (Installment) TableName() string { return "installments" }
