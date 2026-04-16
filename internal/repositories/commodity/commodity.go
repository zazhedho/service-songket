package repositorycommodity

import (
	"errors"
	"fmt"
	"strings"
	"time"

	domaincommodity "service-songket/internal/domain/commodity"
	interfacecommodity "service-songket/internal/interfaces/commodity"
	legacysongket "service-songket/internal/songket"
	"service-songket/pkg/filter"
	"service-songket/utils"

	"gorm.io/gorm"
)

type repo struct {
	db *gorm.DB
}

func NewCommodityRepo(db *gorm.DB) interfacecommodity.RepoCommodityInterface {
	return &repo{db: db}
}

func (r *repo) StoreCommodity(data domaincommodity.Commodity) error {
	return r.db.Create(&data).Error
}

func (r *repo) GetCommodityByName(name string) (domaincommodity.Commodity, error) {
	var ret domaincommodity.Commodity
	if err := r.db.Where("name = ?", name).First(&ret).Error; err != nil {
		return domaincommodity.Commodity{}, err
	}
	return ret, nil
}

func (r *repo) GetCommodityByID(id string) (domaincommodity.Commodity, error) {
	var ret domaincommodity.Commodity
	if err := r.db.First(&ret, "id = ?", id).Error; err != nil {
		return domaincommodity.Commodity{}, err
	}
	return ret, nil
}

func (r *repo) UpdateCommodity(data domaincommodity.Commodity) error {
	return r.db.Save(&data).Error
}

func (r *repo) StorePrice(data domaincommodity.CommodityPrice) error {
	return r.db.Create(&data).Error
}

func (r *repo) GetAllCommodities() ([]domaincommodity.Commodity, error) {
	rows := make([]domaincommodity.Commodity, 0)
	if err := r.db.Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) GetLatestPriceByCommodityID(commodityID string) (domaincommodity.CommodityPrice, error) {
	var ret domaincommodity.CommodityPrice
	if err := r.db.Where("commodity_id = ?", commodityID).Order("collected_at DESC").First(&ret).Error; err != nil {
		return domaincommodity.CommodityPrice{}, err
	}
	return ret, nil
}

func (r *repo) GetAllPrices(params filter.BaseParams) ([]domaincommodity.CommodityPrice, int64, error) {
	query := r.db.Model(&domaincommodity.CommodityPrice{}).
		Joins("LEFT JOIN commodities ON commodities.id = commodity_prices.commodity_id")

	if v, ok := params.Filters["commodity_id"]; ok {
		query = query.Where("commodity_prices.commodity_id = ?", v)
	}
	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(commodities.name) LIKE ? OR LOWER(commodity_prices.source_url) LIKE ?", search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "commodity_prices." + orderBy
	}

	rows := make([]domaincommodity.CommodityPrice, 0)
	if err := query.
		Preload("Commodity").
		Order(fmt.Sprintf("%s %s", orderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *repo) DeletePrice(id string) error {
	return r.db.Delete(&domaincommodity.CommodityPrice{}, "id = ?", id).Error
}

func (r *repo) StoreScrapeJob(data domaincommodity.ScrapeJob) error {
	return r.db.Create(&data).Error
}

func (r *repo) UpdateScrapeJobFields(id string, updates map[string]interface{}) error {
	return r.db.Model(&domaincommodity.ScrapeJob{}).Where("id = ?", id).Updates(updates).Error
}

func (r *repo) GetAllScrapeJobs(params filter.BaseParams) ([]domaincommodity.ScrapeJob, int64, error) {
	query := r.db.Model(&domaincommodity.ScrapeJob{})

	if v, ok := params.Filters["status"]; ok {
		query = query.Where("status = ?", v)
	}
	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(status) LIKE ? OR LOWER(message) LIKE ?", search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	rows := make([]domaincommodity.ScrapeJob, 0)
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *repo) StoreScrapeResult(data domaincommodity.ScrapeResult) error {
	return r.db.Create(&data).Error
}

func (r *repo) GetAllScrapeResults(jobID string, params filter.BaseParams) ([]domaincommodity.ScrapeResult, int64, error) {
	query := r.db.Model(&domaincommodity.ScrapeResult{}).Where("job_id = ?", jobID)

	if v, ok := params.Filters["source_url"]; ok {
		query = query.Where("source_url = ?", v)
	}
	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(commodity_name) LIKE ? OR LOWER(source_url) LIKE ?", search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	rows := make([]domaincommodity.ScrapeResult, 0)
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *repo) GetScrapeResults(jobID string, resultIDs []string) ([]domaincommodity.ScrapeResult, error) {
	rows := make([]domaincommodity.ScrapeResult, 0)
	if err := r.db.Where("job_id = ? AND id IN ?", jobID, resultIDs).Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *repo) ListActiveScrapeSourceURLs(sourceType string) ([]string, error) {
	var sources []legacysongket.ScrapeSource
	if err := r.db.Where("is_active = ? AND type = ?", true, sourceType).Find(&sources).Error; err != nil {
		return nil, err
	}
	urls := make([]string, 0, len(sources))
	for _, src := range sources {
		if trimmed := strings.TrimSpace(src.URL); trimmed != "" {
			urls = append(urls, trimmed)
		}
	}
	return urls, nil
}

func (r *repo) CommitScrapeResults(rows []domaincommodity.ScrapeResult) ([]domaincommodity.CommodityPrice, error) {
	collected := time.Now()
	saved := make([]domaincommodity.CommodityPrice, 0, len(rows))

	if err := r.db.Transaction(func(tx *gorm.DB) error {
		for _, row := range rows {
			if strings.TrimSpace(row.CommodityName) == "" {
				continue
			}
			var commodity domaincommodity.Commodity
			err := tx.Where("name = ?", row.CommodityName).First(&commodity).Error
			if err == nil {
				// use existing
			} else if errors.Is(err, gorm.ErrRecordNotFound) {
				commodity = domaincommodity.Commodity{Id: utils.CreateUUID(), Name: row.CommodityName, Unit: row.Unit}
				if err := tx.Create(&commodity).Error; err != nil {
					return err
				}
			} else {
				return err
			}

			price := domaincommodity.CommodityPrice{
				Id:          utils.CreateUUID(),
				CommodityID: commodity.Id,
				Price:       row.Price,
				CollectedAt: collected,
				SourceURL:   row.SourceURL,
			}
			if err := tx.Create(&price).Error; err != nil {
				return err
			}
			price.Commodity = &commodity
			saved = append(saved, price)
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return saved, nil
}
