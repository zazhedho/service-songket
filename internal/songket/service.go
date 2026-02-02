package songket

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	//"io"
	//"net/http"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"starter-kit/pkg/filter"
	"starter-kit/utils"

	"gorm.io/gorm"
)

// Service encapsulates Songket business logic.
type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// parseTime safely parses RFC3339; returns zero time on empty string.
func parseTime(val *string) (time.Time, error) {
	if val == nil || strings.TrimSpace(*val) == "" {
		return time.Time{}, nil
	}
	t, err := time.Parse(time.RFC3339, *val)
	return t, err
}

func parseTimeRequired(val string) (time.Time, error) {
	t, err := time.Parse(time.RFC3339, val)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid time format, use RFC3339: %w", err)
	}
	return t, nil
}

// CreateOrder creates order + finance attempts.
func (s *Service) CreateOrder(req CreateOrderRequest, createdBy string, role string) (Order, error) {
	poolingAt, err := parseTimeRequired(req.PoolingAt)
	if err != nil {
		return Order{}, err
	}
	var resultAt *time.Time
	if req.ResultAt != nil && strings.TrimSpace(*req.ResultAt) != "" {
		rt, errTime := parseTime(req.ResultAt)
		if errTime != nil {
			return Order{}, errTime
		}
		resultAt = &rt
	}

	var motor MotorType
	if err := s.db.First(&motor, "id = ?", req.MotorTypeID).Error; err != nil {
		return Order{}, fmt.Errorf("motor type not found")
	}

	otr := motor.OTR
	dpPct := 0.0
	if otr > 0 {
		dpPct = (req.DPPaid / otr) * 100
	}

	order := Order{
		Id:            utils.CreateUUID(),
		PoolingNumber: req.PoolingNumber,
		PoolingAt:     poolingAt,
		ResultAt:      resultAt,
		DealerID:      req.DealerID,
		ConsumerName:  req.ConsumerName,
		ConsumerPhone: req.ConsumerPhone,
		Regency:       req.Regency,
		Address:       req.Address,
		JobID:         req.JobID,
		MotorTypeID:   req.MotorTypeID,
		OTR:           otr,
		DPGross:       req.DPGross,
		DPPaid:        req.DPPaid,
		DPPct:         dpPct,
		Tenor:         req.Tenor,
		ResultStatus:  strings.ToLower(req.ResultStatus),
		ResultNotes:   req.ResultNotes,
		CreatedBy:     createdBy,
	}

	// Optional default dealer id from env if not provided
	if order.DealerID == "" {
		if dealerId := utils.GetEnv("DEFAULT_DEALER_ID", "").(string); dealerId != "" {
			order.DealerID = dealerId
		}
	}
	if order.DealerID == "" {
		return Order{}, fmt.Errorf("dealer_id is required")
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		firstAttempt := OrderFinanceAttempt{
			Id:               utils.CreateUUID(),
			OrderID:          order.Id,
			FinanceCompanyID: req.FinanceCompanyID,
			AttemptNo:        1,
			Status:           strings.ToLower(req.ResultStatus),
			Notes:            req.ResultNotes,
		}
		if err := tx.Create(&firstAttempt).Error; err != nil {
			return err
		}

		if strings.ToLower(req.ResultStatus) == "reject" && req.FinanceCompany2ID != "" && req.ResultStatus2 != "" {
			secondAttempt := OrderFinanceAttempt{
				Id:               utils.CreateUUID(),
				OrderID:          order.Id,
				FinanceCompanyID: req.FinanceCompany2ID,
				AttemptNo:        2,
				Status:           strings.ToLower(req.ResultStatus2),
				Notes:            req.ResultNotes2,
			}
			if err := tx.Create(&secondAttempt).Error; err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return Order{}, err
	}

	return order, nil
}

// UpdateOrder updates order and attempts. Dealer can edit only own orders.
func (s *Service) UpdateOrder(id string, req UpdateOrderRequest, role, userId string) (Order, error) {
	var order Order
	if err := s.db.Preload("Attempts").First(&order, "id = ?", id).Error; err != nil {
		return Order{}, err
	}

	if role == utils.RoleDealer && order.CreatedBy != userId {
		return Order{}, errors.New("dealer can only edit own orders")
	}

	if req.PoolingNumber != nil {
		order.PoolingNumber = *req.PoolingNumber
	}
	if req.PoolingAt != nil {
		if t, err := parseTime(req.PoolingAt); err != nil {
			return Order{}, err
		} else if !t.IsZero() {
			order.PoolingAt = t
		}
	}
	if req.ResultAt != nil {
		if t, err := parseTime(req.ResultAt); err != nil {
			return Order{}, err
		} else if !t.IsZero() {
			order.ResultAt = &t
		} else {
			order.ResultAt = nil
		}
	}
	if req.ConsumerName != nil {
		order.ConsumerName = *req.ConsumerName
	}
	if req.ConsumerPhone != nil {
		order.ConsumerPhone = *req.ConsumerPhone
	}
	if req.DealerID != nil {
		order.DealerID = *req.DealerID
	}
	if req.Regency != nil {
		order.Regency = *req.Regency
	}
	if req.Address != nil {
		order.Address = *req.Address
	}
	if req.JobID != nil {
		order.JobID = *req.JobID
	}
	if req.MotorTypeID != nil {
		order.MotorTypeID = *req.MotorTypeID
		var motor MotorType
		if err := s.db.First(&motor, "id = ?", order.MotorTypeID).Error; err == nil {
			order.OTR = motor.OTR
		}
	}
	if req.DPGross != nil {
		order.DPGross = *req.DPGross
	}
	if req.DPPaid != nil {
		order.DPPaid = *req.DPPaid
	}
	if order.OTR > 0 {
		order.DPPct = (order.DPPaid / order.OTR) * 100
	}
	if req.Tenor != nil {
		order.Tenor = *req.Tenor
	}
	if req.ResultStatus != nil {
		order.ResultStatus = strings.ToLower(*req.ResultStatus)
	}
	if req.ResultNotes != nil {
		order.ResultNotes = *req.ResultNotes
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&order).Error; err != nil {
			return err
		}
		// Update attempts
		for _, att := range order.Attempts {
			if att.AttemptNo == 1 {
				if req.FinanceCompanyID != nil {
					att.FinanceCompanyID = *req.FinanceCompanyID
				}
				if req.ResultStatus != nil {
					att.Status = strings.ToLower(*req.ResultStatus)
				}
				if req.ResultNotes != nil {
					att.Notes = *req.ResultNotes
				}
				if err := tx.Save(&att).Error; err != nil {
					return err
				}
			}
			if att.AttemptNo == 2 {
				if req.FinanceCompany2ID != nil {
					att.FinanceCompanyID = *req.FinanceCompany2ID
				}
				if req.ResultStatus2 != nil && *req.ResultStatus2 != "" {
					att.Status = strings.ToLower(*req.ResultStatus2)
				}
				if req.ResultNotes2 != nil {
					att.Notes = *req.ResultNotes2
				}
				if err := tx.Save(&att).Error; err != nil {
					return err
				}
			}
		}

		// Add attempt 2 if missing and provided
		if req.FinanceCompany2ID != nil && *req.FinanceCompany2ID != "" && !s.hasAttempt(order.Attempts, 2) {
			status2 := ""
			if req.ResultStatus2 != nil {
				status2 = strings.ToLower(*req.ResultStatus2)
			}
			newAttempt := OrderFinanceAttempt{
				Id:               utils.CreateUUID(),
				OrderID:          order.Id,
				FinanceCompanyID: *req.FinanceCompany2ID,
				AttemptNo:        2,
				Status:           status2,
				Notes:            utils.ValueOrDefault(req.ResultNotes2, ""),
			}
			if err := tx.Create(&newAttempt).Error; err != nil {
				return err
			}
			order.Attempts = append(order.Attempts, newAttempt)
		}
		return nil
	}); err != nil {
		return Order{}, err
	}

	return order, nil
}

