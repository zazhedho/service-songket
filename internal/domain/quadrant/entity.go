package domainquadrant

import (
	"time"

	domainjob "service-songket/internal/domain/job"

	"gorm.io/gorm"
)

type QuadrantResult struct {
	Id          string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Regency     string         `gorm:"column:regency;index:idx_quadrant_regency_job,unique" json:"regency"`
	JobID       string         `gorm:"column:job_id;type:uuid;index:idx_quadrant_regency_job,unique" json:"job_id"`
	Job         *domainjob.Job `gorm:"foreignKey:JobID" json:"job,omitempty"`
	Quadrant    int            `gorm:"column:quadrant" json:"quadrant"`
	OrderCount  int64          `gorm:"column:order_count" json:"order_count"`
	CreditScore float64        `gorm:"column:credit_score" json:"credit_score"`
	ComputedAt  time.Time      `gorm:"column:computed_at;autoCreateTime" json:"computed_at"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (QuadrantResult) TableName() string { return "quadrants" }

type QuadrantFlowSummary struct {
	OrderID              string  `json:"order_id"`
	PoolingNumber        string  `json:"pooling_number"`
	Province             string  `json:"province"`
	Regency              string  `json:"regency"`
	JobID                string  `json:"job_id"`
	JobName              string  `json:"job_name"`
	MotorTypeID          string  `json:"motor_type_id"`
	MotorTypeName        string  `json:"motor_type_name"`
	TotalOrders          int64   `json:"total_orders"`
	OrderInPercent       float64 `json:"order_in_percent"`
	OrderInGrowthPercent float64 `json:"order_in_growth_percent"`
	OrderInCurrentTotal  int64   `json:"order_in_current_total"`
	OrderInPreviousTotal int64   `json:"order_in_previous_total"`
	ReferenceMonth       string  `json:"reference_month"`
	ReferencePrevMonth   string  `json:"reference_prev_month"`
	CreditCapability     float64 `json:"credit_capability"`
	Quadrant             int     `json:"quadrant"`
}
