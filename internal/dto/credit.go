package dto

type CreditCapabilityRequest struct {
	Province string  `json:"province" binding:"required"`
	Regency  string  `json:"regency" binding:"required"`
	District string  `json:"district" binding:"required"`
	Village  string  `json:"village"`
	Address  string  `json:"address"`
	JobID    string  `json:"job_id" binding:"required"`
	Score    float64 `json:"score" binding:"required"`
}