func (s *Service) hasAttempt(atts []OrderFinanceAttempt, num int) bool {
	for _, a := range atts {
		if a.AttemptNo == num {
			return true
		}
	}
	return false
}

// ListOrders with pagination and filters.
func (s *Service) ListOrders(params filter.BaseParams, role, userId string) ([]Order, int64, error) {
	query := s.db.Model(&Order{}).Preload("MotorType").Preload("Job").Preload("Attempts")

	if role == utils.RoleDealer {
		query = query.Where("created_by = ?", userId)
	}

	if v, ok := params.Filters["dealer_id"]; ok {
		query = query.Where("dealer_id = ?", v)
	}
	if v, ok := params.Filters["finance_company_id"]; ok {
		query = query.Joins("LEFT JOIN order_finance_attempts oa ON oa.order_id = orders.id AND oa.attempt_no = 1").
			Where("oa.finance_company_id = ?", v)
	}
	if v, ok := params.Filters["status"]; ok {
		query = query.Where("result_status = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(pooling_number) LIKE ? OR LOWER(consumer_name) LIKE ? OR LOWER(consumer_phone) LIKE ?", search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	query = query.Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).Offset(params.Offset).Limit(params.Limit)

	var orders []Order
	if err := query.Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

// DealerMetrics computes finance performance for a dealer (optionally filtered by finance company).
func (s *Service) DealerMetrics(dealerId string, financeCompanyID *string, dr DateRange) (map[string]interface{}, error) {
	// Base order filter
	qOrders := s.db.Model(&Order{}).Where("dealer_id = ?", dealerId)
	if !dr.From.IsZero() {
		qOrders = qOrders.Where("pooling_at >= ?", dr.From)
	}
	if !dr.To.IsZero() {
		qOrders = qOrders.Where("pooling_at <= ?", dr.To)
	}

	var totalOrders int64
	if err := qOrders.Count(&totalOrders).Error; err != nil {
		return nil, err
	}

	// Lead time avg
	var leadSeconds *float64
	err := qOrders.
		Select("avg(extract(epoch from result_at - pooling_at))").
		Where("result_at IS NOT NULL").
		Scan(&leadSeconds).Error
	if err != nil {
		return nil, err
	}

	// Approval rate (any approve attempt)
	qApprove := s.db.Model(&OrderFinanceAttempt{}).
		Joins("JOIN orders o ON o.id = order_finance_attempts.order_id").
		Where("o.dealer_id = ?", dealerId).
		Where("order_finance_attempts.status = ?", "approve")
	if financeCompanyID != nil && *financeCompanyID != "" {
		qApprove = qApprove.Where("order_finance_attempts.finance_company_id = ?", *financeCompanyID)
	}
	if !dr.From.IsZero() {
		qApprove = qApprove.Where("o.pooling_at >= ?", dr.From)
	}
	if !dr.To.IsZero() {
		qApprove = qApprove.Where("o.pooling_at <= ?", dr.To)
	}
	var approvedOrders int64
	if err := qApprove.Distinct("o.id").Count(&approvedOrders).Error; err != nil {
		return nil, err
	}

	approvalRate := 0.0
	if totalOrders > 0 {
		approvalRate = float64(approvedOrders) / float64(totalOrders)
	}

	// Reject FC1 but approve FC2
	qRescue := s.db.Model(&Order{}).
		Joins("JOIN order_finance_attempts a1 ON a1.order_id = orders.id AND a1.attempt_no = 1").
		Joins("JOIN order_finance_attempts a2 ON a2.order_id = orders.id AND a2.attempt_no = 2").
		Where("orders.dealer_id = ?", dealerId).
		Where("a1.status = ?", "reject").
		Where("a2.status = ?", "approve")
	if financeCompanyID != nil && *financeCompanyID != "" {
		qRescue = qRescue.Where("a2.finance_company_id = ?", *financeCompanyID)
	}
	if !dr.From.IsZero() {
		qRescue = qRescue.Where("orders.pooling_at >= ?", dr.From)
	}
	if !dr.To.IsZero() {
		qRescue = qRescue.Where("orders.pooling_at <= ?", dr.To)
	}
	var rescued int64
	if err := qRescue.Count(&rescued).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_orders":           totalOrders,
		"lead_time_seconds_avg":  leadSeconds,
		"approval_rate":          approvalRate,
		"rescue_approved_fc2":    rescued,
		"date_from":              dr.From,
		"date_to":                dr.To,
		"finance_company_filter": financeCompanyID,
	}, nil
}

// ListDealers returns all dealers for map.
func (s *Service) ListDealers() ([]Dealer, error) {
	var dealers []Dealer
	if err := s.db.Order("name ASC").Find(&dealers).Error; err != nil {
		return nil, err
	}
	return dealers, nil
}

func (s *Service) UpsertCreditCapability(req CreditCapabilityRequest) (CreditCapability, error) {
	cc := CreditCapability{}
	err := s.db.Where("regency = ? AND job_id = ?", req.Regency, req.JobID).First(&cc).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		cc = CreditCapability{
			Id:      utils.CreateUUID(),
			Regency: req.Regency,
			JobID:   req.JobID,
			Score:   req.Score,
		}
		if err := s.db.Create(&cc).Error; err != nil {
			return CreditCapability{}, err
		}
		return cc, nil
	} else if err != nil {
		return CreditCapability{}, err
	}

	cc.Score = req.Score
	if err := s.db.Save(&cc).Error; err != nil {
		return CreditCapability{}, err
	}
	return cc, nil
}

