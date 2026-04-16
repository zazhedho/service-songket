package interfacecredit

import (
	"time"

	"gorm.io/datatypes"

	domaincredit "service-songket/internal/domain/credit"
	"service-songket/pkg/filter"
)

type CreditSummaryRow struct {
	Province string
	Regency  string
	District string
	Village  string
	Total    int64
	Approve  int64
	Reject   int64
	Pending  int64
}

type CreditJobIncomeRow struct {
	JobID         string         `gorm:"column:job_id"`
	JobName       string         `gorm:"column:job_name"`
	NetIncome     float64        `gorm:"column:net_income"`
	AreaNetIncome datatypes.JSON `gorm:"column:area_net_income"`
}

type CreditMotorRow struct {
	MotorTypeID   string  `gorm:"column:motor_type_id"`
	MotorTypeName string  `gorm:"column:motor_type_name"`
	Installment   float64 `gorm:"column:installment"`
	ProvinceCode  string  `gorm:"column:province_code"`
	ProvinceName  string  `gorm:"column:province_name"`
	RegencyCode   string  `gorm:"column:regency_code"`
	RegencyName   string  `gorm:"column:regency_name"`
}

type CreditOrderRangeRow struct {
	Installment   float64 `gorm:"column:installment"`
	DPPct         float64 `gorm:"column:dp_pct"`
	FinanceStatus string  `gorm:"column:finance_status"`
	Province      string  `gorm:"column:province"`
	Regency       string  `gorm:"column:regency"`
}

type RepoCreditInterface interface {
	Store(data domaincredit.CreditCapability) error
	GetByID(id string) (domaincredit.CreditCapability, error)
	GetByRegencyAndJob(regency, jobID string) (domaincredit.CreditCapability, error)
	GetAll(params filter.BaseParams) ([]domaincredit.CreditCapability, int64, error)
	Update(data domaincredit.CreditCapability) error
	ListSummaryRows() ([]CreditSummaryRow, error)
	ListJobIncomeRows(jobID string) ([]CreditJobIncomeRow, error)
	ListMotorRows(motorTypeID string) ([]CreditMotorRow, error)
	ListOrderRangeRows(jobID, motorTypeID string, fromTime, toTime *time.Time) ([]CreditOrderRangeRow, error)
	HasOrderInstallmentColumn(column string) bool
}
