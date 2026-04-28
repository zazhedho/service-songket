package dto

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

type MotorTypeRequest struct {
	Name         string  `json:"name" binding:"required"`
	Brand        string  `json:"brand" binding:"required"`
	Model        string  `json:"model" binding:"required"`
	Type         string  `json:"type" binding:"required"`
	OTR          float64 `json:"otr" binding:"required,gte=0"`
	ProvinceCode string  `json:"province_code" binding:"required"`
	ProvinceName string  `json:"province_name" binding:"required"`
	RegencyCode  string  `json:"regency_code" binding:"required"`
	RegencyName  string  `json:"regency_name" binding:"required"`
}

type InstallmentRequest struct {
	MotorTypeID string  `json:"motor_type_id" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gte=0"`
}

type JobRequest struct {
	Name string `json:"name" binding:"required"`
}

type NetIncomeAreaRequest struct {
	ProvinceCode string `json:"province_code" binding:"required"`
	ProvinceName string `json:"province_name" binding:"required"`
	RegencyCode  string `json:"regency_code" binding:"required"`
	RegencyName  string `json:"regency_name" binding:"required"`
}

type NetIncomeRequest struct {
	JobID         string                 `json:"job_id" binding:"required"`
	NetIncome     float64                `json:"net_income" binding:"required,gte=0"`
	AreaNetIncome []NetIncomeAreaRequest `json:"area_net_income" binding:"required,min=1,dive"`
}
