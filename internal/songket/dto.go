package songket

import "time"

// CreateOrderRequest represents the payload for dealer/main dealer to create an order-in.
type CreateOrderRequest struct {
	PoolingNumber     string  `json:"pooling_number" binding:"required"`
	PoolingAt         string  `json:"pooling_at" binding:"required"` // RFC3339
	ResultAt          *string `json:"result_at"`                     // optional RFC3339
	DealerID          string  `json:"dealer_id"`
	FinanceCompanyID  string  `json:"finance_company_id" binding:"required"`
	ConsumerName      string  `json:"consumer_name" binding:"required"`
	ConsumerPhone     string  `json:"consumer_phone" binding:"required"`
	Province          string  `json:"province" binding:"required"`
	Regency           string  `json:"regency" binding:"required"`
	District          string  `json:"district" binding:"required"` // kecamatan
	Village           string  `json:"village"`                     // kelurahan
	Address           string  `json:"address" binding:"required"`
	JobID             string  `json:"job_id" binding:"required"`
	MotorTypeID       string  `json:"motor_type_id" binding:"required"`
	DPGross           float64 `json:"dp_gross" binding:"required"`
	DPPaid            float64 `json:"dp_paid" binding:"required"`
	Tenor             int     `json:"tenor" binding:"required,min=1,max=60"`
	ResultStatus      string  `json:"result_status" binding:"required"` // approve|pending|reject
	ResultNotes       string  `json:"result_notes"`
	FinanceCompany2ID string  `json:"finance_company2_id"`
	ResultStatus2     string  `json:"result_status2"`
	ResultNotes2      string  `json:"result_notes2"`
}

type UpdateOrderRequest struct {
	PoolingNumber     *string  `json:"pooling_number"`
	PoolingAt         *string  `json:"pooling_at"` // RFC3339
	ResultAt          *string  `json:"result_at"`
	DealerID          *string  `json:"dealer_id"`
	FinanceCompanyID  *string  `json:"finance_company_id"`
	ConsumerName      *string  `json:"consumer_name"`
	ConsumerPhone     *string  `json:"consumer_phone"`
	Province          *string  `json:"province"`
	Regency           *string  `json:"regency"`
	District          *string  `json:"district"`
	Village           *string  `json:"village"`
	Address           *string  `json:"address"`
	JobID             *string  `json:"job_id"`
	MotorTypeID       *string  `json:"motor_type_id"`
	DPGross           *float64 `json:"dp_gross"`
	DPPaid            *float64 `json:"dp_paid"`
	Tenor             *int     `json:"tenor" binding:"omitempty,min=1,max=60"`
	ResultStatus      *string  `json:"result_status"`
	ResultNotes       *string  `json:"result_notes"`
	FinanceCompany2ID *string  `json:"finance_company2_id"`
	ResultStatus2     *string  `json:"result_status2"`
	ResultNotes2      *string  `json:"result_notes2"`
}

type CreditCapabilityRequest struct {
	Province string  `json:"province" binding:"required"`
	Regency  string  `json:"regency" binding:"required"`
	District string  `json:"district" binding:"required"`
	Village  string  `json:"village"`
	Address  string  `json:"address"`
	JobID    string  `json:"job_id" binding:"required"`
	Score    float64 `json:"score" binding:"required"`
}

type QuadrantComputeRequest struct {
	OrderThreshold int     `json:"order_threshold" binding:"required"`
	ScoreThreshold float64 `json:"score_threshold" binding:"required"`
	From           string  `json:"from"` // optional date
	To             string  `json:"to"`
}

type DealerRequest struct {
	Name      string  `json:"name" binding:"required"`
	Regency   string  `json:"regency" binding:"required"`
	Province  string  `json:"province" binding:"required"`
	District  string  `json:"district" binding:"required"`
	Village   string  `json:"village"`
	Phone     string  `json:"phone" binding:"required"`
	Address   string  `json:"address"`
	Latitude  float64 `json:"lat" binding:"required"`
	Longitude float64 `json:"lng" binding:"required"`
}

type FinanceCompanyRequest struct {
	Name     string `json:"name" binding:"required"`
	Province string `json:"province" binding:"required"`
	Regency  string `json:"regency" binding:"required"`
	District string `json:"district" binding:"required"`
	Village  string `json:"village"`
	Address  string `json:"address"`
	Phone    string `json:"phone" binding:"required"`
}

type NewsSourceRequest struct {
	Name     string `json:"name" binding:"required"`
	URL      string `json:"url" binding:"required"`
	Category string `json:"category"`
}

type CommodityRequest struct {
	Name string `json:"name" binding:"required"`
	Unit string `json:"unit" binding:"required"`
}

type CommodityPriceRequest struct {
	CommodityID   string  `json:"commodity_id"`               // optional if commodity_name provided
	CommodityName string  `json:"commodity_name" binding:"-"` // optional free text
	Unit          string  `json:"unit"`                       // optional when commodity_id provided
	Price         float64 `json:"price" binding:"required"`
	CollectedAt   string  `json:"collected_at"` // RFC3339 optional, default now
	SourceURL     string  `json:"source_url"`
}

type DateRange struct {
	From time.Time
	To   time.Time
}
