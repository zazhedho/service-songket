package songket

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	MasterSettingKeyNewsScrapeCron  = "cron_scrape_news"
	MasterSettingKeyPriceScrapeCron = "cron_scrape_prices"
)

// Dealer represents a dealer location.
type Dealer struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	Regency   string         `gorm:"column:regency" json:"regency"`
	Province  string         `gorm:"column:province" json:"province"`
	District  string         `gorm:"column:district" json:"district"`
	Village   string         `gorm:"column:village" json:"village"`
	Phone     string         `gorm:"column:phone" json:"phone"`
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
	Province  string         `gorm:"column:province" json:"province"`
	Regency   string         `gorm:"column:regency" json:"regency"`
	District  string         `gorm:"column:district" json:"district"`
	Village   string         `gorm:"column:village" json:"village"`
	Address   string         `gorm:"column:address" json:"address"`
	Phone     string         `gorm:"column:phone" json:"phone"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (FinanceCompany) TableName() string { return "finance_companies" }

// MotorType contains bike variants and their OTR price.
type MotorType struct {
	Id           string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name         string         `gorm:"column:name;not null;index" json:"name"`
	Brand        string         `gorm:"column:brand" json:"brand"`
	Model        string         `gorm:"column:model" json:"model"`
	VariantType  string         `gorm:"column:variant_type" json:"type"`
	OTR          float64        `gorm:"column:otr;not null" json:"otr"`
	ProvinceCode string         `gorm:"column:province_code;index" json:"province_code"`
	ProvinceName string         `gorm:"column:province_name" json:"province_name"`
	RegencyCode  string         `gorm:"column:regency_code;index" json:"regency_code"`
	RegencyName  string         `gorm:"column:regency_name" json:"regency_name"`
	CreatedAt    time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (MotorType) TableName() string { return "motor_types" }

// Installment stores monthly installment value per motor type.
type Installment struct {
	Id          string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	MotorTypeID string         `gorm:"column:motor_type_id;type:uuid;not null;index" json:"motor_type_id"`
	MotorType   *MotorType     `gorm:"foreignKey:MotorTypeID" json:"motor_type,omitempty"`
	Amount      float64        `gorm:"column:amount;type:numeric(18,2);not null" json:"amount"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Installment) TableName() string { return "installments" }

// Job is the occupation reference used in orders and credit capability.
type Job struct {
	Id        string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"column:name;unique;not null" json:"name"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Job) TableName() string { return "jobs" }