func (s *Service) ListCreditCapabilities() ([]CreditCapability, error) {
	var data []CreditCapability
	if err := s.db.Preload("Job").Find(&data).Error; err != nil {
		return nil, err
	}
	return data, nil
}

// RecomputeQuadrants recalculates and stores quadrant results.
func (s *Service) RecomputeQuadrants(req QuadrantComputeRequest) ([]QuadrantResult, error) {
	orderThreshold := req.OrderThreshold
	scoreThreshold := req.ScoreThreshold

	dr := DateRange{}
	if req.From != "" {
		if t, err := time.Parse("2006-01-02", req.From); err == nil {
			dr.From = t
		}
	}
	if req.To != "" {
		if t, err := time.Parse("2006-01-02", req.To); err == nil {
			dr.To = t
		}
	}

	// Map of regency+job -> order count
	type CountRow struct {
		Regency string
		JobID   string
		Total   int64
	}
	qOrders := s.db.Model(&Order{})
	if !dr.From.IsZero() {
		qOrders = qOrders.Where("pooling_at >= ?", dr.From)
	}
	if !dr.To.IsZero() {
		qOrders = qOrders.Where("pooling_at <= ?", dr.To)
	}
	var rows []CountRow
	if err := qOrders.Select("regency, job_id, COUNT(*) as total").Group("regency, job_id").Scan(&rows).Error; err != nil {
		return nil, err
	}

	orderCountMap := map[string]int64{}
	for _, r := range rows {
		key := r.Regency + "|" + r.JobID
		orderCountMap[key] = r.Total
	}

	var capabilities []CreditCapability
	if err := s.db.Find(&capabilities).Error; err != nil {
		return nil, err
	}

	results := make([]QuadrantResult, 0, len(capabilities))
	for _, c := range capabilities {
		key := c.Regency + "|" + c.JobID
		count := orderCountMap[key]
		quadrant := computeQuadrant(count, c.Score, orderThreshold, scoreThreshold)
		qr := QuadrantResult{
			Id:          utils.CreateUUID(),
			Regency:     c.Regency,
			JobID:       c.JobID,
			Quadrant:    quadrant,
			OrderCount:  count,
			CreditScore: c.Score,
			ComputedAt:  time.Now(),
		}
		results = append(results, qr)
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("1=1").Delete(&QuadrantResult{}).Error; err != nil {
			return err
		}
		for _, r := range results {
			if err := tx.Create(&r).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return results, nil
}

func computeQuadrant(orderCount int64, score float64, orderThreshold int, scoreThreshold float64) int {
	manyOrders := orderCount >= int64(orderThreshold)
	scoreGood := score >= scoreThreshold

	switch {
	case manyOrders && scoreGood:
		return 1
	case !manyOrders && scoreGood:
		return 2
	case manyOrders && !scoreGood:
		return 3
	default:
		return 4
	}
}

func (s *Service) ListQuadrants() ([]QuadrantResult, error) {
	var data []QuadrantResult
	if err := s.db.Preload("Job").Find(&data).Error; err != nil {
		return nil, err
	}
	return data, nil
}

func (s *Service) UpsertNewsSource(req NewsSourceRequest) (NewsSource, error) {
	ns := NewsSource{}
	err := s.db.Where("name = ?", req.Name).First(&ns).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		ns = NewsSource{
			Id:       utils.CreateUUID(),
			Name:     req.Name,
			URL:      req.URL,
			Category: req.Category,
		}
		if err := s.db.Create(&ns).Error; err != nil {
			return NewsSource{}, err
		}
		return ns, nil
	} else if err != nil {
		return NewsSource{}, err
	}
	ns.URL = req.URL
	ns.Category = req.Category
	if err := s.db.Save(&ns).Error; err != nil {
		return NewsSource{}, err
	}
	return ns, nil
}

func (s *Service) LatestNews(category string) (map[string]NewsItem, error) {
	var sources []NewsSource
	q := s.db.Model(&NewsSource{})
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if err := q.Find(&sources).Error; err != nil {
		return nil, err
	}

	result := make(map[string]NewsItem)
	for _, src := range sources {
		var item NewsItem
		err := s.db.Where("source_id = ?", src.Id).Order("published_at DESC").First(&item).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if item.Id != "" {
			result[src.Name] = item
		}
	}
	return result, nil
}

func (s *Service) UpsertCommodity(req CommodityRequest) (Commodity, error) {
	var c Commodity
	err := s.db.Where("name = ?", req.Name).First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c = Commodity{
			Id:   utils.CreateUUID(),
			Name: req.Name,
			Unit: req.Unit,
		}
		if err := s.db.Create(&c).Error; err != nil {
			return Commodity{}, err
		}
		return c, nil
	} else if err != nil {
		return Commodity{}, err
	}
	c.Unit = req.Unit
	if err := s.db.Save(&c).Error; err != nil {
		return Commodity{}, err
	}
	return c, nil
}

