package domaincredit

import (
	"time"

	domainjob "service-songket/internal/domain/job"
)

type CreditCapability struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Province  string         `gorm:"column:province" json:"province"`
	Regency   string         `gorm:"column:regency;index:idx_credit_regency_job,unique" json:"regency"`
	District  string         `gorm:"column:district" json:"district"`
	Village   string         `gorm:"column:village" json:"village"`
	Address   string         `gorm:"column:address" json:"address"`
	JobID     string         `gorm:"column:job_id;type:uuid;index:idx_credit_regency_job,unique" json:"job_id"`
	Job       *domainjob.Job `gorm:"foreignKey:JobID" json:"job,omitempty"`
	Score     float64        `gorm:"column:score" json:"score"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (CreditCapability) TableName() string { return "credit_capabilities" }

type CreditSummary struct {
	Province     string `json:"province"`
	Regency      string `json:"regency"`
	District     string `json:"district"`
	Village      string `json:"village"`
	TotalOrders  int64  `json:"total_orders"`
	ApproveCount int64  `json:"approve_count"`
	RejectCount  int64  `json:"reject_count"`
	PendingCount int64  `json:"pending_count"`
	Score        int    `json:"score"`
}

type CreditWorksheetJob struct {
	JobID     string  `json:"job_id"`
	JobName   string  `json:"job_name"`
	NetIncome float64 `json:"net_income"`
	Area      string  `json:"area"`
}

type CreditWorksheetMotor struct {
	MotorTypeID   string  `json:"motor_type_id"`
	MotorTypeName string  `json:"motor_type_name"`
	Installment   float64 `json:"installment"`
	Area          string  `json:"area"`
}

type CreditWorksheetCell struct {
	MotorTypeID       string  `json:"motor_type_id"`
	MotorTypeName     string  `json:"motor_type_name"`
	Installment       float64 `json:"installment"`
	CapabilityRate    float64 `json:"capability_rate"`
	ProgramSuggestion float64 `json:"program_suggestion"`
}

type CreditWorksheetMatrixRow struct {
	JobID     string                `json:"job_id"`
	JobName   string                `json:"job_name"`
	NetIncome float64               `json:"net_income"`
	Area      string                `json:"area"`
	Cells     []CreditWorksheetCell `json:"cells"`
}

type CreditWorksheetArea struct {
	AreaKey      string                     `json:"area_key"`
	ProvinceCode string                     `json:"province_code"`
	ProvinceName string                     `json:"province_name"`
	RegencyCode  string                     `json:"regency_code"`
	RegencyName  string                     `json:"regency_name"`
	Jobs         []CreditWorksheetJob       `json:"jobs"`
	MotorTypes   []CreditWorksheetMotor     `json:"motor_types"`
	Matrix       []CreditWorksheetMatrixRow `json:"matrix"`
}

type CreditWorksheetJobMaster struct {
	JobID       string  `json:"job_id"`
	JobName     string  `json:"job_name"`
	NetIncome   float64 `json:"net_income"`
	RegencyCode string  `json:"regency_code"`
	RegencyName string  `json:"regency_name"`
}

type CreditWorksheetMotorMaster struct {
	MotorTypeID   string  `json:"motor_type_id"`
	MotorTypeName string  `json:"motor_type_name"`
	Installment   float64 `json:"installment"`
	RegencyCode   string  `json:"regency_code"`
	RegencyName   string  `json:"regency_name"`
}
