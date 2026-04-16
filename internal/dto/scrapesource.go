package dto

type ScrapeSourceRequest struct {
	Name     string `json:"name"`
	URL      string `json:"url"`
	Type     string `json:"type"`
	Category string `json:"category"`
	IsActive bool   `json:"is_active"`
}