func (s *Service) AddCommodityPrice(req CommodityPriceRequest) (CommodityPrice, error) {
	var c Commodity
	if err := s.db.First(&c, "id = ?", req.CommodityID).Error; err != nil {
		return CommodityPrice{}, fmt.Errorf("commodity not found")
	}
	collected := time.Now()
	if req.CollectedAt != "" {
		if t, err := time.Parse(time.RFC3339, req.CollectedAt); err == nil {
			collected = t
		}
	}
	price := CommodityPrice{
		Id:          utils.CreateUUID(),
		CommodityID: req.CommodityID,
		Price:       req.Price,
		CollectedAt: collected,
		SourceURL:   req.SourceURL,
	}
	if err := s.db.Create(&price).Error; err != nil {
		return CommodityPrice{}, err
	}
	return price, nil
}

func (s *Service) LatestCommodityPrices() ([]CommodityPrice, error) {
	var commodities []Commodity
	if err := s.db.Find(&commodities).Error; err != nil {
		return nil, err
	}

	result := []CommodityPrice{}
	for _, c := range commodities {
		var price CommodityPrice
		err := s.db.Where("commodity_id = ?", c.Id).Order("collected_at DESC").First(&price).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if price.Id != "" {
			price.Commodity = &c
			result = append(result, price)
		}
	}
	return result, nil
}

