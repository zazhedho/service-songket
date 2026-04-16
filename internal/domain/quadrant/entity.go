package domainquadrant

import legacysongket "service-songket/internal/songket"

type QuadrantResult = legacysongket.QuadrantResult

type QuadrantFlowSummary struct {
	OrderID              string  `json:"order_id"`
	PoolingNumber        string  `json:"pooling_number"`
	Province             string  `json:"province"`
	Regency              string  `json:"regency"`
	JobID                string  `json:"job_id"`
	JobName              string  `json:"job_name"`
	MotorTypeID          string  `json:"motor_type_id"`
	MotorTypeName        string  `json:"motor_type_name"`
	TotalOrders          int64   `json:"total_orders"`
	OrderInPercent       float64 `json:"order_in_percent"`
	OrderInGrowthPercent float64 `json:"order_in_growth_percent"`
	OrderInCurrentTotal  int64   `json:"order_in_current_total"`
	OrderInPreviousTotal int64   `json:"order_in_previous_total"`
	ReferenceMonth       string  `json:"reference_month"`
	ReferencePrevMonth   string  `json:"reference_prev_month"`
	CreditCapability     float64 `json:"credit_capability"`
	Quadrant             int     `json:"quadrant"`
}
