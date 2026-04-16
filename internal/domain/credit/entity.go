package domaincredit

import legacysongket "service-songket/internal/songket"

type CreditCapability = legacysongket.CreditCapability

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