// ScrapePanelHarga fetches commodity prices; if urls empty, use active sources.
func (s *Service) ScrapePanelHarga(ctx context.Context, url string) ([]CommodityPrice, error) {
	urls := []string{}
	if url != "" {
		urls = append(urls, url)
	}
	return s.scrapeViaPython(ctx, urls)
}

// ScrapeFromSources uses active scrape_sources or provided urls.
func (s *Service) ScrapeFromSources(ctx context.Context, urls []string) ([]CommodityPrice, error) {
	if len(urls) == 0 {
		var sources []ScrapeSource
		if err := s.db.Where("is_active = ?", true).Find(&sources).Error; err == nil {
			for _, src := range sources {
				urls = append(urls, src.URL)
			}
		}
	}
	return s.scrapeViaPython(ctx, urls)
}

// call python script to scrape and return stored prices
func (s *Service) scrapeViaPython(ctx context.Context, urls []string) ([]CommodityPrice, error) {
	if len(urls) == 0 {
		return nil, fmt.Errorf("no urls to scrape")
	}

	args := []string{"/home/shago/go/src/shago/service-songket/python/songket-scraping/scrape.py"}
	args = append(args, urls...)
	cmd := exec.CommandContext(ctx, "python3", args...)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("python scrape error: %w", err)
	}

	var items []map[string]interface{}
	if err := json.Unmarshal(output, &items); err != nil {
		return nil, fmt.Errorf("parse python output: %w", err)
	}

	collected := time.Now()
	result := make([]CommodityPrice, 0, len(items))
	for _, m := range items {
		name := firstString(m, "name", "nama", "komoditas", "commodity")
		if name == "" {
			continue
		}
		unit := firstString(m, "unit", "satuan")
		price := firstFloat(m, "price", "harga")
		source := firstString(m, "source_url", "url")
		if source == "" && len(urls) == 1 {
			source = urls[0]
		}

		var c Commodity
		err := s.db.Where("name = ?", name).First(&c).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c = Commodity{Id: utils.CreateUUID(), Name: name, Unit: unit}
			_ = s.db.Create(&c).Error
		}

		cp := CommodityPrice{
			Id:          utils.CreateUUID(),
			CommodityID: c.Id,
			Price:       price,
			CollectedAt: collected,
			SourceURL:   source,
		}
		if err := s.db.Create(&cp).Error; err == nil {
			cp.Commodity = &c
			result = append(result, cp)
		}
	}
	return result, nil
}

