package dto

type CreateOrderRequest struct {
	PoolingNumber     string  `json:"pooling_number" binding:"required"`
	PoolingAt         string  `json:"pooling_at" binding:"required"`
	ResultAt          *string `json:"result_at"`
	DealerID          string  `json:"dealer_id"`
	FinanceCompanyID  string  `json:"finance_company_id" binding:"required"`
	ConsumerName      string  `json:"consumer_name" binding:"required"`
	ConsumerPhone     string  `json:"consumer_phone" binding:"required"`
	Province          string  `json:"province" binding:"required"`
	Regency           string  `json:"regency" binding:"required"`
	District          string  `json:"district" binding:"required"`
	Village           string  `json:"village"`
	Address           string  `json:"address" binding:"required"`
	JobID             string  `json:"job_id" binding:"required"`
	MotorTypeID       string  `json:"motor_type_id" binding:"required"`
	Installment       float64 `json:"installment" binding:"required,gte=0"`
	DPGross           float64 `json:"dp_gross" binding:"required"`
	DPPaid            float64 `json:"dp_paid" binding:"required"`
	Tenor             int     `json:"tenor" binding:"required,min=1,max=60"`
	ResultStatus      string  `json:"result_status" binding:"required"`
	ResultNotes       string  `json:"result_notes"`
	FinanceCompany2ID string  `json:"finance_company2_id"`
	ResultStatus2     string  `json:"result_status2"`
	ResultNotes2      string  `json:"result_notes2"`
	FinanceCompany3ID string  `json:"finance_company3_id"`
	ResultStatus3     string  `json:"result_status3"`
	ResultNotes3      string  `json:"result_notes3"`
}

type UpdateOrderRequest struct {
	PoolingNumber     *string  `json:"pooling_number"`
	PoolingAt         *string  `json:"pooling_at"`
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
	Installment       *float64 `json:"installment" binding:"omitempty,gte=0"`
	DPGross           *float64 `json:"dp_gross"`
	DPPaid            *float64 `json:"dp_paid"`
	Tenor             *int     `json:"tenor" binding:"omitempty,min=1,max=60"`
	ResultStatus      *string  `json:"result_status"`
	ResultNotes       *string  `json:"result_notes"`
	FinanceCompany2ID *string  `json:"finance_company2_id"`
	ResultStatus2     *string  `json:"result_status2"`
	ResultNotes2      *string  `json:"result_notes2"`
	FinanceCompany3ID *string  `json:"finance_company3_id"`
	ResultStatus3     *string  `json:"result_status3"`
	ResultNotes3      *string  `json:"result_notes3"`
}

type OrderExportRequest struct {
	FromDate         string `json:"from_date" binding:"required"`
	ToDate           string `json:"to_date" binding:"required"`
	Search           string `json:"search"`
	Status           string `json:"status"`
	DealerID         string `json:"dealer_id"`
	FinanceCompanyID string `json:"finance_company_id"`
}

type DashboardSummaryQuery struct {
	Area             string `form:"area"`
	DealerID         string `form:"dealer_id"`
	FinanceCompanyID string `form:"finance_company_id"`
	ResultStatus     string `form:"result_status"`
	Analysis         string `form:"analysis"`
	Month            int    `form:"month"`
	Year             int    `form:"year"`
	Date             string `form:"date"`
	From             string `form:"from"`
	To               string `form:"to"`
	Holidays         string `form:"holidays"`
}
