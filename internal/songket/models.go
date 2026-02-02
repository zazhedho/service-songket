package songket

import (
	"time"

	"gorm.io/gorm"
)

// Dealer represents a dealer location.
type Dealer struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;not null" json:"name"`
	Regency   string         `gorm:"column:regency" json:"regency"`
	Province  string         `gorm:"column:province" json:"province"`
	Address   string         `gorm:"column:address" json:"address"`
	Latitude  float64        `gorm:"column:lat" json:"lat"`
	Longitude float64        `gorm:"column:lng" json:"lng"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Dealer) TableName() string { return "dealers" }

// FinanceCompany stores lender information.
type FinanceCompany struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (FinanceCompany) TableName() string { return "finance_companies" }

// MotorType contains bike variants and their OTR price.
type MotorType struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	OTR       float64        `gorm:"column:otr;not null" json:"otr"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (MotorType) TableName() string { return "motor_types" }

// Job is the occupation reference used in orders and credit capability.
type Job struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Job) TableName() string { return "jobs" }

// Order captures dealer submissions.
type Order struct {
	Id            string                `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	PoolingNumber string                `gorm:"column:pooling_number;not null" json:"pooling_number"`
	PoolingAt     time.Time             `gorm:"column:pooling_at;not null" json:"pooling_at"`
	ResultAt      *time.Time            `gorm:"column:result_at" json:"result_at"`
	DealerID      string                `gorm:"column:dealer_id;type:uuid;not null" json:"dealer_id"`
	Dealer        *Dealer               `gorm:"foreignKey:DealerID" json:"dealer,omitempty"`
	ConsumerName  string                `gorm:"column:consumer_name;not null" json:"consumer_name"`
	ConsumerPhone string                `gorm:"column:consumer_phone;not null" json:"consumer_phone"`
	Regency       string                `gorm:"column:regency" json:"regency"`
	Address       string                `gorm:"column:address" json:"address"`
	JobID         string                `gorm:"column:job_id;type:uuid" json:"job_id"`
	Job           *Job                  `gorm:"foreignKey:JobID" json:"job,omitempty"`
	MotorTypeID   string                `gorm:"column:motor_type_id;type:uuid" json:"motor_type_id"`
	MotorType     *MotorType            `gorm:"foreignKey:MotorTypeID" json:"motor_type,omitempty"`
	OTR           float64               `gorm:"column:otr" json:"otr"`
	DPGross       float64               `gorm:"column:dp_gross" json:"dp_gross"`
	DPPaid        float64               `gorm:"column:dp_paid" json:"dp_paid"`
	DPPct         float64               `gorm:"column:dp_pct" json:"dp_pct"`
	Tenor         int                   `gorm:"column:tenor" json:"tenor"`
	ResultStatus  string                `gorm:"column:result_status" json:"result_status"`
	ResultNotes   string                `gorm:"column:result_notes" json:"result_notes"`
	Attempts      []OrderFinanceAttempt `gorm:"foreignKey:OrderID" json:"attempts"`
	CreatedBy     string                `gorm:"column:created_by;type:uuid" json:"created_by"`
	CreatedAt     time.Time             `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time             `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt     gorm.DeletedAt        `gorm:"index" json:"-"`
}

func (Order) TableName() string { return "orders" }

// OrderFinanceAttempt stores per-finance-company results for an order.
type OrderFinanceAttempt struct {
	Id               string          `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	OrderID          string          `gorm:"column:order_id;type:uuid;not null;index" json:"order_id"`
	FinanceCompanyID string          `gorm:"column:finance_company_id;type:uuid;not null" json:"finance_company_id"`
	FinanceCompany   *FinanceCompany `gorm:"foreignKey:FinanceCompanyID" json:"finance_company,omitempty"`
	AttemptNo        int             `gorm:"column:attempt_no;not null" json:"attempt_no"`
	Status           string          `gorm:"column:status;not null" json:"status"`
	Notes            string          `gorm:"column:notes" json:"notes"`
	CreatedAt        time.Time       `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (OrderFinanceAttempt) TableName() string { return "order_finance_attempts" }

// CreditCapability records risk score per job and regency.
type CreditCapability struct {
	Id        string    `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Regency   string    `gorm:"column:regency;index:idx_credit_regency_job,unique" json:"regency"`
	JobID     string    `gorm:"column:job_id;type:uuid;index:idx_credit_regency_job,unique" json:"job_id"`
	Job       *Job      `gorm:"foreignKey:JobID" json:"job,omitempty"`
	Score     float64   `gorm:"column:score" json:"score"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (CreditCapability) TableName() string { return "credit_capabilities" }

// QuadrantResult stores quadrant classification per area/job.
type QuadrantResult struct {
	Id          string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Regency     string         `gorm:"column:regency;index:idx_quadrant_regency_job,unique" json:"regency"`
	JobID       string         `gorm:"column:job_id;type:uuid;index:idx_quadrant_regency_job,unique" json:"job_id"`
	Job         *Job           `gorm:"foreignKey:JobID" json:"job,omitempty"`
	Quadrant    int            `gorm:"column:quadrant" json:"quadrant"`
	OrderCount  int64          `gorm:"column:order_count" json:"order_count"`
	CreditScore float64        `gorm:"column:credit_score" json:"credit_score"`
	ComputedAt  time.Time      `gorm:"column:computed_at;autoCreateTime" json:"computed_at"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (QuadrantResult) TableName() string { return "quadrants" }

// Commodity is a priceable commodity.
type Commodity struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	Unit      string         `gorm:"column:unit" json:"unit"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Commodity) TableName() string { return "commodities" }

// CommodityPrice stores scraping results for commodities.
type CommodityPrice struct {
	Id          string     `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CommodityID string     `gorm:"column:commodity_id;type:uuid;index" json:"commodity_id"`
	Commodity   *Commodity `gorm:"foreignKey:CommodityID" json:"commodity,omitempty"`
	Price       float64    `gorm:"column:price" json:"price"`
	CollectedAt time.Time  `gorm:"column:collected_at;index" json:"collected_at"`
	SourceURL   string     `gorm:"column:source_url" json:"source_url"`
}

func (CommodityPrice) TableName() string { return "commodity_prices" }

// NewsSource keeps configured portals.
type NewsSource struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	URL       string         `gorm:"column:url;not null" json:"url"`
	Category  string         `gorm:"column:category" json:"category"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (NewsSource) TableName() string { return "news_sources" }

// NewsItem stores scraped headlines.
type NewsItem struct {
	Id          string      `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	SourceID    string      `gorm:"column:source_id;type:uuid;index" json:"source_id"`
	Source      *NewsSource `gorm:"foreignKey:SourceID" json:"source,omitempty"`
	Title       string      `gorm:"column:title" json:"title"`
	URL         string      `gorm:"column:url" json:"url"`
	Category    string      `gorm:"column:category" json:"category"`
	PublishedAt time.Time   `gorm:"column:published_at;index" json:"published_at"`
	CreatedAt   time.Time   `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (NewsItem) TableName() string { return "news_items" }