func firstString(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			switch t := v.(type) {
			case string:
				return t
			case fmt.Stringer:
				return t.String()
			}
		}
	}
	return ""
}

func firstFloat(m map[string]interface{}, keys ...string) float64 {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			switch t := v.(type) {
			case float64:
				return t
			case int:
				return float64(t)
			case int64:
				return float64(t)
			case json.Number:
				if f, err := t.Float64(); err == nil {
					return f
				}
			case string:
				if f, err := strconv.ParseFloat(t, 64); err == nil {
					return f
				}
			}
		}
	}
	return 0
}

// Lookups for dropdowns
func (s *Service) Lookups() (map[string]interface{}, error) {
	var fcs []FinanceCompany
	var motors []MotorType
	var jobs []Job
	var dealers []Dealer

	if err := s.db.Find(&fcs).Error; err != nil {
		return nil, err
	}
	if err := s.db.Find(&motors).Error; err != nil {
		return nil, err
	}
	if err := s.db.Find(&jobs).Error; err != nil {
		return nil, err
	}
	if err := s.db.Find(&dealers).Error; err != nil {
		return nil, err
	}

	// distinct regency from dealers
	regencyMap := map[string]struct{}{}
	for _, d := range dealers {
		if d.Regency != "" {
			regencyMap[d.Regency] = struct{}{}
		}
	}
	regencies := make([]string, 0, len(regencyMap))
	for k := range regencyMap {
		regencies = append(regencies, k)
	}

	return map[string]interface{}{
		"finance_companies": fcs,
		"motor_types":       motors,
		"jobs":              jobs,
		"dealers":           dealers,
		"regencies":         regencies,
	}, nil
}
