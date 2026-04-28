package dto

type CommodityRequest struct {
	Name string `json:"name" binding:"required"`
	Unit string `json:"unit" binding:"required"`
}

type CommodityPriceRequest struct {
	CommodityID   string  `json:"commodity_id"`
	CommodityName string  `json:"commodity_name" binding:"-"`
	Unit          string  `json:"unit"`
	Price         float64 `json:"price" binding:"required"`
	CollectedAt   string  `json:"collected_at"`
	SourceURL     string  `json:"source_url"`
}