// JobNetIncome stores net income settings per job and multi-area coverage.
type JobNetIncome struct {
	Id            string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	JobID         string         `gorm:"column:job_id;type:uuid;not null;uniqueIndex" json:"job_id"`
	Job           *Job           `gorm:"foreignKey:JobID" json:"job,omitempty"`
	NetIncome     float64        `gorm:"column:net_income;type:numeric(18,2);not null;default:0" json:"net_income"`
	AreaNetIncome datatypes.JSON `gorm:"column:area_net_income;type:jsonb;not null;default:'[]'" json:"area_net_income"`
	CreatedAt     time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (JobNetIncome) TableName() string { return "job_net_incomes" }

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
	Province      string                `gorm:"column:province" json:"province"`
	Regency       string                `gorm:"column:regency" json:"regency"`
	District      string                `gorm:"column:district" json:"district"`
	Village       string                `gorm:"column:village" json:"village"`
	Address       string                `gorm:"column:address" json:"address"`
	JobID         string                `gorm:"column:job_id;type:uuid" json:"job_id"`
	Job           *Job                  `gorm:"foreignKey:JobID" json:"job,omitempty"`
	MotorTypeID   string                `gorm:"column:motor_type_id;type:uuid" json:"motor_type_id"`
	MotorType     *MotorType            `gorm:"foreignKey:MotorTypeID" json:"motor_type,omitempty"`
	Installment   float64               `gorm:"column:installment" json:"installment"`
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
	Province  string    `gorm:"column:province" json:"province"`
	Regency   string    `gorm:"column:regency;index:idx_credit_regency_job,unique" json:"regency"`
	District  string    `gorm:"column:district" json:"district"`
	Village   string    `gorm:"column:village" json:"village"`
	Address   string    `gorm:"column:address" json:"address"`
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

// ScrapeJob tracks background scraping execution.
type ScrapeJob struct {
	Id         string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Status     string         `gorm:"column:status;type:varchar(20);index" json:"status"` // pending,running,success,error
	Message    string         `gorm:"column:message" json:"message"`
	SourceUrls datatypes.JSON `gorm:"column:source_urls" json:"source_urls"`
	CreatedAt  time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	StartedAt  *time.Time     `gorm:"column:started_at" json:"started_at"`
	FinishedAt *time.Time     `gorm:"column:finished_at" json:"finished_at"`
}

func (ScrapeJob) TableName() string { return "scrape_jobs" }

// ScrapeResult holds raw scraped rows before user selects to import.
type ScrapeResult struct {
	Id            string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	JobID         string         `gorm:"column:job_id;type:uuid;index" json:"job_id"`
	CommodityName string         `gorm:"column:commodity_name" json:"commodity_name"`
	Price         float64        `gorm:"column:price" json:"price"`
	Unit          string         `gorm:"column:unit" json:"unit"`
	SourceURL     string         `gorm:"column:source_url" json:"source_url"`
	ScrapedAt     time.Time      `gorm:"column:scraped_at" json:"scraped_at"`
	Raw           datatypes.JSON `gorm:"column:raw" json:"raw"`
}

func (ScrapeResult) TableName() string { return "scrape_results" }

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
	Id          string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	SourceID    *string        `gorm:"column:source_id;type:uuid;index" json:"source_id"`
	Source      *NewsSource    `gorm:"foreignKey:SourceID" json:"source,omitempty"`
	SourceName  string         `gorm:"column:source_name" json:"source_name"`
	Title       string         `gorm:"column:title" json:"title"`
	Content     string         `gorm:"column:content;type:text" json:"content"`
	Images      datatypes.JSON `gorm:"column:images;type:jsonb" json:"images"`
	URL         string         `gorm:"column:url" json:"url"`
	Category    string         `gorm:"column:category" json:"category"`
	PublishedAt time.Time      `gorm:"column:published_at;index" json:"published_at"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (NewsItem) TableName() string { return "news_items" }

// MasterSetting stores runtime application settings managed from database.
type MasterSetting struct {
	Id              string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Key             string         `gorm:"column:key;not null;uniqueIndex" json:"key"`
	IsActive        bool           `gorm:"column:is_active;not null;default:false" json:"is_active"`
	IntervalMinutes int            `gorm:"column:interval_minutes;not null;default:5" json:"interval_minutes"`
	Description     string         `gorm:"column:description" json:"description"`
	CreatedAt       time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (MasterSetting) TableName() string { return "master_settings" }

// MasterSettingHistory stores audit trail for setting changes.
type MasterSettingHistory struct {
	Id                      string         `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	SettingID               string         `gorm:"column:setting_id;type:uuid;index;not null" json:"setting_id"`
	Key                     string         `gorm:"column:key;index;not null" json:"key"`
	PreviousIsActive        bool           `gorm:"column:previous_is_active;not null;default:false" json:"previous_is_active"`
	PreviousIntervalMinutes int            `gorm:"column:previous_interval_minutes;not null;default:1" json:"previous_interval_minutes"`
	NewIsActive             bool           `gorm:"column:new_is_active;not null;default:false" json:"new_is_active"`
	NewIntervalMinutes      int            `gorm:"column:new_interval_minutes;not null;default:1" json:"new_interval_minutes"`
	ChangedByUserID         *string        `gorm:"column:changed_by_user_id;type:uuid;index" json:"changed_by_user_id,omitempty"`
	ChangedByName           string         `gorm:"column:changed_by_name" json:"changed_by_name"`
	CreatedAt               time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	DeletedAt               gorm.DeletedAt `gorm:"index" json:"-"`
}

func (MasterSettingHistory) TableName() string { return "master_setting_histories" }
