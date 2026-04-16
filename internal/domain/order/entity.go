package domainorder

import (
	"errors"
	"time"

	domaindealer "service-songket/internal/domain/dealer"
	domainfinancecompany "service-songket/internal/domain/financecompany"
	domainjob "service-songket/internal/domain/job"
	domainmotor "service-songket/internal/domain/motor"

	"gorm.io/gorm"
)

var (
	ErrOrderExportNotFound  = errors.New("order export job not found")
	ErrOrderExportForbidden = errors.New("you are not allowed to access this export job")
	ErrOrderExportNotReady  = errors.New("export file is not ready")
	ErrOrderExportFileGone  = errors.New("export file is no longer available")
)

type Order struct {
	Id            string                 `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PoolingNumber string                 `gorm:"column:pooling_number;not null" json:"pooling_number"`
	PoolingAt     time.Time              `gorm:"column:pooling_at;not null" json:"pooling_at"`
	ResultAt      *time.Time             `gorm:"column:result_at" json:"result_at"`
	DealerID      string                 `gorm:"column:dealer_id;type:uuid;not null" json:"dealer_id"`
	Dealer        *domaindealer.Dealer   `gorm:"foreignKey:DealerID" json:"dealer,omitempty"`
	ConsumerName  string                 `gorm:"column:consumer_name;not null" json:"consumer_name"`
	ConsumerPhone string                 `gorm:"column:consumer_phone;not null" json:"consumer_phone"`
	Province      string                 `gorm:"column:province" json:"province"`
	Regency       string                 `gorm:"column:regency" json:"regency"`
	District      string                 `gorm:"column:district" json:"district"`
	Village       string                 `gorm:"column:village" json:"village"`
	Address       string                 `gorm:"column:address" json:"address"`
	JobID         string                 `gorm:"column:job_id;type:uuid" json:"job_id"`
	Job           *domainjob.Job         `gorm:"foreignKey:JobID" json:"job,omitempty"`
	MotorTypeID   string                 `gorm:"column:motor_type_id;type:uuid" json:"motor_type_id"`
	MotorType     *domainmotor.MotorType `gorm:"foreignKey:MotorTypeID" json:"motor_type,omitempty"`
	Installment   float64                `gorm:"column:installment" json:"installment"`
	OTR           float64                `gorm:"column:otr" json:"otr"`
	DPGross       float64                `gorm:"column:dp_gross" json:"dp_gross"`
	DPPaid        float64                `gorm:"column:dp_paid" json:"dp_paid"`
	DPPct         float64                `gorm:"column:dp_pct" json:"dp_pct"`
	Tenor         int                    `gorm:"column:tenor" json:"tenor"`
	ResultStatus  string                 `gorm:"column:result_status" json:"result_status"`
	ResultNotes   string                 `gorm:"column:result_notes" json:"result_notes"`
	Attempts      []OrderFinanceAttempt  `gorm:"foreignKey:OrderID" json:"attempts"`
	CreatedBy     string                 `gorm:"column:created_by;type:uuid" json:"created_by"`
	CreatedAt     time.Time              `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time              `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt     gorm.DeletedAt         `gorm:"index" json:"-"`
}

func (Order) TableName() string { return "orders" }

type OrderFinanceAttempt struct {
	Id               string                               `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	OrderID          string                               `gorm:"column:order_id;type:uuid;not null;index" json:"order_id"`
	FinanceCompanyID string                               `gorm:"column:finance_company_id;type:uuid;not null" json:"finance_company_id"`
	FinanceCompany   *domainfinancecompany.FinanceCompany `gorm:"foreignKey:FinanceCompanyID" json:"finance_company,omitempty"`
	AttemptNo        int                                  `gorm:"column:attempt_no;not null" json:"attempt_no"`
	Status           string                               `gorm:"column:status;not null" json:"status"`
	Notes            string                               `gorm:"column:notes" json:"notes"`
	CreatedAt        time.Time                            `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (OrderFinanceAttempt) TableName() string { return "order_finance_attempts" }

type OrderExportJob struct {
	ID           string     `json:"id"`
	Status       string     `json:"status"`
	Progress     int        `json:"progress"`
	Message      string     `json:"message"`
	FileName     string     `json:"file_name,omitempty"`
	TotalRows    int        `json:"total_rows"`
	ExportedRows int        `json:"exported_rows"`
	FromDate     string     `json:"from_date"`
	ToDate       string     `json:"to_date"`
	Search       string     `json:"search,omitempty"`
	StatusFilter string     `json:"status_filter,omitempty"`
	CreatedBy    string     `json:"created_by,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	FinishedAt   *time.Time `json:"finished_at,omitempty"`
	Error        string     `json:"error,omitempty"`
	FilePath     string     `json:"-"`
}

type OrderExportDownload struct {
	FileName    string
	ContentType string
	Content     []byte
}
