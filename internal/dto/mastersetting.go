package dto

type NewsScrapeCronSettingRequest struct {
	IsActive        bool `json:"is_active"`
	IntervalMinutes int  `json:"interval_minutes" binding:"required,min=0,max=43200"`
}

type PriceScrapeCronSettingRequest struct {
	IsActive     bool `json:"is_active"`
	IntervalDays int  `json:"interval_days" binding:"required,min=0,max=31"`
}
