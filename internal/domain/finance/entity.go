package domainfinance

import "time"

type DateRange struct {
	From time.Time
	To   time.Time
}

type DealerMetricsBase struct {
	TotalOrders        int64    `json:"total_orders"`
	LeadTimeSecondsAvg *float64 `json:"lead_time_seconds_avg"`
	ApprovedOrders     int64    `json:"approved_orders"`
	RescuedOrders      int64    `json:"rescued_orders"`
}

type DealerFinanceCompanyMetricRow struct {
	FinanceCompanyID   string   `json:"finance_company_id"`
	FinanceCompanyName string   `json:"finance_company_name"`
	TotalOrders        int64    `json:"total_orders"`
	ApprovedCount      int64    `json:"approved_count"`
	RejectedCount      int64    `json:"rejected_count"`
	LeadTimeSecondsAvg *float64 `json:"lead_time_seconds_avg"`
	RescueApprovedFc2  int64    `json:"rescue_approved_fc2"`
}

type FinanceCompanyDealerMetricRow struct {
	DealerID           string   `gorm:"column:dealer_id" json:"dealer_id"`
	DealerName         string   `gorm:"column:dealer_name" json:"dealer_name"`
	TotalOrders        int64    `gorm:"column:total_orders" json:"total_orders"`
	ApprovedCount      int64    `gorm:"column:approved_count" json:"approved_count"`
	RejectedCount      int64    `gorm:"column:rejected_count" json:"rejected_count"`
	LeadTimeSecondsAvg *float64 `gorm:"column:lead_time_seconds_avg" json:"lead_time_seconds_avg"`
	RescueApprovedFc2  int64    `gorm:"column:rescue_approved_fc2" json:"rescue_approved_fc2"`
}

type FinanceMigrationSummary struct {
	TotalRows       int64   `gorm:"column:total_rows" json:"total_rows"`
	TotalDataSum    int64   `gorm:"column:total_data_sum" json:"total_data_sum"`
	TotalApproveSum int64   `gorm:"column:total_approve_sum" json:"total_approve_sum"`
	TotalRejectSum  int64   `gorm:"column:total_reject_sum" json:"total_reject_sum"`
	ApprovalRate    float64 `gorm:"-" json:"approval_rate"`
}

type SummaryBucket struct {
	Label string `gorm:"column:label" json:"label"`
	Total int64  `gorm:"column:total" json:"total"`
}

type FinanceMigrationDetailSummary struct {
	TotalOrders           int64           `gorm:"column:total_orders" json:"total_orders"`
	TotalDealers          int64           `gorm:"column:total_dealers" json:"total_dealers"`
	DealerCoveragePercent float64         `gorm:"-" json:"dealer_coverage_percent"`
	ApprovedCount         int64           `gorm:"column:approved_count" json:"approved_count"`
	RejectedCount         int64           `gorm:"column:rejected_count" json:"rejected_count"`
	ApprovalRate          float64         `gorm:"-" json:"approval_rate"`
	LeadAvgSeconds        *float64        `gorm:"column:lead_avg_seconds" json:"lead_avg_seconds"`
	RescueFc2             int64           `gorm:"column:rescue_fc2" json:"rescue_fc2"`
	DealerTotals          []SummaryBucket `gorm:"-" json:"dealer_totals"`
	MotorTypeTotals       []SummaryBucket `gorm:"-" json:"motor_type_totals"`
}

type FinanceApprovalGroupingRow struct {
	FinanceCompanyID   string `gorm:"column:finance_company_id" json:"finance_company_id"`
	FinanceCompanyName string `gorm:"column:finance_company_name" json:"finance_company_name"`
	Status             string `gorm:"column:status" json:"status"`
	TotalData          int64  `gorm:"column:total_data" json:"total_data"`
}

type FinanceApprovalTransitionRow struct {
	Finance1CompanyID   string `gorm:"column:finance_1_company_id" json:"finance_1_company_id"`
	Finance1CompanyName string `gorm:"column:finance_1_company_name" json:"finance_1_company_name"`
	Finance2CompanyID   string `gorm:"column:finance_2_company_id" json:"finance_2_company_id"`
	Finance2CompanyName string `gorm:"column:finance_2_company_name" json:"finance_2_company_name"`
	TotalData           int64  `gorm:"column:total_data" json:"total_data"`
	ApprovedCount       int64  `gorm:"column:approved_count" json:"approved_count"`
	RejectedCount       int64  `gorm:"column:rejected_count" json:"rejected_count"`
}

