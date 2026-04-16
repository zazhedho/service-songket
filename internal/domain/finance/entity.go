package domainfinance

import "time"

type DateRange struct {
	From time.Time
	To   time.Time
}

type FinanceMigrationReportItem struct {
	OrderID           string     `json:"order_id"`
	PoolingNumber     string     `json:"pooling_number"`
	PoolingAt         time.Time  `json:"pooling_at"`
	ResultAt          *time.Time `json:"result_at"`
	DealerOrderTotal  int        `json:"dealer_order_total"`
	TransitionTotal   int        `json:"transition_total_data"`
	DealerName        string     `json:"dealer_name"`
	DealerProvince    string     `json:"dealer_province"`
	DealerRegency     string     `json:"dealer_regency"`
	DealerDistrict    string     `json:"dealer_district"`
	DealerVillage     string     `json:"dealer_village"`
	DealerAddress     string     `json:"dealer_address"`
	ConsumerName      string     `json:"consumer_name"`
	ConsumerPhone     string     `json:"consumer_phone"`
	Province          string     `json:"province"`
	Regency           string     `json:"regency"`
	District          string     `json:"district"`
	Village           string     `json:"village"`
	Address           string     `json:"address"`
	JobName           string     `json:"job_name"`
	NetIncome         float64    `json:"net_income"`
	MotorTypeName     string     `json:"motor_type_name"`
	InstallmentAmount float64    `json:"installment_amount"`
	OTR               float64    `json:"otr"`
	DPGross           float64    `json:"dp_gross"`
	DPPaid            float64    `json:"dp_paid"`
	DPPct             float64    `json:"dp_pct"`
	Tenor             int        `json:"tenor"`
	OrderResultStatus string     `json:"order_result_status"`
	OrderResultNotes  string     `json:"order_result_notes"`
	Finance1Name      string     `json:"finance_1_name"`
	Finance1Status    string     `json:"finance_1_status"`
	Finance1Notes     string     `json:"finance_1_notes"`
	Finance2Name      string     `json:"finance_2_name"`
	Finance2Status    string     `json:"finance_2_status"`
	Finance2Notes     string     `json:"finance_2_notes"`
	TotalApproveFc2   int        `json:"total_approve_finance_2"`
	TotalRejectFc2    int        `json:"total_reject_finance_2"`
	OrderCreatedAt    time.Time  `json:"order_created_at"`
	OrderUpdatedAt    time.Time  `json:"order_updated_at"`
	Finance1Decision  time.Time  `json:"finance_1_decision_at"`
	Finance2Decision  time.Time  `json:"finance_2_decision_at"`
}
