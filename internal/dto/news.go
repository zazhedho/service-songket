package dto

type NewsSourceRequest struct {
	Name     string `json:"name" binding:"required"`
	URL      string `json:"url" binding:"required"`
	Category string `json:"category"`
}