type FinanceMigrationReportItem struct {
	OrderID           string     `gorm:"column:order_id" json:"order_id"`
	PoolingNumber     string     `gorm:"column:pooling_number" json:"pooling_number"`
	PoolingAt         time.Time  `gorm:"column:pooling_at" json:"pooling_at"`
	ResultAt          *time.Time `gorm:"column:result_at" json:"result_at"`
	DealerOrderTotal  int        `gorm:"column:dealer_order_total" json:"dealer_order_total"`
	TransitionTotal   int        `gorm:"column:transition_total_data" json:"transition_total_data"`
	DealerName        string     `gorm:"column:dealer_name" json:"dealer_name"`
	DealerProvince    string     `gorm:"column:dealer_province" json:"dealer_province"`
	DealerRegency     string     `gorm:"column:dealer_regency" json:"dealer_regency"`
	DealerDistrict    string     `gorm:"column:dealer_district" json:"dealer_district"`
	DealerVillage     string     `gorm:"column:dealer_village" json:"dealer_village"`
	DealerAddress     string     `gorm:"column:dealer_address" json:"dealer_address"`
	ConsumerName      string     `gorm:"column:consumer_name" json:"consumer_name"`
	ConsumerPhone     string     `gorm:"column:consumer_phone" json:"consumer_phone"`
	Province          string     `gorm:"column:province" json:"province"`
	Regency           string     `gorm:"column:regency" json:"regency"`
	District          string     `gorm:"column:district" json:"district"`
	Village           string     `gorm:"column:village" json:"village"`
	Address           string     `gorm:"column:address" json:"address"`
	JobName           string     `gorm:"column:job_name" json:"job_name"`
	NetIncome         float64    `gorm:"column:net_income" json:"net_income"`
	MotorTypeName     string     `gorm:"column:motor_type_name" json:"motor_type_name"`
	InstallmentAmount float64    `gorm:"column:installment_amount" json:"installment_amount"`
	OTR               float64    `gorm:"column:otr" json:"otr"`
	DPGross           float64    `gorm:"column:dp_gross" json:"dp_gross"`
	DPPaid            float64    `gorm:"column:dp_paid" json:"dp_paid"`
	DPPct             float64    `gorm:"column:dp_pct" json:"dp_pct"`
	Tenor             int        `gorm:"column:tenor" json:"tenor"`
	OrderResultStatus string     `gorm:"column:order_result_status" json:"order_result_status"`
	OrderResultNotes  string     `gorm:"column:order_result_notes" json:"order_result_notes"`
	Finance1Name      string     `gorm:"column:finance_1_name" json:"finance_1_name"`
	Finance1Status    string     `gorm:"column:finance_1_status" json:"finance_1_status"`
	Finance1Notes     string     `gorm:"column:finance_1_notes" json:"finance_1_notes"`
	Finance2Name      string     `gorm:"column:finance_2_name" json:"finance_2_name"`
	Finance2Status    string     `gorm:"column:finance_2_status" json:"finance_2_status"`
	Finance2Notes     string     `gorm:"column:finance_2_notes" json:"finance_2_notes"`
	TotalApproveFc2   int        `gorm:"column:total_approve_finance_2" json:"total_approve_finance_2"`
	TotalRejectFc2    int        `gorm:"column:total_reject_finance_2" json:"total_reject_finance_2"`
	OrderCreatedAt    time.Time  `gorm:"column:order_created_at" json:"order_created_at"`
	OrderUpdatedAt    time.Time  `gorm:"column:order_updated_at" json:"order_updated_at"`
	Finance1Decision  time.Time  `gorm:"column:finance_1_decision_at" json:"finance_1_decision_at"`
	Finance2Decision  time.Time  `gorm:"column:finance_2_decision_at" json:"finance_2_decision_at"`
}
