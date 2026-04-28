package dto

type QuadrantComputeRequest struct {
	OrderThreshold int     `json:"order_threshold" binding:"required"`
	ScoreThreshold float64 `json:"score_threshold" binding:"required"`
	From           string  `json:"from"`
	To             string  `json:"to"`
}
