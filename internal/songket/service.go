package songket

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/url"
	//"io"
	//"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"starter-kit/pkg/filter"
	"starter-kit/utils"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Service encapsulates Songket business logic.
type Service struct {
	db *gorm.DB
}

var errNewsAlreadyAdded = errors.New("news already added")

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// ScrapedItem holds parsed data from python scraper.
type ScrapedItem struct {
	Name      string
	Price     float64
	Unit      string
	SourceURL string
	ScrapedAt time.Time
	Raw       map[string]interface{}
}

type panganScrapePayload struct {
	URL                  string                   `json:"url"`
	Rows                 []map[string]interface{} `json:"rows"`
	FoundContainer       *bool                    `json:"found_container,omitempty"`
	DebugLinesCount      *int                     `json:"debug_lines_count,omitempty"`
	DebugContainerSample string                   `json:"debug_container_sample,omitempty"`
	DebugReason          string                   `json:"debug_reason,omitempty"`
	DebugAPIFallbackUsed *bool                    `json:"debug_api_fallback_used,omitempty"`
	DebugAPIRowsCount    *int                     `json:"debug_api_rows_count,omitempty"`
	DebugAPIError        string                   `json:"debug_api_error,omitempty"`
}

type scrapeURLDiagnostic struct {
	SourceURL            string
	ParsedRows           int
	AcceptedRows         int
	RejectedInvalidName  int
	RejectedInvalidPrice int
	FoundContainer       *bool
	DebugLinesCount      *int
	DebugReason          string
	DebugSample          string
	DebugAPIFallbackUsed *bool
	DebugAPIRowsCount    *int
	DebugAPIError        string
}

type newsScrapeTarget struct {
	URL      string
	SourceID string
	Category string
}

type NewsScrapedImages struct {
	Main string   `json:"foto_utama"`
	List []string `json:"dalam_berita"`
}

type NewsScrapedArticle struct {
	Title     string            `json:"judul"`
	Content   string            `json:"isi"`
	Images    NewsScrapedImages `json:"images"`
	CreatedAt string            `json:"created_at"`
	Source    string            `json:"sumber"`
	URL       string            `json:"url"`
	SourceURL string            `json:"source_url,omitempty"`
	SourceID  string            `json:"source_id,omitempty"`
	Category  string            `json:"category,omitempty"`
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

func normalizeRequiredUUID(raw, fieldName string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", fmt.Errorf("%s is required", fieldName)
	}
	if _, err := uuid.Parse(trimmed); err != nil {
		return "", fmt.Errorf("%s must be a valid UUID", fieldName)
	}
	return trimmed, nil
}

func normalizeOptionalUUID(raw *string, fieldName string) (*string, error) {
	if raw == nil {
		return nil, nil
	}

	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil, nil
	}

	if _, err := uuid.Parse(trimmed); err != nil {
		return nil, fmt.Errorf("%s must be a valid UUID", fieldName)
	}

	return &trimmed, nil
}

func validateMotorTypeArea(motor MotorType, provinceCode, regencyCode string) error {
	motorProvince := strings.TrimSpace(motor.ProvinceCode)
	motorRegency := strings.TrimSpace(motor.RegencyCode)
	orderProvince := strings.TrimSpace(provinceCode)
	orderRegency := strings.TrimSpace(regencyCode)

	// Backward compatibility: old motor rows may not yet be area-specific.
	if motorProvince == "" && motorRegency == "" {
		return nil
	}

	if motorProvince != "" && orderProvince != "" && motorProvince != orderProvince {
		return fmt.Errorf("motor type is not available for selected province")
	}
	if motorRegency != "" && orderRegency != "" && motorRegency != orderRegency {
		return fmt.Errorf("motor type is not available for selected regency")
	}
	return nil
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
	if err := validateMotorTypeArea(motor, req.Province, req.Regency); err != nil {
		return Order{}, err
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
		Province:      req.Province,
		Regency:       req.Regency,
		District:      req.District,
		Village:       req.Village,
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
		var poolingCount int64
		if err := tx.Model(&Order{}).Where("pooling_number = ?", order.PoolingNumber).Count(&poolingCount).Error; err != nil {
			return err
		}
		if poolingCount >= 2 {
			return fmt.Errorf("pooling number already has maximum 2 orders")
		}

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
			status2 := strings.ToLower(req.ResultStatus2)
			secondAttempt := OrderFinanceAttempt{
				Id:               utils.CreateUUID(),
				OrderID:          order.Id,
				FinanceCompanyID: req.FinanceCompany2ID,
				AttemptNo:        2,
				Status:           status2,
				Notes:            req.ResultNotes2,
			}
			if err := tx.Create(&secondAttempt).Error; err != nil {
				return err
			}
		}

		if strings.ToLower(strings.TrimSpace(order.ResultStatus)) == "reject" {
			cloneStatus, cloneNotes := deriveCloneResult(
				order.ResultStatus,
				order.ResultNotes,
				req.ResultStatus2,
				req.ResultNotes2,
			)
			if err := s.duplicateOrderRow(tx, order, cloneStatus, cloneNotes, req.FinanceCompany2ID); err != nil {
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
	normalizedID, err := normalizeRequiredUUID(id, "id")
	if err != nil {
		return Order{}, err
	}

	dealerID, err := normalizeOptionalUUID(req.DealerID, "dealer_id")
	if err != nil {
		return Order{}, err
	}
	if req.DealerID != nil && dealerID == nil {
		return Order{}, fmt.Errorf("dealer_id cannot be empty")
	}

	financeCompanyID, err := normalizeOptionalUUID(req.FinanceCompanyID, "finance_company_id")
	if err != nil {
		return Order{}, err
	}
	if req.FinanceCompanyID != nil && financeCompanyID == nil {
		return Order{}, fmt.Errorf("finance_company_id cannot be empty")
	}

	jobID, err := normalizeOptionalUUID(req.JobID, "job_id")
	if err != nil {
		return Order{}, err
	}

	motorTypeID, err := normalizeOptionalUUID(req.MotorTypeID, "motor_type_id")
	if err != nil {
		return Order{}, err
	}

	financeCompany2ID, err := normalizeOptionalUUID(req.FinanceCompany2ID, "finance_company2_id")
	if err != nil {
		return Order{}, err
	}

	var order Order
	if err := s.db.Preload("Attempts").First(&order, "id = ?", normalizedID).Error; err != nil {
		return Order{}, err
	}
	previousPrimaryStatus := strings.ToLower(strings.TrimSpace(order.ResultStatus))
	var selectedMotor *MotorType

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
	if req.Province != nil {
		order.Province = *req.Province
	}
	if dealerID != nil {
		order.DealerID = *dealerID
	}
	if req.Regency != nil {
		order.Regency = *req.Regency
	}
	if req.District != nil {
		order.District = *req.District
	}
	if req.Village != nil {
		order.Village = *req.Village
	}
	if req.Address != nil {
		order.Address = *req.Address
	}
	if jobID != nil {
		order.JobID = *jobID
	}
	if motorTypeID != nil {
		order.MotorTypeID = *motorTypeID
		var motor MotorType
		if err := s.db.First(&motor, "id = ?", order.MotorTypeID).Error; err != nil {
			return Order{}, fmt.Errorf("motor type not found")
		}
		order.OTR = motor.OTR
		selectedMotor = &motor
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

	primaryRejected := strings.ToLower(order.ResultStatus) == "reject"

	if order.MotorTypeID != "" {
		if selectedMotor == nil {
			var motor MotorType
			if err := s.db.First(&motor, "id = ?", order.MotorTypeID).Error; err != nil {
				return Order{}, fmt.Errorf("motor type not found")
			}
			selectedMotor = &motor
			if order.OTR <= 0 {
				order.OTR = motor.OTR
			}
		}
		if err := validateMotorTypeArea(*selectedMotor, order.Province, order.Regency); err != nil {
			return Order{}, err
		}
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		var poolingCount int64
		if err := tx.Model(&Order{}).Where("pooling_number = ? AND id <> ?", order.PoolingNumber, order.Id).Count(&poolingCount).Error; err != nil {
			return err
		}
		if poolingCount >= 2 {
			return fmt.Errorf("pooling number already has maximum 2 orders")
		}

		if err := tx.Save(&order).Error; err != nil {
			return err
		}
		// Update attempts
		for _, att := range order.Attempts {
			if att.AttemptNo == 1 {
				if financeCompanyID != nil {
					att.FinanceCompanyID = *financeCompanyID
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
				if !primaryRejected {
					if err := tx.Delete(&att).Error; err != nil {
						return err
					}
					continue
				}
				if req.FinanceCompany2ID != nil && financeCompany2ID == nil {
					if err := tx.Delete(&att).Error; err != nil {
						return err
					}
					continue
				}
				if financeCompany2ID != nil {
					att.FinanceCompanyID = *financeCompany2ID
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
			if att.AttemptNo >= 3 {
				if err := tx.Delete(&att).Error; err != nil {
					return err
				}
			}
		}

		// Add attempt 2 if missing and provided
		if primaryRejected && financeCompany2ID != nil && !s.hasAttempt(order.Attempts, 2) {
			status2 := ""
			if req.ResultStatus2 != nil {
				status2 = strings.ToLower(*req.ResultStatus2)
			}
			newAttempt := OrderFinanceAttempt{
				Id:               utils.CreateUUID(),
				OrderID:          order.Id,
				FinanceCompanyID: *financeCompany2ID,
				AttemptNo:        2,
				Status:           status2,
				Notes:            utils.ValueOrDefault(req.ResultNotes2, ""),
			}
			if err := tx.Create(&newAttempt).Error; err != nil {
				return err
			}
			order.Attempts = append(order.Attempts, newAttempt)
		}

		currentPrimaryStatus := strings.ToLower(strings.TrimSpace(order.ResultStatus))
		if currentPrimaryStatus == "reject" && previousPrimaryStatus != "reject" {
			secondStatus := ""
			secondNotes := ""
			if req.ResultStatus2 != nil {
				secondStatus = *req.ResultStatus2
			}
			if req.ResultNotes2 != nil {
				secondNotes = *req.ResultNotes2
			}
			if strings.TrimSpace(secondStatus) == "" || strings.TrimSpace(secondNotes) == "" {
				if att, ok := findAttempt(order.Attempts, 2); ok {
					if strings.TrimSpace(secondStatus) == "" {
						secondStatus = att.Status
					}
					if strings.TrimSpace(secondNotes) == "" {
						secondNotes = att.Notes
					}
				}
			}
			secondFinanceCompanyID := ""
			if financeCompany2ID != nil {
				secondFinanceCompanyID = *financeCompany2ID
			} else if att, ok := findAttempt(order.Attempts, 2); ok {
				secondFinanceCompanyID = att.FinanceCompanyID
			}
			cloneStatus, cloneNotes := deriveCloneResult(order.ResultStatus, order.ResultNotes, secondStatus, secondNotes)
			if err := s.duplicateOrderRow(tx, order, cloneStatus, cloneNotes, secondFinanceCompanyID); err != nil {
				return err
			}
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

func (s *Service) duplicateOrderRow(tx *gorm.DB, source Order, cloneStatus, cloneNotes, financeCompanyID string) error {
	var poolingCount int64
	if err := tx.Model(&Order{}).Where("pooling_number = ?", source.PoolingNumber).Count(&poolingCount).Error; err != nil {
		return err
	}
	// One pooling number can only have 2 rows: original + cloned follow-up.
	if poolingCount >= 2 {
		return nil
	}

	status := strings.ToLower(strings.TrimSpace(cloneStatus))
	if status == "" {
		status = strings.ToLower(strings.TrimSpace(source.ResultStatus))
	}
	duplicateOrder := Order{
		Id:            utils.CreateUUID(),
		PoolingNumber: source.PoolingNumber,
		PoolingAt:     source.PoolingAt,
		ResultAt:      source.ResultAt,
		DealerID:      source.DealerID,
		ConsumerName:  source.ConsumerName,
		ConsumerPhone: source.ConsumerPhone,
		Province:      source.Province,
		Regency:       source.Regency,
		District:      source.District,
		Village:       source.Village,
		Address:       source.Address,
		JobID:         source.JobID,
		MotorTypeID:   source.MotorTypeID,
		OTR:           source.OTR,
		DPGross:       source.DPGross,
		DPPaid:        source.DPPaid,
		DPPct:         source.DPPct,
		Tenor:         source.Tenor,
		ResultStatus:  status,
		ResultNotes:   strings.TrimSpace(cloneNotes),
		CreatedBy:     source.CreatedBy,
	}
	if err := tx.Omit("Attempts").Create(&duplicateOrder).Error; err != nil {
		return err
	}

	financeID := strings.TrimSpace(financeCompanyID)
	if financeID == "" {
		return nil
	}

	duplicateAttempt := OrderFinanceAttempt{
		Id:               utils.CreateUUID(),
		OrderID:          duplicateOrder.Id,
		FinanceCompanyID: financeID,
		AttemptNo:        1,
		Status:           status,
		Notes:            strings.TrimSpace(cloneNotes),
	}
	return tx.Create(&duplicateAttempt).Error
}

func deriveCloneResult(primaryStatus, primaryNotes, secondStatus, secondNotes string) (string, string) {
	status := strings.ToLower(strings.TrimSpace(secondStatus))
	if status == "" {
		status = strings.ToLower(strings.TrimSpace(primaryStatus))
	}

	notes := strings.TrimSpace(secondNotes)
	if notes == "" {
		notes = strings.TrimSpace(primaryNotes)
	}
	return status, notes
}

func findAttempt(atts []OrderFinanceAttempt, num int) (OrderFinanceAttempt, bool) {
	for _, att := range atts {
		if att.AttemptNo == num {
			return att, true
		}
	}
	return OrderFinanceAttempt{}, false
}

// DeleteOrder enforces role-based access.
func (s *Service) DeleteOrder(id string, role, userId string) error {
	var order Order
	if err := s.db.First(&order, "id = ?", id).Error; err != nil {
		return err
	}

	// Dealer can only delete own orders
	if role == utils.RoleDealer && order.CreatedBy != userId {
		return fmt.Errorf("not allowed")
	}

	// Main dealer/admin/superadmin allowed; others deny
	if role != utils.RoleDealer && role != utils.RoleMainDealer && role != utils.RoleAdmin && role != utils.RoleSuperAdmin {
		return fmt.Errorf("not allowed")
	}

	return s.db.Delete(&order).Error
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
	// helper to build base order query with date range
	baseOrders := func(tx *gorm.DB) *gorm.DB {
		q := tx.Model(&Order{}).Where("dealer_id = ?", dealerId)
		if !dr.From.IsZero() {
			q = q.Where("pooling_at >= ?", dr.From)
		}
		if !dr.To.IsZero() {
			q = q.Where("pooling_at <= ?", dr.To)
		}
		return q
	}

	// overall summary (optionally filtered by financeCompanyID for approval/rescue)
	qOrders := baseOrders(s.db)
	var totalOrders int64
	if err := qOrders.Count(&totalOrders).Error; err != nil {
		return nil, err
	}

	var leadSeconds *float64
	if err := qOrders.Select("avg(extract(epoch from result_at - pooling_at))").Where("result_at IS NOT NULL").Scan(&leadSeconds).Error; err != nil {
		return nil, err
	}

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
		log.Println("approvalRate ", approvalRate)
		log.Println("approvedOrders ", approvedOrders)
		log.Println("totalOrders ", totalOrders)

	}

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

	// per finance company breakdown
	var financeCompanies []FinanceCompany
	if err := s.db.Find(&financeCompanies).Error; err != nil {
		return nil, err
	}
	type FcMetric struct {
		FinanceCompanyID   string   `json:"finance_company_id"`
		FinanceCompanyName string   `json:"finance_company_name"`
		TotalOrders        int64    `json:"total_orders"`
		ApprovedCount      int64    `json:"approved_count"`
		RejectedCount      int64    `json:"rejected_count"`
		LeadTimeSecondsAvg *float64 `json:"lead_time_seconds_avg"`
		ApprovalRate       float64  `json:"approval_rate"`
		RescueApprovedFc2  int64    `json:"rescue_approved_fc2"`
	}
	fcMetrics := make([]FcMetric, 0, len(financeCompanies))
	type FinanceApprovalGrouping struct {
		FinanceCompanyID   string  `json:"finance_company_id"`
		FinanceCompanyName string  `json:"finance_company_name"`
		Status             string  `json:"status"`
		TotalData          int64   `json:"total_data"`
		ApprovalRate       float64 `json:"approval_rate"`
	}

	for _, fc := range financeCompanies {
		qOrdersFc := baseOrders(s.db)
		qOrdersFc = qOrdersFc.Joins("JOIN order_finance_attempts oa ON oa.order_id = orders.id AND oa.attempt_no = 1").
			Where("oa.finance_company_id = ?", fc.Id)

		var fcTotal int64
		if err := qOrdersFc.Count(&fcTotal).Error; err != nil {
			return nil, err
		}

		var fcLead *float64
		if err := qOrdersFc.Select("avg(extract(epoch from orders.result_at - orders.pooling_at))").
			Where("orders.result_at IS NOT NULL").
			Scan(&fcLead).Error; err != nil {
			return nil, err
		}

		attemptOneBase := func() *gorm.DB {
			q := s.db.Model(&OrderFinanceAttempt{}).
				Joins("JOIN orders o ON o.id = order_finance_attempts.order_id").
				Where("o.dealer_id = ?", dealerId).
				Where("order_finance_attempts.attempt_no = ?", 1).
				Where("order_finance_attempts.finance_company_id = ?", fc.Id)
			if !dr.From.IsZero() {
				q = q.Where("o.pooling_at >= ?", dr.From)
			}
			if !dr.To.IsZero() {
				q = q.Where("o.pooling_at <= ?", dr.To)
			}
			return q
		}

		var fcApproved int64
		if err := attemptOneBase().
			Where("order_finance_attempts.status = ?", "approve").
			Distinct("order_finance_attempts.order_id").
			Count(&fcApproved).Error; err != nil {
			return nil, err
		}

		var fcRejected int64
		if err := attemptOneBase().
			Where("order_finance_attempts.status = ?", "reject").
			Distinct("order_finance_attempts.order_id").
			Count(&fcRejected).Error; err != nil {
			return nil, err
		}

		fcApproval := 0.0
		if fcTotal > 0 {
			fcApproval = float64(fcApproved) / float64(fcTotal)
			log.Println("fcApproval ", fcApproval)
			log.Println("fcApproved ", fcApproved)
			log.Println("fcTotal ", fcTotal)
		}

		qRescueFc := s.db.Model(&Order{}).
			Joins("JOIN order_finance_attempts a1 ON a1.order_id = orders.id AND a1.attempt_no = 1").
			Joins("JOIN order_finance_attempts a2 ON a2.order_id = orders.id AND a2.attempt_no = 2").
			Where("orders.dealer_id = ?", dealerId).
			Where("a1.status = ?", "reject").
			Where("a2.status = ?", "approve").
			Where("a2.finance_company_id = ?", fc.Id)
		if !dr.From.IsZero() {
			qRescueFc = qRescueFc.Where("orders.pooling_at >= ?", dr.From)
		}
		if !dr.To.IsZero() {
			qRescueFc = qRescueFc.Where("orders.pooling_at <= ?", dr.To)
		}
		var fcRescued int64
		if err := qRescueFc.Count(&fcRescued).Error; err != nil {
			return nil, err
		}

		fcMetrics = append(fcMetrics, FcMetric{
			FinanceCompanyID:   fc.Id,
			FinanceCompanyName: fc.Name,
			TotalOrders:        fcTotal,
			ApprovedCount:      fcApproved,
			RejectedCount:      fcRejected,
			LeadTimeSecondsAvg: fcLead,
			ApprovalRate:       fcApproval,
			RescueApprovedFc2:  fcRescued,
		})
	}

	// grouped finance-2 outcomes for orders where finance-1 was rejected
	type financeApprovalGroupingRaw struct {
		FinanceCompanyID   string `json:"finance_company_id"`
		FinanceCompanyName string `json:"finance_company_name"`
		Status             string `json:"status"`
		TotalData          int64  `json:"total_data"`
	}

	groupingBase := s.db.Model(&OrderFinanceAttempt{}).
		Joins("JOIN orders o ON o.id = order_finance_attempts.order_id").
		Joins("JOIN order_finance_attempts a1 ON a1.order_id = order_finance_attempts.order_id AND a1.attempt_no = 1").
		Joins("LEFT JOIN finance_companies fc ON fc.id = order_finance_attempts.finance_company_id").
		Where("o.dealer_id = ?", dealerId).
		Where("order_finance_attempts.attempt_no = ?", 2).
		Where("a1.status = ?", "reject").
		Where("LOWER(order_finance_attempts.status) IN ?", []string{"approve", "reject"})

	if financeCompanyID != nil && *financeCompanyID != "" {
		groupingBase = groupingBase.Where("order_finance_attempts.finance_company_id = ?", *financeCompanyID)
	}
	if !dr.From.IsZero() {
		groupingBase = groupingBase.Where("o.pooling_at >= ?", dr.From)
	}
	if !dr.To.IsZero() {
		groupingBase = groupingBase.Where("o.pooling_at <= ?", dr.To)
	}

	var groupingRaw []financeApprovalGroupingRaw
	if err := groupingBase.
		Select(`
			order_finance_attempts.finance_company_id AS finance_company_id,
			COALESCE(fc.name, '-') AS finance_company_name,
			LOWER(order_finance_attempts.status) AS status,
			COUNT(DISTINCT order_finance_attempts.order_id) AS total_data
		`).
		Group("order_finance_attempts.finance_company_id, fc.name, LOWER(order_finance_attempts.status)").
		Scan(&groupingRaw).Error; err != nil {
		return nil, err
	}

	totalByFinance := make(map[string]int64, len(groupingRaw))
	for _, row := range groupingRaw {
		financeID := strings.TrimSpace(row.FinanceCompanyID)
		totalByFinance[financeID] += row.TotalData
	}

	financeApprovalGrouping := make([]FinanceApprovalGrouping, 0, len(groupingRaw))
	for _, row := range groupingRaw {
		financeID := strings.TrimSpace(row.FinanceCompanyID)
		total := totalByFinance[financeID]
		rate := 0.0
		if total > 0 {
			rate = float64(row.TotalData) / float64(total)
		}
		financeApprovalGrouping = append(financeApprovalGrouping, FinanceApprovalGrouping{
			FinanceCompanyID:   row.FinanceCompanyID,
			FinanceCompanyName: row.FinanceCompanyName,
			Status:             strings.ToLower(strings.TrimSpace(row.Status)),
			TotalData:          row.TotalData,
			ApprovalRate:       rate,
		})
	}

	statusOrder := map[string]int{
		"approve": 1,
		"reject":  2,
	}
	sort.Slice(financeApprovalGrouping, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(financeApprovalGrouping[i].FinanceCompanyName))
		right := strings.ToLower(strings.TrimSpace(financeApprovalGrouping[j].FinanceCompanyName))
		if left != right {
			return left < right
		}
		leftStatus := strings.ToLower(strings.TrimSpace(financeApprovalGrouping[i].Status))
		rightStatus := strings.ToLower(strings.TrimSpace(financeApprovalGrouping[j].Status))
		return statusOrder[leftStatus] < statusOrder[rightStatus]
	})

	// transition metrics: Finance 1 (reject) -> Finance 2 result grouping
	type financeApprovalTransitionRaw struct {
		Finance1CompanyID   string `gorm:"column:finance_1_company_id" json:"finance_1_company_id"`
		Finance1CompanyName string `gorm:"column:finance_1_company_name" json:"finance_1_company_name"`
		Finance2CompanyID   string `gorm:"column:finance_2_company_id" json:"finance_2_company_id"`
		Finance2CompanyName string `gorm:"column:finance_2_company_name" json:"finance_2_company_name"`
		TotalData           int64  `gorm:"column:total_data" json:"total_data"`
		ApprovedCount       int64  `gorm:"column:approved_count" json:"approved_count"`
		RejectedCount       int64  `gorm:"column:rejected_count" json:"rejected_count"`
	}
	type financeApprovalTransition struct {
		Finance1CompanyID   string  `json:"finance_1_company_id"`
		Finance1CompanyName string  `json:"finance_1_company_name"`
		Finance2CompanyID   string  `json:"finance_2_company_id"`
		Finance2CompanyName string  `json:"finance_2_company_name"`
		TotalData           int64   `json:"total_data"`
		ApprovedCount       int64   `json:"approved_count"`
		RejectedCount       int64   `json:"rejected_count"`
		ApprovalRate        float64 `json:"approval_rate"`
	}
	type financeApprovalTransitionFallbackRaw struct {
		Finance1CompanyID   string `gorm:"column:finance_1_company_id" json:"finance_1_company_id"`
		Finance1CompanyName string `gorm:"column:finance_1_company_name" json:"finance_1_company_name"`
		Finance2CompanyID   string `gorm:"column:finance_2_company_id" json:"finance_2_company_id"`
		Finance2CompanyName string `gorm:"column:finance_2_company_name" json:"finance_2_company_name"`
		TotalData           int64  `gorm:"column:total_data" json:"total_data"`
		ApprovedCount       int64  `gorm:"column:approved_count" json:"approved_count"`
		RejectedCount       int64  `gorm:"column:rejected_count" json:"rejected_count"`
	}

	transitionBase := s.db.
		Table("order_finance_attempts AS a2").
		Joins("JOIN orders o ON o.id = a2.order_id").
		Joins("JOIN order_finance_attempts a1 ON a1.order_id = a2.order_id AND a1.attempt_no = 1").
		Joins("LEFT JOIN finance_companies fc1 ON fc1.id = a1.finance_company_id").
		Joins("LEFT JOIN finance_companies fc2 ON fc2.id = a2.finance_company_id").
		Where("o.dealer_id = ?", dealerId).
		Where("a2.attempt_no = ?", 2).
		Where("LOWER(a1.status) = ?", "reject").
		Where("LOWER(a2.status) IN ?", []string{"approve", "reject"})

	if financeCompanyID != nil && *financeCompanyID != "" {
		transitionBase = transitionBase.Where("a2.finance_company_id = ?", *financeCompanyID)
	}
	if !dr.From.IsZero() {
		transitionBase = transitionBase.Where("o.pooling_at >= ?", dr.From)
	}
	if !dr.To.IsZero() {
		transitionBase = transitionBase.Where("o.pooling_at <= ?", dr.To)
	}

	var transitionRaw []financeApprovalTransitionRaw
	if err := transitionBase.
		Select(`
			a1.finance_company_id AS finance_1_company_id,
			COALESCE(fc1.name, '-') AS finance_1_company_name,
			a2.finance_company_id AS finance_2_company_id,
			COALESCE(fc2.name, '-') AS finance_2_company_name,
			COUNT(DISTINCT a2.order_id) AS total_data,
			COUNT(DISTINCT CASE WHEN LOWER(a2.status) = 'approve' THEN a2.order_id END) AS approved_count,
			COUNT(DISTINCT CASE WHEN LOWER(a2.status) = 'reject' THEN a2.order_id END) AS rejected_count
		`).
		Group("a1.finance_company_id, fc1.name, a2.finance_company_id, fc2.name").
		Scan(&transitionRaw).Error; err != nil {
		return nil, err
	}

	fallbackTransitionBase := s.db.
		Table("orders AS o1").
		Joins("JOIN order_finance_attempts a1 ON a1.order_id = o1.id AND a1.attempt_no = 1").
		Joins("JOIN orders o2 ON o2.pooling_number = o1.pooling_number AND o2.id <> o1.id").
		Joins("JOIN order_finance_attempts a2f ON a2f.order_id = o2.id AND a2f.attempt_no = 1").
		Joins("LEFT JOIN finance_companies fc1 ON fc1.id = a1.finance_company_id").
		Joins("LEFT JOIN finance_companies fc2 ON fc2.id = a2f.finance_company_id").
		Where("o1.dealer_id = ?", dealerId).
		Where("o2.dealer_id = o1.dealer_id").
		Where("LOWER(o1.result_status) = ?", "reject").
		Where("LOWER(o2.result_status) IN ?", []string{"approve", "reject"}).
		Where("o1.created_at <= o2.created_at").
		Where("NOT EXISTS (SELECT 1 FROM order_finance_attempts a2x WHERE a2x.order_id = o1.id AND a2x.attempt_no = 2)")
	if financeCompanyID != nil && *financeCompanyID != "" {
		fallbackTransitionBase = fallbackTransitionBase.Where("a2f.finance_company_id = ?", *financeCompanyID)
	}
	if !dr.From.IsZero() {
		fallbackTransitionBase = fallbackTransitionBase.Where("o1.pooling_at >= ?", dr.From)
	}
	if !dr.To.IsZero() {
		fallbackTransitionBase = fallbackTransitionBase.Where("o1.pooling_at <= ?", dr.To)
	}

	var transitionFallbackRaw []financeApprovalTransitionFallbackRaw
	if err := fallbackTransitionBase.
		Select(`
			a1.finance_company_id AS finance_1_company_id,
			COALESCE(fc1.name, '-') AS finance_1_company_name,
			a2f.finance_company_id AS finance_2_company_id,
			COALESCE(fc2.name, '-') AS finance_2_company_name,
			COUNT(DISTINCT o1.id) AS total_data,
			COUNT(DISTINCT CASE WHEN LOWER(o2.result_status) = 'approve' THEN o1.id END) AS approved_count,
			COUNT(DISTINCT CASE WHEN LOWER(o2.result_status) = 'reject' THEN o1.id END) AS rejected_count
		`).
		Group("a1.finance_company_id, fc1.name, a2f.finance_company_id, fc2.name").
		Scan(&transitionFallbackRaw).Error; err != nil {
		return nil, err
	}

	type transitionAggregate struct {
		Finance1CompanyID   string
		Finance1CompanyName string
		Finance2CompanyID   string
		Finance2CompanyName string
		TotalData           int64
		ApprovedCount       int64
		RejectedCount       int64
	}
	transitionByPair := map[string]*transitionAggregate{}
	addTransitionAggregate := func(fin1ID, fin1Name, fin2ID, fin2Name string, totalData, approvedCount, rejectedCount int64) {
		fin1ID = strings.TrimSpace(fin1ID)
		fin2ID = strings.TrimSpace(fin2ID)
		if fin1ID == "" || fin2ID == "" {
			return
		}
		key := fin1ID + "::" + fin2ID
		if existing, ok := transitionByPair[key]; ok {
			existing.TotalData += totalData
			existing.ApprovedCount += approvedCount
			existing.RejectedCount += rejectedCount
			return
		}
		transitionByPair[key] = &transitionAggregate{
			Finance1CompanyID:   fin1ID,
			Finance1CompanyName: strings.TrimSpace(fin1Name),
			Finance2CompanyID:   fin2ID,
			Finance2CompanyName: strings.TrimSpace(fin2Name),
			TotalData:           totalData,
			ApprovedCount:       approvedCount,
			RejectedCount:       rejectedCount,
		}
	}

	for _, row := range transitionRaw {
		addTransitionAggregate(
			row.Finance1CompanyID,
			row.Finance1CompanyName,
			row.Finance2CompanyID,
			row.Finance2CompanyName,
			row.TotalData,
			row.ApprovedCount,
			row.RejectedCount,
		)
	}
	for _, row := range transitionFallbackRaw {
		addTransitionAggregate(
			row.Finance1CompanyID,
			row.Finance1CompanyName,
			row.Finance2CompanyID,
			row.Finance2CompanyName,
			row.TotalData,
			row.ApprovedCount,
			row.RejectedCount,
		)
	}

	financeApprovalTransitions := make([]financeApprovalTransition, 0, len(transitionByPair))
	for _, row := range transitionByPair {
		rate := 0.0
		if row.TotalData > 0 {
			rate = float64(row.ApprovedCount) / float64(row.TotalData)
		}
		financeApprovalTransitions = append(financeApprovalTransitions, financeApprovalTransition{
			Finance1CompanyID:   row.Finance1CompanyID,
			Finance1CompanyName: row.Finance1CompanyName,
			Finance2CompanyID:   row.Finance2CompanyID,
			Finance2CompanyName: row.Finance2CompanyName,
			TotalData:           row.TotalData,
			ApprovedCount:       row.ApprovedCount,
			RejectedCount:       row.RejectedCount,
			ApprovalRate:        rate,
		})
	}
	sort.Slice(financeApprovalTransitions, func(i, j int) bool {
		leftFrom := strings.ToLower(strings.TrimSpace(financeApprovalTransitions[i].Finance1CompanyName))
		rightFrom := strings.ToLower(strings.TrimSpace(financeApprovalTransitions[j].Finance1CompanyName))
		if leftFrom != rightFrom {
			return leftFrom < rightFrom
		}
		leftTo := strings.ToLower(strings.TrimSpace(financeApprovalTransitions[i].Finance2CompanyName))
		rightTo := strings.ToLower(strings.TrimSpace(financeApprovalTransitions[j].Finance2CompanyName))
		return leftTo < rightTo
	})

	return map[string]interface{}{
		"total_orders":                 totalOrders,
		"lead_time_seconds_avg":        leadSeconds,
		"approval_rate":                approvalRate,
		"rescue_approved_fc2":          rescued,
		"finance_approval_grouping":    financeApprovalGrouping,
		"finance_approval_transitions": financeApprovalTransitions,
		"date_from":                    dr.From,
		"date_to":                      dr.To,
		"finance_company_filter":       financeCompanyID,
		"finance_companies":            fcMetrics,
	}, nil
}

// ListDealers returns dealers with pagination support.
func (s *Service) ListDealers(params filter.BaseParams) ([]Dealer, int64, error) {
	query := s.db.Model(&Dealer{})

	if v, ok := params.Filters["province"]; ok {
		query = query.Where("province = ?", v)
	}
	if v, ok := params.Filters["regency"]; ok {
		query = query.Where("regency = ?", v)
	}
	if v, ok := params.Filters["district"]; ok {
		query = query.Where("district = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(regency) LIKE ? OR LOWER(phone) LIKE ?", search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var dealers []Dealer
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&dealers).Error; err != nil {
		return nil, 0, err
	}

	return dealers, total, nil
}

// ListFinanceCompanies returns finance companies with pagination support.
func (s *Service) ListFinanceCompanies(params filter.BaseParams) ([]FinanceCompany, int64, error) {
	query := s.db.Model(&FinanceCompany{})

	if v, ok := params.Filters["province"]; ok {
		query = query.Where("province = ?", v)
	}
	if v, ok := params.Filters["regency"]; ok {
		query = query.Where("regency = ?", v)
	}
	if v, ok := params.Filters["district"]; ok {
		query = query.Where("district = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(regency) LIKE ? OR LOWER(phone) LIKE ?", search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var companies []FinanceCompany
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&companies).Error; err != nil {
		return nil, 0, err
	}

	return companies, total, nil
}

func (s *Service) CreateDealer(req DealerRequest) (Dealer, error) {
	dealer := Dealer{
		Id:        utils.CreateUUID(),
		Name:      strings.TrimSpace(req.Name),
		Regency:   strings.TrimSpace(req.Regency),
		Province:  strings.TrimSpace(req.Province),
		District:  strings.TrimSpace(req.District),
		Village:   strings.TrimSpace(req.Village),
		Phone:     strings.TrimSpace(req.Phone),
		Address:   strings.TrimSpace(req.Address),
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
	}
	if err := s.db.Create(&dealer).Error; err != nil {
		return Dealer{}, err
	}
	return dealer, nil
}

func (s *Service) UpdateDealer(id string, req DealerRequest) (Dealer, error) {
	normalizedID, err := normalizeRequiredUUID(id, "id")
	if err != nil {
		return Dealer{}, err
	}

	var dealer Dealer
	if err := s.db.First(&dealer, "id = ?", normalizedID).Error; err != nil {
		return Dealer{}, err
	}

	dealer.Name = strings.TrimSpace(req.Name)
	dealer.Regency = strings.TrimSpace(req.Regency)
	dealer.Province = strings.TrimSpace(req.Province)
	dealer.District = strings.TrimSpace(req.District)
	dealer.Village = strings.TrimSpace(req.Village)
	dealer.Phone = strings.TrimSpace(req.Phone)
	dealer.Address = strings.TrimSpace(req.Address)
	dealer.Latitude = req.Latitude
	dealer.Longitude = req.Longitude

	if err := s.db.Save(&dealer).Error; err != nil {
		return Dealer{}, err
	}
	return dealer, nil
}

func (s *Service) CreateFinanceCompany(req FinanceCompanyRequest) (FinanceCompany, error) {
	fc := FinanceCompany{
		Id:       utils.CreateUUID(),
		Name:     strings.TrimSpace(req.Name),
		Province: strings.TrimSpace(req.Province),
		Regency:  strings.TrimSpace(req.Regency),
		District: strings.TrimSpace(req.District),
		Village:  strings.TrimSpace(req.Village),
		Address:  strings.TrimSpace(req.Address),
		Phone:    strings.TrimSpace(req.Phone),
	}
	if err := s.db.Create(&fc).Error; err != nil {
		return FinanceCompany{}, err
	}
	return fc, nil
}

func (s *Service) UpdateFinanceCompany(id string, req FinanceCompanyRequest) (FinanceCompany, error) {
	normalizedID, err := normalizeRequiredUUID(id, "id")
	if err != nil {
		return FinanceCompany{}, err
	}

	var fc FinanceCompany
	if err := s.db.First(&fc, "id = ?", normalizedID).Error; err != nil {
		return FinanceCompany{}, err
	}
	fc.Name = strings.TrimSpace(req.Name)
	fc.Province = strings.TrimSpace(req.Province)
	fc.Regency = strings.TrimSpace(req.Regency)
	fc.District = strings.TrimSpace(req.District)
	fc.Village = strings.TrimSpace(req.Village)
	fc.Address = strings.TrimSpace(req.Address)
	fc.Phone = strings.TrimSpace(req.Phone)
	if err := s.db.Save(&fc).Error; err != nil {
		return FinanceCompany{}, err
	}
	return fc, nil
}

func (s *Service) DeleteDealer(id string) error {
	return s.db.Delete(&Dealer{}, "id = ?", id).Error
}

func (s *Service) DeleteFinanceCompany(id string) error {
	return s.db.Delete(&FinanceCompany{}, "id = ?", id).Error
}

func (s *Service) ListMotorTypes(params filter.BaseParams) ([]MotorType, int64, error) {
	query := s.db.Model(&MotorType{})

	if v, ok := params.Filters["province_code"]; ok {
		query = query.Where("province_code = ?", strings.TrimSpace(fmt.Sprint(v)))
	}
	if v, ok := params.Filters["regency_code"]; ok {
		query = query.Where("regency_code = ?", strings.TrimSpace(fmt.Sprint(v)))
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(strings.TrimSpace(params.Search)) + "%"
		query = query.Where(
			"LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(model) LIKE ? OR LOWER(variant_type) LIKE ? OR LOWER(province_name) LIKE ? OR LOWER(regency_name) LIKE ?",
			search,
			search,
			search,
			search,
			search,
			search,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "motor_types." + orderBy
	}

	var rows []MotorType
	if err := query.
		Order(fmt.Sprintf("%s %s", orderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (s *Service) GetMotorTypeByID(id string) (MotorType, error) {
	var row MotorType
	if err := s.db.First(&row, "id = ?", id).Error; err != nil {
		return MotorType{}, err
	}
	return row, nil
}

func (s *Service) CreateMotorType(req MotorTypeRequest) (MotorType, error) {
	name := strings.TrimSpace(req.Name)
	brand := strings.TrimSpace(req.Brand)
	model := strings.TrimSpace(req.Model)
	variantType := strings.TrimSpace(req.Type)
	provinceCode := strings.TrimSpace(req.ProvinceCode)
	provinceName := strings.TrimSpace(req.ProvinceName)
	regencyCode := strings.TrimSpace(req.RegencyCode)
	regencyName := strings.TrimSpace(req.RegencyName)

	if name == "" || brand == "" || model == "" || variantType == "" {
		return MotorType{}, fmt.Errorf("name, brand, model, and type are required")
	}
	if provinceCode == "" || regencyCode == "" {
		return MotorType{}, fmt.Errorf("province_code and regency_code are required")
	}
	if req.OTR < 0 {
		return MotorType{}, fmt.Errorf("otr must be greater than or equal to 0")
	}

	var existing MotorType
	err := s.db.
		Where("LOWER(name) = LOWER(?) AND LOWER(brand) = LOWER(?) AND LOWER(model) = LOWER(?) AND LOWER(variant_type) = LOWER(?) AND province_code = ? AND regency_code = ?", name, brand, model, variantType, provinceCode, regencyCode).
		First(&existing).Error
	if err == nil {
		return MotorType{}, fmt.Errorf("motor type already exists for selected area")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return MotorType{}, err
	}

	row := MotorType{
		Id:           utils.CreateUUID(),
		Name:         name,
		Brand:        brand,
		Model:        model,
		VariantType:  variantType,
		OTR:          req.OTR,
		ProvinceCode: provinceCode,
		ProvinceName: provinceName,
		RegencyCode:  regencyCode,
		RegencyName:  regencyName,
	}
	if err := s.db.Create(&row).Error; err != nil {
		if isUniqueViolationError(err) {
			return MotorType{}, fmt.Errorf("motor type already exists for selected area")
		}
		return MotorType{}, err
	}
	return row, nil
}

func (s *Service) UpdateMotorType(id string, req MotorTypeRequest) (MotorType, error) {
	normalizedID, err := normalizeRequiredUUID(id, "id")
	if err != nil {
		return MotorType{}, err
	}

	var row MotorType
	if err := s.db.First(&row, "id = ?", normalizedID).Error; err != nil {
		return MotorType{}, err
	}

	name := strings.TrimSpace(req.Name)
	brand := strings.TrimSpace(req.Brand)
	model := strings.TrimSpace(req.Model)
	variantType := strings.TrimSpace(req.Type)
	provinceCode := strings.TrimSpace(req.ProvinceCode)
	provinceName := strings.TrimSpace(req.ProvinceName)
	regencyCode := strings.TrimSpace(req.RegencyCode)
	regencyName := strings.TrimSpace(req.RegencyName)

	if name == "" || brand == "" || model == "" || variantType == "" {
		return MotorType{}, fmt.Errorf("name, brand, model, and type are required")
	}
	if provinceCode == "" || regencyCode == "" {
		return MotorType{}, fmt.Errorf("province_code and regency_code are required")
	}
	if req.OTR < 0 {
		return MotorType{}, fmt.Errorf("otr must be greater than or equal to 0")
	}

	var dup MotorType
	err = s.db.
		Where("id <> ? AND LOWER(name) = LOWER(?) AND LOWER(brand) = LOWER(?) AND LOWER(model) = LOWER(?) AND LOWER(variant_type) = LOWER(?) AND province_code = ? AND regency_code = ?", normalizedID, name, brand, model, variantType, provinceCode, regencyCode).
		First(&dup).Error
	if err == nil {
		return MotorType{}, fmt.Errorf("motor type already exists for selected area")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return MotorType{}, err
	}

	row.Name = name
	row.Brand = brand
	row.Model = model
	row.VariantType = variantType
	row.OTR = req.OTR
	row.ProvinceCode = provinceCode
	row.ProvinceName = provinceName
	row.RegencyCode = regencyCode
	row.RegencyName = regencyName
	if err := s.db.Save(&row).Error; err != nil {
		if isUniqueViolationError(err) {
			return MotorType{}, fmt.Errorf("motor type already exists for selected area")
		}
		return MotorType{}, err
	}
	return row, nil
}

func (s *Service) DeleteMotorType(id string) error {
	var orderCount int64
	if err := s.db.Model(&Order{}).Where("motor_type_id = ?", id).Count(&orderCount).Error; err != nil {
		return err
	}
	if orderCount > 0 {
		return fmt.Errorf("motor type is already used by order data")
	}

	var installmentCount int64
	if err := s.db.Model(&Installment{}).Where("motor_type_id = ?", id).Count(&installmentCount).Error; err != nil {
		return err
	}
	if installmentCount > 0 {
		return fmt.Errorf("motor type is already used by installment data")
	}

	return s.db.Delete(&MotorType{}, "id = ?", id).Error
}

func (s *Service) ListInstallments(params filter.BaseParams) ([]Installment, int64, error) {
	query := s.db.Model(&Installment{}).
		Joins("LEFT JOIN motor_types ON motor_types.id = installments.motor_type_id")

	if v, ok := params.Filters["motor_type_id"]; ok {
		query = query.Where("installments.motor_type_id = ?", strings.TrimSpace(fmt.Sprint(v)))
	}
	if v, ok := params.Filters["province_code"]; ok {
		query = query.Where("motor_types.province_code = ?", strings.TrimSpace(fmt.Sprint(v)))
	}
	if v, ok := params.Filters["regency_code"]; ok {
		query = query.Where("motor_types.regency_code = ?", strings.TrimSpace(fmt.Sprint(v)))
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(strings.TrimSpace(params.Search)) + "%"
		query = query.Where(
			"LOWER(motor_types.name) LIKE ? OR LOWER(motor_types.brand) LIKE ? OR LOWER(motor_types.model) LIKE ? OR LOWER(motor_types.variant_type) LIKE ?",
			search,
			search,
			search,
			search,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "installments." + orderBy
	}

	var rows []Installment
	if err := query.
		Preload("MotorType").
		Order(fmt.Sprintf("%s %s", orderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (s *Service) GetInstallmentByID(id string) (Installment, error) {
	var row Installment
	if err := s.db.Preload("MotorType").First(&row, "id = ?", id).Error; err != nil {
		return Installment{}, err
	}
	return row, nil
}

func (s *Service) CreateInstallment(req InstallmentRequest) (Installment, error) {
	motorTypeID := strings.TrimSpace(req.MotorTypeID)
	if motorTypeID == "" {
		return Installment{}, fmt.Errorf("motor_type_id is required")
	}
	if req.Amount < 0 {
		return Installment{}, fmt.Errorf("amount must be greater than or equal to 0")
	}

	var motor MotorType
	if err := s.db.First(&motor, "id = ?", motorTypeID).Error; err != nil {
		return Installment{}, fmt.Errorf("motor type not found")
	}

	var existing Installment
	err := s.db.Where("motor_type_id = ?", motorTypeID).First(&existing).Error
	if err == nil {
		return Installment{}, fmt.Errorf("installment for selected motor type already exists")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return Installment{}, err
	}

	row := Installment{
		Id:          utils.CreateUUID(),
		MotorTypeID: motorTypeID,
		Amount:      req.Amount,
	}
	if err := s.db.Create(&row).Error; err != nil {
		if isUniqueViolationError(err) {
			return Installment{}, fmt.Errorf("installment for selected motor type already exists")
		}
		return Installment{}, err
	}
	if err := s.db.Preload("MotorType").First(&row, "id = ?", row.Id).Error; err != nil {
		return Installment{}, err
	}
	return row, nil
}

func (s *Service) UpdateInstallment(id string, req InstallmentRequest) (Installment, error) {
	normalizedID, err := normalizeRequiredUUID(id, "id")
	if err != nil {
		return Installment{}, err
	}

	var row Installment
	if err := s.db.First(&row, "id = ?", normalizedID).Error; err != nil {
		return Installment{}, err
	}

	motorTypeID, err := normalizeRequiredUUID(req.MotorTypeID, "motor_type_id")
	if err != nil {
		return Installment{}, err
	}
	if req.Amount < 0 {
		return Installment{}, fmt.Errorf("amount must be greater than or equal to 0")
	}

	var motor MotorType
	if err := s.db.First(&motor, "id = ?", motorTypeID).Error; err != nil {
		return Installment{}, fmt.Errorf("motor type not found")
	}

	var dup Installment
	err = s.db.Where("id <> ? AND motor_type_id = ?", normalizedID, motorTypeID).First(&dup).Error
	if err == nil {
		return Installment{}, fmt.Errorf("installment for selected motor type already exists")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return Installment{}, err
	}

	row.MotorTypeID = motorTypeID
	row.Amount = req.Amount
	if err := s.db.Save(&row).Error; err != nil {
		if isUniqueViolationError(err) {
			return Installment{}, fmt.Errorf("installment for selected motor type already exists")
		}
		return Installment{}, err
	}
	if err := s.db.Preload("MotorType").First(&row, "id = ?", row.Id).Error; err != nil {
		return Installment{}, err
	}
	return row, nil
}

func (s *Service) DeleteInstallment(id string) error {
	return s.db.Delete(&Installment{}, "id = ?", id).Error
}

type JobNetIncomeItem struct {
	Id        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type NetIncomeAreaItem struct {
	ProvinceCode string `json:"province_code"`
	ProvinceName string `json:"province_name"`
	RegencyCode  string `json:"regency_code"`
	RegencyName  string `json:"regency_name"`
}

type NetIncomeItem struct {
	Id            string              `json:"id"`
	JobID         string              `json:"job_id"`
	JobName       string              `json:"job_name"`
	NetIncome     float64             `json:"net_income"`
	AreaNetIncome []NetIncomeAreaItem `json:"area_net_income"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
}

func (s *Service) ListJobs(params filter.BaseParams) ([]JobNetIncomeItem, int64, error) {
	query := s.db.Model(&Job{})

	if v, ok := params.Filters["name"]; ok {
		query = query.Where("name = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(name) LIKE ?", search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var jobs []Job
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&jobs).Error; err != nil {
		return nil, 0, err
	}

	items := make([]JobNetIncomeItem, 0, len(jobs))
	for _, job := range jobs {
		items = append(items, JobNetIncomeItem{
			Id:        job.Id,
			Name:      job.Name,
			CreatedAt: job.CreatedAt,
			UpdatedAt: job.UpdatedAt,
		})
	}
	return items, total, nil
}

func (s *Service) GetJobByID(id string) (JobNetIncomeItem, error) {
	var job Job
	if err := s.db.First(&job, "id = ?", id).Error; err != nil {
		return JobNetIncomeItem{}, err
	}
	return JobNetIncomeItem{
		Id:        job.Id,
		Name:      job.Name,
		CreatedAt: job.CreatedAt,
		UpdatedAt: job.UpdatedAt,
	}, nil
}

func (s *Service) CreateJob(req JobRequest) (JobNetIncomeItem, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return JobNetIncomeItem{}, fmt.Errorf("name is required")
	}

	job := Job{
		Id:   utils.CreateUUID(),
		Name: name,
	}
	if err := s.db.Create(&job).Error; err != nil {
		return JobNetIncomeItem{}, err
	}

	return JobNetIncomeItem{
		Id:        job.Id,
		Name:      job.Name,
		CreatedAt: job.CreatedAt,
		UpdatedAt: job.UpdatedAt,
	}, nil
}

func (s *Service) UpdateJob(id string, req JobRequest) (JobNetIncomeItem, error) {
	normalizedID, err := normalizeRequiredUUID(id, "id")
	if err != nil {
		return JobNetIncomeItem{}, err
	}

	var job Job
	if err := s.db.First(&job, "id = ?", normalizedID).Error; err != nil {
		return JobNetIncomeItem{}, err
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return JobNetIncomeItem{}, fmt.Errorf("name is required")
	}

	job.Name = name
	if err := s.db.Save(&job).Error; err != nil {
		return JobNetIncomeItem{}, err
	}

	return JobNetIncomeItem{
		Id:        job.Id,
		Name:      job.Name,
		CreatedAt: job.CreatedAt,
		UpdatedAt: job.UpdatedAt,
	}, nil
}

func (s *Service) DeleteJob(id string) error {
	return s.db.Delete(&Job{}, "id = ?", id).Error
}

func (s *Service) ListNetIncomes(params filter.BaseParams) ([]NetIncomeItem, int64, error) {
	query := s.db.Model(&JobNetIncome{}).
		Joins("LEFT JOIN jobs ON jobs.id = job_net_incomes.job_id")

	if v, ok := params.Filters["job_id"]; ok {
		query = query.Where("job_net_incomes.job_id = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(jobs.name) LIKE ?", search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "job_net_incomes." + orderBy
	}

	var rows []JobNetIncome
	if err := query.
		Preload("Job").
		Order(fmt.Sprintf("%s %s", orderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	items := make([]NetIncomeItem, 0, len(rows))
	for _, row := range rows {
		jobName := "-"
		if row.Job != nil && strings.TrimSpace(row.Job.Name) != "" {
			jobName = row.Job.Name
		}
		items = append(items, NetIncomeItem{
			Id:            row.Id,
			JobID:         row.JobID,
			JobName:       jobName,
			NetIncome:     row.NetIncome,
			AreaNetIncome: decodeAreaNetIncome(row.AreaNetIncome),
			CreatedAt:     row.CreatedAt,
			UpdatedAt:     row.UpdatedAt,
		})
	}
	return items, total, nil
}

func (s *Service) GetNetIncomeByID(id string) (NetIncomeItem, error) {
	var row JobNetIncome
	if err := s.db.Preload("Job").First(&row, "id = ?", id).Error; err != nil {
		return NetIncomeItem{}, err
	}
	jobName := "-"
	if row.Job != nil && strings.TrimSpace(row.Job.Name) != "" {
		jobName = row.Job.Name
	}
	return NetIncomeItem{
		Id:            row.Id,
		JobID:         row.JobID,
		JobName:       jobName,
		NetIncome:     row.NetIncome,
		AreaNetIncome: decodeAreaNetIncome(row.AreaNetIncome),
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

func (s *Service) CreateNetIncome(req NetIncomeRequest) (NetIncomeItem, error) {
	if req.NetIncome < 0 {
		return NetIncomeItem{}, fmt.Errorf("net_income must be greater than or equal to 0")
	}

	areas := normalizeAreaNetIncome(req.AreaNetIncome)
	if len(areas) == 0 {
		return NetIncomeItem{}, fmt.Errorf("area_net_income must contain at least one valid province and regency")
	}

	var job Job
	if err := s.db.First(&job, "id = ?", req.JobID).Error; err != nil {
		return NetIncomeItem{}, fmt.Errorf("job not found")
	}

	row := JobNetIncome{
		Id:            utils.CreateUUID(),
		JobID:         req.JobID,
		NetIncome:     req.NetIncome,
		AreaNetIncome: encodeAreaNetIncome(areas),
	}
	if err := s.db.Create(&row).Error; err != nil {
		return NetIncomeItem{}, err
	}

	return NetIncomeItem{
		Id:            row.Id,
		JobID:         row.JobID,
		JobName:       job.Name,
		NetIncome:     row.NetIncome,
		AreaNetIncome: areas,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

func (s *Service) UpdateNetIncome(id string, req NetIncomeRequest) (NetIncomeItem, error) {
	normalizedID, err := normalizeRequiredUUID(id, "id")
	if err != nil {
		return NetIncomeItem{}, err
	}

	normalizedJobID, err := normalizeRequiredUUID(req.JobID, "job_id")
	if err != nil {
		return NetIncomeItem{}, err
	}

	var row JobNetIncome
	if err := s.db.First(&row, "id = ?", normalizedID).Error; err != nil {
		return NetIncomeItem{}, err
	}

	if req.NetIncome < 0 {
		return NetIncomeItem{}, fmt.Errorf("net_income must be greater than or equal to 0")
	}

	areas := normalizeAreaNetIncome(req.AreaNetIncome)
	if len(areas) == 0 {
		return NetIncomeItem{}, fmt.Errorf("area_net_income must contain at least one valid province and regency")
	}

	var job Job
	if err := s.db.First(&job, "id = ?", normalizedJobID).Error; err != nil {
		return NetIncomeItem{}, fmt.Errorf("job not found")
	}

	row.JobID = normalizedJobID
	row.NetIncome = req.NetIncome
	row.AreaNetIncome = encodeAreaNetIncome(areas)
	if err := s.db.Save(&row).Error; err != nil {
		return NetIncomeItem{}, err
	}

	return NetIncomeItem{
		Id:            row.Id,
		JobID:         row.JobID,
		JobName:       job.Name,
		NetIncome:     row.NetIncome,
		AreaNetIncome: areas,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

func (s *Service) DeleteNetIncome(id string) error {
	return s.db.Delete(&JobNetIncome{}, "id = ?", id).Error
}

func (s *Service) UpsertCreditCapability(req CreditCapabilityRequest) (CreditCapability, error) {
	normalizedJobID, err := normalizeRequiredUUID(req.JobID, "job_id")
	if err != nil {
		return CreditCapability{}, err
	}

	var job Job
	if err := s.db.Select("id").First(&job, "id = ?", normalizedJobID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return CreditCapability{}, fmt.Errorf("job not found")
		}
		return CreditCapability{}, err
	}

	province := strings.TrimSpace(req.Province)
	regency := strings.TrimSpace(req.Regency)
	district := strings.TrimSpace(req.District)
	village := strings.TrimSpace(req.Village)
	address := strings.TrimSpace(req.Address)

	cc := CreditCapability{}
	err = s.db.Where("regency = ? AND job_id = ?", regency, normalizedJobID).First(&cc).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		cc = CreditCapability{
			Id:       utils.CreateUUID(),
			Province: province,
			Regency:  regency,
			District: district,
			Village:  village,
			Address:  address,
			JobID:    normalizedJobID,
			Score:    req.Score,
		}
		if err := s.db.Create(&cc).Error; err != nil {
			return CreditCapability{}, err
		}
		return cc, nil
	} else if err != nil {
		return CreditCapability{}, err
	}

	cc.Province = province
	cc.Regency = regency
	cc.District = district
	cc.Village = village
	cc.Address = address
	cc.Score = req.Score
	if err := s.db.Save(&cc).Error; err != nil {
		return CreditCapability{}, err
	}
	return cc, nil
}

func (s *Service) ListCreditCapabilities(params filter.BaseParams) ([]CreditCapability, int64, error) {
	query := s.db.Model(&CreditCapability{}).
		Joins("LEFT JOIN jobs ON jobs.id = credit_capabilities.job_id")

	if v, ok := params.Filters["job_id"]; ok {
		query = query.Where("credit_capabilities.job_id = ?", v)
	}
	if v, ok := params.Filters["province"]; ok {
		query = query.Where("credit_capabilities.province = ?", v)
	}
	if v, ok := params.Filters["regency"]; ok {
		query = query.Where("credit_capabilities.regency = ?", v)
	}
	if v, ok := params.Filters["district"]; ok {
		query = query.Where("credit_capabilities.district = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where(
			"LOWER(credit_capabilities.province) LIKE ? OR LOWER(credit_capabilities.regency) LIKE ? OR LOWER(credit_capabilities.district) LIKE ? OR LOWER(jobs.name) LIKE ?",
			search,
			search,
			search,
			search,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "credit_capabilities." + orderBy
	}

	var data []CreditCapability
	if err := query.
		Preload("Job").
		Order(fmt.Sprintf("%s %s", orderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
}

type CreditSummary struct {
	Province     string `json:"province"`
	Regency      string `json:"regency"`
	District     string `json:"district"`
	Village      string `json:"village"`
	TotalOrders  int64  `json:"total_orders"`
	ApproveCount int64  `json:"approve_count"`
	RejectCount  int64  `json:"reject_count"`
	PendingCount int64  `json:"pending_count"`
	Score        int    `json:"score"`
}

type CreditWorksheetJob struct {
	JobID     string  `json:"job_id"`
	JobName   string  `json:"job_name"`
	NetIncome float64 `json:"net_income"`
	Area      string  `json:"area"`
}

type CreditWorksheetMotor struct {
	MotorTypeID   string  `json:"motor_type_id"`
	MotorTypeName string  `json:"motor_type_name"`
	Installment   float64 `json:"installment"`
	Area          string  `json:"area"`
}

type CreditWorksheetCell struct {
	MotorTypeID       string  `json:"motor_type_id"`
	MotorTypeName     string  `json:"motor_type_name"`
	Installment       float64 `json:"installment"`
	CapabilityRate    float64 `json:"capability_rate"`
	ProgramSuggestion float64 `json:"program_suggestion"`
}

type CreditWorksheetMatrixRow struct {
	JobID     string                `json:"job_id"`
	JobName   string                `json:"job_name"`
	NetIncome float64               `json:"net_income"`
	Area      string                `json:"area"`
	Cells     []CreditWorksheetCell `json:"cells"`
}

type CreditWorksheetArea struct {
	AreaKey      string                     `json:"area_key"`
	ProvinceCode string                     `json:"province_code"`
	ProvinceName string                     `json:"province_name"`
	RegencyCode  string                     `json:"regency_code"`
	RegencyName  string                     `json:"regency_name"`
	Jobs         []CreditWorksheetJob       `json:"jobs"`
	MotorTypes   []CreditWorksheetMotor     `json:"motor_types"`
	Matrix       []CreditWorksheetMatrixRow `json:"matrix"`
}

type CreditWorksheetJobMaster struct {
	JobID       string  `json:"job_id"`
	JobName     string  `json:"job_name"`
	NetIncome   float64 `json:"net_income"`
	RegencyCode string  `json:"regency_code"`
	RegencyName string  `json:"regency_name"`
}

type CreditWorksheetMotorMaster struct {
	MotorTypeID   string  `json:"motor_type_id"`
	MotorTypeName string  `json:"motor_type_name"`
	Installment   float64 `json:"installment"`
	RegencyCode   string  `json:"regency_code"`
	RegencyName   string  `json:"regency_name"`
}

// Compute credit score per wilayah based on order status distribution.
func (s *Service) CreditCapabilitySummary(orderThreshold int64) ([]CreditSummary, error) {
	if orderThreshold <= 0 {
		orderThreshold = 5
	}

	type row struct {
		Province string
		Regency  string
		District string
		Village  string
		Total    int64
		Approve  int64
		Reject   int64
		Pending  int64
	}

	var rows []row
	if err := s.db.
		Table("orders").
		Select(`
			COALESCE(province,'') AS province,
			COALESCE(regency,'') AS regency,
			COALESCE(district,'') AS district,
			COALESCE(village,'') AS village,
			COUNT(*) AS total,
			SUM(CASE WHEN result_status = 'approve' THEN 1 ELSE 0 END) AS approve,
			SUM(CASE WHEN result_status = 'reject' THEN 1 ELSE 0 END) AS reject,
			SUM(CASE WHEN result_status = 'pending' THEN 1 ELSE 0 END) AS pending
		`).
		Group("province, regency, district, village").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	summaries := make([]CreditSummary, 0, len(rows))
	for _, r := range rows {
		score := 4
		approveMore := r.Approve > r.Reject
		rejectMore := r.Reject > r.Approve
		manyOrders := r.Total >= orderThreshold

		switch {
		case manyOrders && approveMore:
			score = 1
		case manyOrders && rejectMore:
			score = 3
		case !manyOrders && approveMore:
			score = 2
		default:
			score = 4
		}

		summaries = append(summaries, CreditSummary{
			Province:     r.Province,
			Regency:      r.Regency,
			District:     r.District,
			Village:      r.Village,
			TotalOrders:  r.Total,
			ApproveCount: r.Approve,
			RejectCount:  r.Reject,
			PendingCount: r.Pending,
			Score:        score,
		})
	}

	return summaries, nil
}

// CreditCapabilityWorksheet builds worksheet-style capability matrix based on Order In data.
func (s *Service) CreditCapabilityWorksheet(provinceCode, regencyCode string) (map[string]interface{}, error) {
	type worksheetOrderAnchorRow struct {
		JobID         string `gorm:"column:job_id"`
		JobName       string `gorm:"column:job_name"`
		MotorTypeID   string `gorm:"column:motor_type_id"`
		MotorTypeName string `gorm:"column:motor_type_name"`
		ProvinceCode  string `gorm:"column:province_code"`
		ProvinceName  string `gorm:"column:province_name"`
		RegencyCode   string `gorm:"column:regency_code"`
		RegencyName   string `gorm:"column:regency_name"`
	}
	type worksheetJobIncomeRow struct {
		JobID         string         `gorm:"column:job_id"`
		JobName       string         `gorm:"column:job_name"`
		NetIncome     float64        `gorm:"column:net_income"`
		AreaNetIncome datatypes.JSON `gorm:"column:area_net_income"`
	}
	type worksheetMotorRow struct {
		MotorTypeID   string  `gorm:"column:motor_type_id"`
		MotorTypeName string  `gorm:"column:motor_type_name"`
		Installment   float64 `gorm:"column:installment"`
		ProvinceCode  string  `gorm:"column:province_code"`
		ProvinceName  string  `gorm:"column:province_name"`
		RegencyCode   string  `gorm:"column:regency_code"`
		RegencyName   string  `gorm:"column:regency_name"`
	}
	type worksheetAreaAggregate struct {
		AreaKey      string
		ProvinceCode string
		ProvinceName string
		RegencyCode  string
		RegencyName  string
		JobsByID     map[string]CreditWorksheetJob
		MotorsByID   map[string]CreditWorksheetMotor
	}
	type jobIncomeValue struct {
		Name      string
		NetIncome float64
	}
	type motorInstallmentValue struct {
		Name        string
		Installment float64
	}

	provinceFilter := strings.TrimSpace(provinceCode)
	regencyFilter := strings.TrimSpace(regencyCode)
	matchFilterValue := func(filterValue, codeValue, nameValue string) bool {
		filter := strings.ToLower(strings.TrimSpace(filterValue))
		if filter == "" {
			return true
		}
		code := strings.ToLower(strings.TrimSpace(codeValue))
		name := strings.ToLower(strings.TrimSpace(nameValue))
		return code == filter || name == filter
	}
	matchesArea := func(provCode, provName, regCode, regName string) bool {
		if !matchFilterValue(provinceFilter, provCode, provName) {
			return false
		}
		if !matchFilterValue(regencyFilter, regCode, regName) {
			return false
		}
		return true
	}
	areaPart := func(code, name string) string {
		if trimmed := strings.ToLower(strings.TrimSpace(code)); trimmed != "" {
			return trimmed
		}
		return strings.ToLower(strings.TrimSpace(name))
	}
	buildAreaKey := func(provCode, provName, regCode, regName string) string {
		return areaPart(provCode, provName) + "|" + areaPart(regCode, regName)
	}
	jobAreaKey := func(jobID, regCode, regName string) string {
		return strings.ToLower(strings.TrimSpace(jobID)) + "|" + areaPart(regCode, regName)
	}
	motorAreaKey := func(motorID, regCode, regName string) string {
		return strings.ToLower(strings.TrimSpace(motorID)) + "|" + areaPart(regCode, regName)
	}

	areasByKey := make(map[string]*worksheetAreaAggregate)
	ensureArea := func(provCode, provName, regCode, regName string) *worksheetAreaAggregate {
		areaKey := buildAreaKey(provCode, provName, regCode, regName)
		if area, ok := areasByKey[areaKey]; ok {
			if strings.TrimSpace(area.ProvinceCode) == "" {
				area.ProvinceCode = strings.TrimSpace(provCode)
			}
			if strings.TrimSpace(area.ProvinceName) == "" {
				area.ProvinceName = strings.TrimSpace(provName)
			}
			if strings.TrimSpace(area.RegencyCode) == "" {
				area.RegencyCode = strings.TrimSpace(regCode)
			}
			if strings.TrimSpace(area.RegencyName) == "" {
				area.RegencyName = strings.TrimSpace(regName)
			}
			return area
		}

		area := &worksheetAreaAggregate{
			AreaKey:      areaKey,
			ProvinceCode: strings.TrimSpace(provCode),
			ProvinceName: strings.TrimSpace(provName),
			RegencyCode:  strings.TrimSpace(regCode),
			RegencyName:  strings.TrimSpace(regName),
			JobsByID:     map[string]CreditWorksheetJob{},
			MotorsByID:   map[string]CreditWorksheetMotor{},
		}
		if area.ProvinceName == "" {
			area.ProvinceName = area.ProvinceCode
		}
		if area.RegencyName == "" {
			area.RegencyName = area.RegencyCode
		}
		areasByKey[areaKey] = area
		return area
	}

	// 1) Anchor matrix dimension from Order In rows to guarantee worksheet matches transactional data.
	var anchors []worksheetOrderAnchorRow
	if err := s.db.
		Table("orders o").
		Select(`
			o.job_id AS job_id,
			COALESCE(j.name, '') AS job_name,
			o.motor_type_id AS motor_type_id,
			COALESCE(mt.name, '') AS motor_type_name,
			COALESCE(NULLIF(mt.province_code, ''), '') AS province_code,
			COALESCE(NULLIF(mt.province_name, ''), NULLIF(o.province, ''), '') AS province_name,
			COALESCE(NULLIF(mt.regency_code, ''), '') AS regency_code,
			COALESCE(NULLIF(mt.regency_name, ''), NULLIF(o.regency, ''), '') AS regency_name
		`).
		Joins("LEFT JOIN jobs j ON j.id::text = NULLIF(TRIM(o.job_id::text), '') AND j.deleted_at IS NULL").
		Joins("LEFT JOIN motor_types mt ON mt.id::text = NULLIF(TRIM(o.motor_type_id::text), '') AND mt.deleted_at IS NULL").
		Where("o.deleted_at IS NULL").
		Where("NULLIF(TRIM(o.job_id::text), '') IS NOT NULL").
		Where("NULLIF(TRIM(o.motor_type_id::text), '') IS NOT NULL").
		Group(`
			o.job_id, j.name,
			o.motor_type_id, mt.name,
			mt.province_code, mt.province_name,
			mt.regency_code, mt.regency_name,
			o.province, o.regency
		`).
		Scan(&anchors).Error; err != nil {
		return nil, err
	}

	for _, row := range anchors {
		jobID := strings.TrimSpace(row.JobID)
		motorID := strings.TrimSpace(row.MotorTypeID)
		if jobID == "" || motorID == "" {
			continue
		}
		if strings.TrimSpace(row.RegencyCode) == "" && strings.TrimSpace(row.RegencyName) == "" {
			continue
		}
		if !matchesArea(row.ProvinceCode, row.ProvinceName, row.RegencyCode, row.RegencyName) {
			continue
		}

		area := ensureArea(row.ProvinceCode, row.ProvinceName, row.RegencyCode, row.RegencyName)
		if _, exists := area.JobsByID[jobID]; !exists {
			area.JobsByID[jobID] = CreditWorksheetJob{
				JobID:     jobID,
				JobName:   strings.TrimSpace(row.JobName),
				NetIncome: 0,
				Area:      area.RegencyName,
			}
		}
		if _, exists := area.MotorsByID[motorID]; !exists {
			area.MotorsByID[motorID] = CreditWorksheetMotor{
				MotorTypeID:   motorID,
				MotorTypeName: strings.TrimSpace(row.MotorTypeName),
				Installment:   0,
				Area:          area.RegencyName,
			}
		}
	}

	// 2) Lookup net income values from job master (with area-specific mapping and fallback by job).
	jobIncomeByArea := map[string]jobIncomeValue{}
	jobIncomeByJob := map[string]jobIncomeValue{}
	var jobRows []worksheetJobIncomeRow
	if err := s.db.
		Table("job_net_incomes").
		Select(`
			job_net_incomes.job_id,
			jobs.name AS job_name,
			job_net_incomes.net_income,
			job_net_incomes.area_net_income
		`).
		Joins("JOIN jobs ON jobs.id = job_net_incomes.job_id").
		Where("job_net_incomes.deleted_at IS NULL").
		Where("jobs.deleted_at IS NULL").
		Scan(&jobRows).Error; err != nil {
		return nil, err
	}
	for _, row := range jobRows {
		jobID := strings.TrimSpace(row.JobID)
		if jobID == "" {
			continue
		}
		if _, ok := jobIncomeByJob[jobID]; !ok {
			jobIncomeByJob[jobID] = jobIncomeValue{
				Name:      strings.TrimSpace(row.JobName),
				NetIncome: row.NetIncome,
			}
		}

		areas := decodeAreaNetIncome(row.AreaNetIncome)
		for _, area := range areas {
			key := jobAreaKey(jobID, area.RegencyCode, area.RegencyName)
			if key == strings.ToLower(jobID)+"|" {
				continue
			}
			jobIncomeByArea[key] = jobIncomeValue{
				Name:      strings.TrimSpace(row.JobName),
				NetIncome: row.NetIncome,
			}
		}
	}

	// 3) Lookup installment values from motor + installment master (area-specific with fallback by motor id).
	motorInstallmentByArea := map[string]motorInstallmentValue{}
	motorInstallmentByID := map[string]motorInstallmentValue{}
	var motorRows []worksheetMotorRow
	if err := s.db.
		Table("installments").
		Select(`
			installments.motor_type_id,
			motor_types.name AS motor_type_name,
			installments.amount AS installment,
			motor_types.province_code,
			motor_types.province_name,
			motor_types.regency_code,
			motor_types.regency_name
		`).
		Joins("JOIN motor_types ON motor_types.id = installments.motor_type_id").
		Where("installments.deleted_at IS NULL").
		Where("motor_types.deleted_at IS NULL").
		Scan(&motorRows).Error; err != nil {
		return nil, err
	}
	for _, row := range motorRows {
		motorID := strings.TrimSpace(row.MotorTypeID)
		if motorID == "" {
			continue
		}
		value := motorInstallmentValue{
			Name:        strings.TrimSpace(row.MotorTypeName),
			Installment: row.Installment,
		}
		if _, ok := motorInstallmentByID[motorID]; !ok {
			motorInstallmentByID[motorID] = value
		}

		key := motorAreaKey(motorID, row.RegencyCode, row.RegencyName)
		if key == strings.ToLower(motorID)+"|" {
			continue
		}
		motorInstallmentByArea[key] = value
	}

	const capabilityThreshold = 0.35
	const suggestionCap = 250000.0
	areasOut := make([]CreditWorksheetArea, 0, len(areasByKey))
	jobsMaster := make([]CreditWorksheetJobMaster, 0)
	motorsMaster := make([]CreditWorksheetMotorMaster, 0)
	jobsMasterSeen := map[string]struct{}{}
	motorsMasterSeen := map[string]struct{}{}

	for _, area := range areasByKey {
		if len(area.JobsByID) == 0 || len(area.MotorsByID) == 0 {
			continue
		}

		jobs := make([]CreditWorksheetJob, 0, len(area.JobsByID))
		for _, job := range area.JobsByID {
			lookupKey := jobAreaKey(job.JobID, area.RegencyCode, area.RegencyName)
			if v, ok := jobIncomeByArea[lookupKey]; ok {
				job.NetIncome = v.NetIncome
				if strings.TrimSpace(job.JobName) == "" {
					job.JobName = v.Name
				}
			} else if v, ok := jobIncomeByJob[job.JobID]; ok {
				job.NetIncome = v.NetIncome
				if strings.TrimSpace(job.JobName) == "" {
					job.JobName = v.Name
				}
			}
			if strings.TrimSpace(job.JobName) == "" {
				job.JobName = job.JobID
			}

			jobs = append(jobs, job)

			jobMasterKey := strings.ToLower(strings.TrimSpace(job.JobID) + "|" + area.AreaKey)
			if _, exists := jobsMasterSeen[jobMasterKey]; !exists {
				jobsMasterSeen[jobMasterKey] = struct{}{}
				jobsMaster = append(jobsMaster, CreditWorksheetJobMaster{
					JobID:       job.JobID,
					JobName:     job.JobName,
					NetIncome:   job.NetIncome,
					RegencyCode: area.RegencyCode,
					RegencyName: area.RegencyName,
				})
			}
		}
		sort.Slice(jobs, func(i, j int) bool {
			return strings.ToLower(strings.TrimSpace(jobs[i].JobName)) < strings.ToLower(strings.TrimSpace(jobs[j].JobName))
		})

		motors := make([]CreditWorksheetMotor, 0, len(area.MotorsByID))
		for _, motor := range area.MotorsByID {
			lookupKey := motorAreaKey(motor.MotorTypeID, area.RegencyCode, area.RegencyName)
			if v, ok := motorInstallmentByArea[lookupKey]; ok {
				motor.Installment = v.Installment
				if strings.TrimSpace(motor.MotorTypeName) == "" {
					motor.MotorTypeName = v.Name
				}
			} else if v, ok := motorInstallmentByID[motor.MotorTypeID]; ok {
				motor.Installment = v.Installment
				if strings.TrimSpace(motor.MotorTypeName) == "" {
					motor.MotorTypeName = v.Name
				}
			}
			if strings.TrimSpace(motor.MotorTypeName) == "" {
				motor.MotorTypeName = motor.MotorTypeID
			}

			motors = append(motors, motor)

			motorMasterKey := strings.ToLower(strings.TrimSpace(motor.MotorTypeID) + "|" + area.AreaKey)
			if _, exists := motorsMasterSeen[motorMasterKey]; !exists {
				motorsMasterSeen[motorMasterKey] = struct{}{}
				motorsMaster = append(motorsMaster, CreditWorksheetMotorMaster{
					MotorTypeID:   motor.MotorTypeID,
					MotorTypeName: motor.MotorTypeName,
					Installment:   motor.Installment,
					RegencyCode:   area.RegencyCode,
					RegencyName:   area.RegencyName,
				})
			}
		}
		sort.Slice(motors, func(i, j int) bool {
			return strings.ToLower(strings.TrimSpace(motors[i].MotorTypeName)) < strings.ToLower(strings.TrimSpace(motors[j].MotorTypeName))
		})

		matrix := make([]CreditWorksheetMatrixRow, 0, len(jobs))
		for _, job := range jobs {
			row := CreditWorksheetMatrixRow{
				JobID:     job.JobID,
				JobName:   job.JobName,
				NetIncome: job.NetIncome,
				Area:      area.RegencyName,
				Cells:     make([]CreditWorksheetCell, 0, len(motors)),
			}

			for _, motor := range motors {
				capabilityRate := 0.0
				if job.NetIncome > 0 {
					capabilityRate = motor.Installment / job.NetIncome
				}

				programSuggestion := 0.0
				thresholdInstallment := job.NetIncome * capabilityThreshold
				if motor.Installment > thresholdInstallment {
					diff := motor.Installment - thresholdInstallment
					if diff <= suggestionCap {
						programSuggestion = diff
					} else {
						programSuggestion = suggestionCap
					}
				}

				row.Cells = append(row.Cells, CreditWorksheetCell{
					MotorTypeID:       motor.MotorTypeID,
					MotorTypeName:     motor.MotorTypeName,
					Installment:       motor.Installment,
					CapabilityRate:    capabilityRate,
					ProgramSuggestion: programSuggestion,
				})
			}
			matrix = append(matrix, row)
		}

		areasOut = append(areasOut, CreditWorksheetArea{
			AreaKey:      area.AreaKey,
			ProvinceCode: area.ProvinceCode,
			ProvinceName: area.ProvinceName,
			RegencyCode:  area.RegencyCode,
			RegencyName:  area.RegencyName,
			Jobs:         jobs,
			MotorTypes:   motors,
			Matrix:       matrix,
		})
	}

	sort.Slice(areasOut, func(i, j int) bool {
		leftProvince := strings.ToLower(strings.TrimSpace(areasOut[i].ProvinceName))
		rightProvince := strings.ToLower(strings.TrimSpace(areasOut[j].ProvinceName))
		if leftProvince != rightProvince {
			return leftProvince < rightProvince
		}
		leftRegency := strings.ToLower(strings.TrimSpace(areasOut[i].RegencyName))
		rightRegency := strings.ToLower(strings.TrimSpace(areasOut[j].RegencyName))
		return leftRegency < rightRegency
	})
	sort.Slice(jobsMaster, func(i, j int) bool {
		leftRegency := strings.ToLower(strings.TrimSpace(jobsMaster[i].RegencyName))
		rightRegency := strings.ToLower(strings.TrimSpace(jobsMaster[j].RegencyName))
		if leftRegency != rightRegency {
			return leftRegency < rightRegency
		}
		return strings.ToLower(strings.TrimSpace(jobsMaster[i].JobName)) < strings.ToLower(strings.TrimSpace(jobsMaster[j].JobName))
	})
	sort.Slice(motorsMaster, func(i, j int) bool {
		leftRegency := strings.ToLower(strings.TrimSpace(motorsMaster[i].RegencyName))
		rightRegency := strings.ToLower(strings.TrimSpace(motorsMaster[j].RegencyName))
		if leftRegency != rightRegency {
			return leftRegency < rightRegency
		}
		return strings.ToLower(strings.TrimSpace(motorsMaster[i].MotorTypeName)) < strings.ToLower(strings.TrimSpace(motorsMaster[j].MotorTypeName))
	})

	return map[string]interface{}{
		"areas":              areasOut,
		"jobs_master":        jobsMaster,
		"motor_types_master": motorsMaster,
		"thresholds": map[string]float64{
			"green_max_rate":  0.35,
			"yellow_min_rate": 0.35,
			"yellow_max_rate": 0.40,
			"red_min_rate":    0.40,
			"suggestion_cap":  suggestionCap,
		},
		"formula": map[string]string{
			"credit_capability":  "installment / net_income",
			"program_suggestion": "if installment <= net_income*35% then 0 else min(installment - net_income*35%, 250000)",
		},
	}, nil
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

func (s *Service) ListQuadrants(params filter.BaseParams) ([]QuadrantResult, int64, error) {
	query := s.db.Model(&QuadrantResult{}).
		Joins("LEFT JOIN jobs ON jobs.id = quadrant_results.job_id")

	if v, ok := params.Filters["job_id"]; ok {
		query = query.Where("quadrant_results.job_id = ?", v)
	}
	if v, ok := params.Filters["regency"]; ok {
		query = query.Where("quadrant_results.regency = ?", v)
	}
	if v, ok := params.Filters["quadrant"]; ok {
		query = query.Where("quadrant_results.quadrant = ?", v)
	}
	if v, ok := params.Filters["credit_score"]; ok {
		query = query.Where("quadrant_results.credit_score = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(quadrant_results.regency) LIKE ? OR LOWER(jobs.name) LIKE ?", search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "quadrant_results." + orderBy
	}

	var data []QuadrantResult
	if err := query.
		Preload("Job").
		Order(fmt.Sprintf("%s %s", orderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
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

func (s *Service) ListNewsSources(params filter.BaseParams) ([]NewsSource, int64, error) {
	query := s.db.Model(&NewsSource{})

	if v, ok := params.Filters["category"]; ok {
		query = query.Where("category = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(url) LIKE ? OR LOWER(category) LIKE ?", search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var list []NewsSource
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&list).Error; err != nil {
		return nil, 0, err
	}

	return list, total, nil
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
			item.Content = sanitizeNewsContent(item.Content)
			result[src.Name] = item
		}
	}
	return result, nil
}

// ListNewsItems returns persisted news rows from database with pagination.
func (s *Service) ListNewsItems(category string, params filter.BaseParams) ([]NewsItem, int64, error) {
	query := s.db.Model(&NewsItem{})

	if category != "" {
		query = query.Where("category = ?", category)
	}
	if v, ok := params.Filters["source_id"]; ok {
		query = query.Where("source_id = ?", v)
	}
	if v, ok := params.Filters["source_name"]; ok {
		query = query.Where("source_name = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(source_name) LIKE ? OR LOWER(url) LIKE ?", search, search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := params.OrderBy
	if !strings.Contains(orderBy, ".") {
		orderBy = "news_items." + orderBy
	}

	var rows []NewsItem
	if err := query.
		Preload("Source").
		//Order(fmt.Sprintf("%s %s", orderBy, params.OrderDirection)).
		Order("news_items.published_at DESC").
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	for i := range rows {
		if strings.TrimSpace(rows[i].SourceName) == "" {
			if rows[i].Source != nil && strings.TrimSpace(rows[i].Source.Name) != "" {
				rows[i].SourceName = strings.TrimSpace(rows[i].Source.Name)
			} else {
				rows[i].SourceName = strings.TrimSpace(hostFromURL(rows[i].URL))
			}
		}
		rows[i].Content = sanitizeNewsContent(rows[i].Content)
	}

	return rows, total, nil
}

func (s *Service) DeleteNewsItem(id string) error {
	return s.db.Delete(&NewsItem{}, "id = ?", id).Error
}

// ScrapeNews runs python scraper and returns scraped rows without persisting.
func (s *Service) ScrapeNews(ctx context.Context) ([]NewsScrapedArticle, error) {
	var sources []NewsSource
	if err := s.db.Find(&sources).Error; err != nil {
		return nil, err
	}

	targets := make([]newsScrapeTarget, 0, len(sources))
	for _, src := range sources {
		u := strings.TrimSpace(src.URL)
		if u == "" {
			continue
		}
		targets = append(targets, newsScrapeTarget{
			URL:      u,
			SourceID: src.Id,
			Category: src.Category,
		})
	}

	// Fallback if legacy news_sources belum diisi: gunakan scrape_sources(type=news)/env.
	if len(targets) == 0 {
		for _, u := range s.defaultScrapeUrls("news") {
			u = strings.TrimSpace(u)
			if u == "" {
				continue
			}
			targets = append(targets, newsScrapeTarget{URL: u})
		}
	}
	if len(targets) == 0 {
		return nil, fmt.Errorf("no news sources configured")
	}

	return s.scrapeNewsViaPython(ctx, targets)
}

// ScrapeNewsFromUrls scrapes arbitrary urls and returns rows without persisting.
func (s *Service) ScrapeNewsFromUrls(ctx context.Context, urls []string) ([]NewsScrapedArticle, error) {
	if len(urls) == 0 {
		urls = s.defaultScrapeUrls("news")
	}
	if len(urls) == 0 {
		return nil, fmt.Errorf("urls is required")
	}

	sourceByURL, err := s.newsSourceLookupByURL()
	if err != nil {
		return nil, err
	}

	targets := make([]newsScrapeTarget, 0, len(urls))
	for _, raw := range urls {
		u := strings.TrimSpace(raw)
		if u == "" {
			continue
		}
		t := newsScrapeTarget{URL: u}
		if src, ok := sourceByURL[baseSiteURL(u)]; ok {
			t.SourceID = src.Id
			t.Category = src.Category
		}
		targets = append(targets, t)
	}
	if len(targets) == 0 {
		return nil, fmt.Errorf("urls is required")
	}

	return s.scrapeNewsViaPython(ctx, targets)
}

func (s *Service) scrapeNewsViaPython(ctx context.Context, targets []newsScrapeTarget) ([]NewsScrapedArticle, error) {
	limit := 15
	if rawLimit := strings.TrimSpace(utils.GetEnv("SCRAPE_BERITA_LIMIT", "").(string)); rawLimit != "" {
		if v, err := strconv.Atoi(rawLimit); err == nil && v > 0 && v <= 50 {
			limit = v
		}
	}

	result := make([]NewsScrapedArticle, 0)
	seenURL := make(map[string]struct{})
	errs := make([]string, 0)

	for _, t := range targets {
		sourceID := validUUIDOrEmpty(t.SourceID)
		if sourceID == "" {
			resolvedSourceID, resolvedCategory, err := s.ensureNewsSourceForURL(t.URL, t.Category)
			if err == nil {
				sourceID = resolvedSourceID
				if t.Category == "" {
					t.Category = resolvedCategory
				}
			}
		}

		output, err := s.runNewsScraper(ctx, t.URL, limit)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", t.URL, err))
			continue
		}

		articles, err := parsePythonNewsArticles(output)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", t.URL, err))
			continue
		}

		for _, a := range articles {
			if strings.TrimSpace(a.URL) == "" || strings.TrimSpace(a.Title) == "" {
				continue
			}

			a.SourceID = sourceID
			a.SourceURL = t.URL
			if a.Category == "" {
				a.Category = t.Category
			}
			if a.Source == "" {
				a.Source = strings.TrimSpace(hostFromURL(a.URL))
			}

			key := normalizeNewsURL(a.URL)
			if key == "" {
				key = strings.TrimSpace(strings.ToLower(a.URL))
			}
			if _, ok := seenURL[key]; ok {
				continue
			}
			seenURL[key] = struct{}{}
			result = append(result, a)
		}
	}

	if len(result) == 0 {
		if len(errs) == 0 {
			return nil, fmt.Errorf("no articles scraped")
		}
		return nil, fmt.Errorf("news scrape failed: %s", strings.Join(errs, "; "))
	}
	return result, nil
}

type newsScraperCommand struct {
	Bin  string
	Args []string
}

func (c newsScraperCommand) display() string {
	if len(c.Args) == 0 {
		return c.Bin
	}
	return c.Bin + " " + strings.Join(c.Args, " ")
}

func (s *Service) runNewsScraper(ctx context.Context, homeURL string, limit int) ([]byte, error) {
	commands := s.newsScraperCommands(homeURL, limit)
	if len(commands) == 0 {
		return nil, fmt.Errorf("news scraper command is not configured")
	}

	for i, c := range commands {
		cmd := exec.CommandContext(ctx, c.Bin, c.Args...)
		output, err := cmd.CombinedOutput()
		if err == nil {
			return output, nil
		}

		if isExecNotFound(err) && i < len(commands)-1 {
			continue
		}

		msg := strings.TrimSpace(string(output))
		if msg == "" {
			return nil, fmt.Errorf("%s: %w", c.display(), err)
		}
		return nil, fmt.Errorf("%s: %w: %s", c.display(), err, msg)
	}

	return nil, fmt.Errorf("unable to execute news scraper command")
}

func (s *Service) newsScraperCommands(homeURL string, limit int) []newsScraperCommand {
	out := make([]newsScraperCommand, 0, 3)
	seen := make(map[string]struct{})
	push := func(bin string, args ...string) {
		bin = strings.TrimSpace(bin)
		if bin == "" {
			return
		}
		key := bin + "\x00" + strings.Join(args, "\x00")
		if _, ok := seen[key]; ok {
			return
		}
		seen[key] = struct{}{}
		out = append(out, newsScraperCommand{Bin: bin, Args: args})
	}

	binPath := strings.TrimSpace(utils.GetEnv("SCRAPE_BERITA_BIN", "").(string))
	if binPath == "" {
		defaultBin := "python/songket-scraping/bin/scrape_berita"
		if st, err := os.Stat(defaultBin); err == nil && !st.IsDir() {
			binPath = defaultBin
		}
	}
	push(binPath, homeURL, "--limit", strconv.Itoa(limit))

	scriptPath := strings.TrimSpace(utils.GetEnv("SCRAPE_BERITA_SCRIPT", "").(string))
	if scriptPath == "" {
		scriptPath = "python/songket-scraping/scrape_berita.py"
	}
	if strings.HasSuffix(strings.ToLower(scriptPath), ".py") {
		pyRunner := strings.TrimSpace(utils.GetEnv("SCRAPE_BERITA_PYTHON", "").(string))
		if pyRunner == "" {
			pyRunner = "python3"
		}
		push(pyRunner, scriptPath, homeURL, "--limit", strconv.Itoa(limit))
	} else {
		push(scriptPath, homeURL, "--limit", strconv.Itoa(limit))
	}

	return out
}

func isExecNotFound(err error) bool {
	var execErr *exec.Error
	if errors.As(err, &execErr) {
		return errors.Is(execErr.Err, exec.ErrNotFound)
	}
	var pathErr *os.PathError
	if errors.As(err, &pathErr) {
		return errors.Is(pathErr.Err, os.ErrNotExist)
	}
	return false
}

// ImportScrapedNews inserts selected scraped rows into news_items.
func (s *Service) ImportScrapedNews(rows []NewsScrapedArticle) ([]NewsItem, error) {
	if len(rows) == 0 {
		return nil, fmt.Errorf("items is required")
	}

	saved := make([]NewsItem, 0, len(rows))
	errs := make([]string, 0)
	duplicateFound := false
	seenURL := make(map[string]struct{})

	for _, row := range rows {
		title := strings.TrimSpace(row.Title)
		url := strings.TrimSpace(row.URL)
		if title == "" || url == "" {
			continue
		}

		key := normalizeNewsURL(url)
		if key == "" {
			key = strings.TrimSpace(strings.ToLower(url))
		}
		if _, ok := seenURL[key]; ok {
			continue
		}
		seenURL[key] = struct{}{}

		sourceID := validUUIDOrEmpty(row.SourceID)
		category := strings.TrimSpace(row.Category)

		sourceURL := strings.TrimSpace(row.SourceURL)
		if sourceURL == "" {
			sourceURL = baseSiteURL(url)
		}
		if sourceID == "" {
			resolvedSourceID, resolvedCategory, err := s.ensureNewsSourceForURL(sourceURL, category)
			if err == nil {
				sourceID = resolvedSourceID
				if category == "" {
					category = resolvedCategory
				}
			}
		}

		published := time.Now()
		if rawTime := strings.TrimSpace(row.CreatedAt); rawTime != "" {
			if tNews, ok := parseNewsTime(rawTime); ok {
				published = tNews
			}
		}

		item, err := s.upsertNewsItem(row, sourceID, category, published)
		if err != nil {
			if errors.Is(err, errNewsAlreadyAdded) {
				duplicateFound = true
				continue
			}
			errs = append(errs, fmt.Sprintf("%s: %v", url, err))
			continue
		}
		saved = append(saved, item)
	}

	if len(saved) == 0 {
		if duplicateFound && len(errs) == 0 {
			return nil, errNewsAlreadyAdded
		}
		if len(errs) == 0 {
			return nil, fmt.Errorf("no valid selected news")
		}
		return nil, fmt.Errorf("news import failed: %s", strings.Join(errs, "; "))
	}
	return saved, nil
}

func (s *Service) upsertNewsItem(row NewsScrapedArticle, sourceID, category string, publishedAt time.Time) (NewsItem, error) {
	urlOriginal := strings.TrimSpace(row.URL)
	urlRaw := urlOriginal
	if normalized := normalizeNewsURL(urlOriginal); normalized != "" {
		urlRaw = normalized
	}
	title := strings.TrimSpace(row.Title)
	content := sanitizeNewsContent(row.Content)
	sourceName := strings.TrimSpace(row.Source)
	if sourceName == "" {
		sourceName = strings.TrimSpace(hostFromURL(urlRaw))
	}
	sourceID = validUUIDOrEmpty(sourceID)
	if urlRaw == "" || title == "" {
		return NewsItem{}, fmt.Errorf("invalid news row")
	}
	imagesJSON, _ := buildNewsImagesJSON(row.Images)

	urlCandidates := make(map[string]struct{})
	addCandidate := func(raw string) {
		v := strings.TrimSpace(raw)
		if v == "" {
			return
		}
		urlCandidates[v] = struct{}{}
		noSlash := strings.TrimRight(v, "/")
		if noSlash != "" {
			urlCandidates[noSlash] = struct{}{}
			urlCandidates[noSlash+"/"] = struct{}{}
		}
	}
	addCandidate(urlOriginal)
	addCandidate(urlRaw)

	var existing NewsItem
	var q *gorm.DB
	first := true
	for candidate := range urlCandidates {
		if first {
			q = s.db.Where("url = ?", candidate)
			first = false
			continue
		}
		q = q.Or("url = ?", candidate)
	}
	findErr := q.Order("created_at DESC").First(&existing).Error

	if errors.Is(findErr, gorm.ErrRecordNotFound) {
		item := NewsItem{
			Id:          utils.CreateUUID(),
			SourceName:  sourceName,
			Title:       title,
			Content:     content,
			Images:      imagesJSON,
			URL:         urlRaw,
			Category:    category,
			PublishedAt: publishedAt,
		}
		if sourceID != "" {
			item.SourceID = stringPtr(sourceID)
		}
		if err := s.db.Create(&item).Error; err != nil {
			if isUniqueViolationError(err) {
				return NewsItem{}, errNewsAlreadyAdded
			}
			return NewsItem{}, err
		}
		return item, nil
	}
	if findErr != nil {
		return NewsItem{}, findErr
	}
	return NewsItem{}, errNewsAlreadyAdded
}

func buildNewsImagesJSON(images NewsScrapedImages) (datatypes.JSON, bool) {
	main := strings.TrimSpace(images.Main)
	seen := make(map[string]struct{})
	list := make([]string, 0, len(images.List))
	for _, raw := range images.List {
		u := strings.TrimSpace(raw)
		if u == "" {
			continue
		}
		if _, ok := seen[u]; ok {
			continue
		}
		seen[u] = struct{}{}
		list = append(list, u)
	}
	if main == "" && len(list) > 0 {
		main = list[0]
	}
	if main != "" {
		if _, ok := seen[main]; !ok {
			list = append([]string{main}, list...)
		}
	}

	payload := map[string]interface{}{
		"foto_utama":   main,
		"dalam_berita": list,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return datatypes.JSON([]byte(`{"foto_utama":"","dalam_berita":[]}`)), false
	}
	return datatypes.JSON(raw), main != "" || len(list) > 0
}

func (s *Service) ensureNewsSourceForURL(rawURL, category string) (string, string, error) {
	normalized := baseSiteURL(rawURL)
	if normalized == "" {
		return "", "", fmt.Errorf("invalid source url")
	}

	noSlash := strings.TrimRight(normalized, "/")
	withSlash := noSlash + "/"

	var existing NewsSource
	q := s.db.Where("url = ?", normalized)
	if noSlash != "" && noSlash != normalized {
		q = q.Or("url = ?", noSlash)
	}
	if withSlash != normalized {
		q = q.Or("url = ?", withSlash)
	}
	if err := q.First(&existing).Error; err == nil {
		if existing.Category == "" && strings.TrimSpace(category) != "" {
			_ = s.db.Model(&NewsSource{}).Where("id = ?", existing.Id).Update("category", strings.TrimSpace(category)).Error
			existing.Category = strings.TrimSpace(category)
		}
		return existing.Id, existing.Category, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", "", err
	}

	u, err := url.Parse(normalized)
	if err != nil {
		return "", "", err
	}
	name := strings.TrimSpace(strings.ToLower(u.Host))
	if name == "" {
		name = "news-source-" + utils.CreateUUID()[:8]
	}

	var byName NewsSource
	if err := s.db.Where("name = ?", name).First(&byName).Error; err == nil {
		updates := map[string]interface{}{}
		if strings.TrimSpace(byName.URL) == "" {
			updates["url"] = normalized
			byName.URL = normalized
		}
		if strings.TrimSpace(byName.Category) == "" && strings.TrimSpace(category) != "" {
			updates["category"] = strings.TrimSpace(category)
			byName.Category = strings.TrimSpace(category)
		}
		if len(updates) > 0 {
			if err := s.db.Model(&NewsSource{}).Where("id = ?", byName.Id).Updates(updates).Error; err != nil {
				return "", "", err
			}
		}
		return byName.Id, byName.Category, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", "", err
	}

	ns := NewsSource{
		Id:       utils.CreateUUID(),
		Name:     name,
		URL:      normalized,
		Category: strings.TrimSpace(category),
	}
	if err := s.db.Create(&ns).Error; err != nil {
		return "", "", err
	}
	return ns.Id, ns.Category, nil
}

func (s *Service) newsSourceLookupByURL() (map[string]NewsSource, error) {
	var sources []NewsSource
	if err := s.db.Find(&sources).Error; err != nil {
		return nil, err
	}
	out := make(map[string]NewsSource, len(sources))
	for _, src := range sources {
		key := baseSiteURL(src.URL)
		if key != "" {
			out[key] = src
		}
	}
	return out, nil
}

func parsePythonNewsArticles(output []byte) ([]NewsScrapedArticle, error) {
	var rows []map[string]interface{}
	if err := json.Unmarshal(output, &rows); err != nil {
		return nil, err
	}

	out := make([]NewsScrapedArticle, 0, len(rows))
	for _, row := range rows {
		item := NewsScrapedArticle{
			Title:     strings.TrimSpace(firstString(row, "judul", "title")),
			Content:   sanitizeNewsContent(firstString(row, "isi", "content", "body")),
			CreatedAt: strings.TrimSpace(firstString(row, "created_at", "published_at", "date")),
			Source:    strings.TrimSpace(firstString(row, "sumber", "source")),
			URL:       strings.TrimSpace(firstString(row, "url", "link")),
			Category:  strings.TrimSpace(firstString(row, "category", "kategori")),
		}

		if v, ok := row["images"].(map[string]interface{}); ok {
			item.Images = NewsScrapedImages{
				Main: strings.TrimSpace(firstString(v, "foto_utama", "main", "thumbnail")),
				List: parseStringSlice(v["dalam_berita"]),
			}
		}
		if item.Images.Main == "" && len(item.Images.List) > 0 {
			item.Images.Main = item.Images.List[0]
		}

		if item.Title == "" || item.URL == "" {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

func sanitizeNewsContent(raw string) string {
	text := strings.TrimSpace(raw)
	if text == "" {
		return ""
	}

	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	lines := strings.Split(text, "\n")

	normalized := make([]string, 0, len(lines))
	lastEmpty := false
	for _, line := range lines {
		t := strings.TrimSpace(line)
		if t == "" {
			if !lastEmpty && len(normalized) > 0 {
				normalized = append(normalized, "")
				lastEmpty = true
			}
			continue
		}
		normalized = append(normalized, t)
		lastEmpty = false
	}

	for i := 0; i < 3 && len(normalized) > 0; i++ {
		if !looksLikeNewsBreadcrumbLine(normalized[0]) {
			break
		}
		normalized = normalized[1:]
	}

	return strings.TrimSpace(strings.Join(normalized, "\n"))
}

func looksLikeNewsBreadcrumbLine(line string) bool {
	t := strings.TrimSpace(strings.ToLower(line))
	if t == "" {
		return false
	}

	replacer := strings.NewReplacer(">", "/", "|", "/", "»", "/", "\\", "/", "•", "/", " - ", "/", ":", "/")
	t = replacer.Replace(t)
	partsRaw := strings.Split(t, "/")
	parts := make([]string, 0, len(partsRaw))
	for _, p := range partsRaw {
		p = strings.TrimSpace(strings.Trim(p, ".,-"))
		if p == "" {
			continue
		}
		parts = append(parts, p)
	}

	if len(parts) == 0 {
		return false
	}
	if parts[0] != "beranda" && parts[0] != "home" {
		return false
	}
	if len(parts) > 8 {
		return false
	}
	for _, p := range parts {
		if len([]rune(p)) > 40 {
			return false
		}
	}
	return true
}

func parseNewsTime(raw string) (time.Time, bool) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05-0700",
		"2006-01-02 15:04:05",
		time.RFC1123Z,
		time.RFC1123,
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, raw); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func normalizeNewsURL(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	u, err := url.Parse(s)
	if err != nil {
		return strings.TrimRight(strings.ToLower(s), "/")
	}
	u.Scheme = strings.ToLower(u.Scheme)
	u.Host = strings.ToLower(u.Host)
	u.Fragment = ""
	u.RawQuery = ""
	u.Path = strings.TrimRight(u.Path, "/")
	if u.Path == "" {
		u.Path = "/"
	}
	return u.String()
}

func baseSiteURL(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	u, err := url.Parse(s)
	if err != nil || strings.TrimSpace(u.Host) == "" {
		return s
	}
	scheme := strings.ToLower(strings.TrimSpace(u.Scheme))
	if scheme == "" {
		scheme = "https"
	}
	return scheme + "://" + strings.ToLower(strings.TrimSpace(u.Host)) + "/"
}

func hostFromURL(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	u, err := url.Parse(s)
	if err != nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(u.Host))
}

func isUniqueViolationError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "violates unique") ||
		strings.Contains(msg, "unique constraint")
}

func parseStringSlice(v interface{}) []string {
	switch t := v.(type) {
	case []interface{}:
		out := make([]string, 0, len(t))
		for _, raw := range t {
			if s, ok := raw.(string); ok {
				s = strings.TrimSpace(s)
				if s != "" {
					out = append(out, s)
				}
			}
		}
		return out
	case []string:
		out := make([]string, 0, len(t))
		for _, s := range t {
			s = strings.TrimSpace(s)
			if s != "" {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func validUUIDOrEmpty(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	if _, err := uuid.Parse(s); err != nil {
		return ""
	}
	return s
}

func stringPtr(s string) *string {
	v := s
	return &v
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
	if req.CommodityID != "" {
		if err := s.db.First(&c, "id = ?", req.CommodityID).Error; err != nil {
			return CommodityPrice{}, fmt.Errorf("commodity not found")
		}
	} else {
		name := strings.TrimSpace(req.CommodityName)
		if name == "" {
			return CommodityPrice{}, fmt.Errorf("commodity_name is required")
		}
		err := s.db.Where("name = ?", name).First(&c).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c = Commodity{Id: utils.CreateUUID(), Name: name, Unit: req.Unit}
			if c.Unit == "" {
				c.Unit = "unit"
			}
			if err := s.db.Create(&c).Error; err != nil {
				return CommodityPrice{}, err
			}
		} else if err != nil {
			return CommodityPrice{}, err
		}
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
	if price.CommodityID == "" {
		price.CommodityID = c.Id
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

// ScrapeFromSources uses active scrape_sources(type=prices) or provided urls.
func (s *Service) ScrapeFromSources(ctx context.Context, urls []string) ([]CommodityPrice, error) {
	if len(urls) == 0 {
		urls = s.defaultScrapeUrls("prices")
	}
	return s.scrapeViaPython(ctx, urls)
}

// call python script to scrape and return stored prices
func (s *Service) scrapeViaPython(ctx context.Context, urls []string) ([]CommodityPrice, error) {
	items, err := s.fetchScrapedItems(ctx, urls)
	if err != nil {
		return nil, err
	}

	collected := time.Now()
	result := make([]CommodityPrice, 0, len(items))
	for _, it := range items {
		if it.Name == "" {
			continue
		}

		var c Commodity
		err := s.db.Where("name = ?", it.Name).First(&c).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c = Commodity{Id: utils.CreateUUID(), Name: it.Name, Unit: it.Unit}
			_ = s.db.Create(&c).Error
		}

		cp := CommodityPrice{
			Id:          utils.CreateUUID(),
			CommodityID: c.Id,
			Price:       it.Price,
			CollectedAt: collected,
			SourceURL:   it.SourceURL,
		}
		if err := s.db.Create(&cp).Error; err == nil {
			cp.Commodity = &c
			result = append(result, cp)
		}
	}
	return result, nil
}

// fetchScrapedItems runs the python scraper and returns parsed rows without persisting.
func (s *Service) fetchScrapedItems(ctx context.Context, urls []string) ([]ScrapedItem, error) {
	if len(urls) == 0 {
		return nil, fmt.Errorf("no urls to scrape")
	}

	collected := time.Now()
	result := make([]ScrapedItem, 0)

	scriptPath := strings.TrimSpace(utils.GetEnv("SCRAPE_PANGAN_SCRIPT", "").(string))
	if scriptPath == "" {
		scriptPath = "python/songket-scraping/scrape_pangan_html.py"
	}
	resolvedScriptPath, err := resolvePythonScriptPath(scriptPath)
	if err != nil {
		return nil, fmt.Errorf("invalid SCRAPE_PANGAN_SCRIPT: %w", err)
	}

	pyRunner := strings.TrimSpace(utils.GetEnv("SCRAPE_PANGAN_PYTHON", "").(string))
	if pyRunner == "" {
		pyRunner = "python3"
	}
	if err := validatePythonRunner(pyRunner); err != nil {
		return nil, err
	}

	diagnostics := make([]scrapeURLDiagnostic, 0, len(urls))

	for _, rawURL := range urls {
		sourceURL := strings.TrimSpace(rawURL)
		if sourceURL == "" {
			continue
		}

		diag := scrapeURLDiagnostic{SourceURL: sourceURL}

		cmd := exec.CommandContext(ctx, pyRunner, resolvedScriptPath, sourceURL)
		output, err := cmd.CombinedOutput()
		if err != nil {
			msg := sanitizeLogValue(string(output), 400)
			if msg == "" {
				return nil, fmt.Errorf("python scrape error (%s): runner=%s script=%s: %w", sourceURL, pyRunner, resolvedScriptPath, err)
			}
			return nil, fmt.Errorf("python scrape error (%s): runner=%s script=%s: %w: %s", sourceURL, pyRunner, resolvedScriptPath, err, msg)
		}

		rows, payload, err := parsePythonScrapeRows(output)
		if err != nil {
			snippet := sanitizeLogValue(string(output), 400)
			if snippet == "" {
				return nil, fmt.Errorf("parse python output (%s): runner=%s script=%s: %w", sourceURL, pyRunner, resolvedScriptPath, err)
			}
			return nil, fmt.Errorf("parse python output (%s): runner=%s script=%s: %w; output=%s", sourceURL, pyRunner, resolvedScriptPath, err, snippet)
		}
		diag.ParsedRows = len(rows)
		diag.FoundContainer = payload.FoundContainer
		diag.DebugLinesCount = payload.DebugLinesCount
		diag.DebugReason = strings.TrimSpace(payload.DebugReason)
		diag.DebugSample = sanitizeLogValue(payload.DebugContainerSample, 120)
		diag.DebugAPIFallbackUsed = payload.DebugAPIFallbackUsed
		diag.DebugAPIRowsCount = payload.DebugAPIRowsCount
		diag.DebugAPIError = sanitizeLogValue(payload.DebugAPIError, 120)

		for _, m := range rows {
			name := strings.TrimSpace(firstString(m, "name", "nama", "komoditas", "commodity", "wilayah"))
			if !isLikelyCommodityName(name) {
				diag.RejectedInvalidName++
				continue
			}

			price := firstFloat(m, "price", "harga")
			if price <= 0 || price > 1000000 {
				diag.RejectedInvalidPrice++
				continue
			}

			unit := firstString(m, "unit", "satuan")
			source := firstString(m, "source_url", "url")
			if source == "" {
				source = sourceURL
			}

			result = append(result, ScrapedItem{
				Name:      name,
				Price:     price,
				Unit:      unit,
				SourceURL: source,
				ScrapedAt: collected,
				Raw:       m,
			})
			diag.AcceptedRows++
		}
		diagnostics = append(diagnostics, diag)
	}

	if len(result) == 0 {
		return nil, errors.New(buildNoValidCommodityMessage(pyRunner, resolvedScriptPath, diagnostics))
	}

	return result, nil
}

// ListCommodityPrices returns raw price rows with pagination.
func (s *Service) ListCommodityPrices(params filter.BaseParams) ([]CommodityPrice, int64, error) {
	query := s.db.Model(&CommodityPrice{}).
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

	var prices []CommodityPrice
	if err := query.
		Preload("Commodity").
		Order(fmt.Sprintf("%s %s", orderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&prices).Error; err != nil {
		return nil, 0, err
	}

	return prices, total, nil
}

// ListCommodities returns all commodities.
func (s *Service) ListCommodities() ([]Commodity, error) {
	var list []Commodity
	if err := s.db.Order("name ASC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// DeleteCommodityPrice removes a row.
func (s *Service) DeleteCommodityPrice(id string) error {
	return s.db.Delete(&CommodityPrice{}, "id = ?", id).Error
}

// StartScrapeJob persists a job and runs scraper in background.
func (s *Service) StartScrapeJob(urls []string, sourceType string) (ScrapeJob, error) {
	if len(urls) == 0 {
		urls = s.defaultScrapeUrls(sourceType)
	}
	if len(urls) == 0 {
		return ScrapeJob{}, fmt.Errorf("no urls to scrape")
	}
	raw, _ := json.Marshal(urls)
	job := ScrapeJob{
		Id:         utils.CreateUUID(),
		Status:     "pending",
		SourceUrls: raw,
	}
	if err := s.db.Create(&job).Error; err != nil {
		return ScrapeJob{}, err
	}

	go s.runScrapeJob(job.Id, urls)
	return job, nil
}

func (s *Service) runScrapeJob(jobId string, urls []string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	start := time.Now()
	_ = s.db.Model(&ScrapeJob{}).Where("id = ?", jobId).Updates(map[string]interface{}{
		"status":     "running",
		"started_at": start,
	})

	items, err := s.fetchScrapedItems(ctx, urls)
	if err != nil {
		_ = s.db.Model(&ScrapeJob{}).Where("id = ?", jobId).Updates(map[string]interface{}{
			"status":      "error",
			"message":     sanitizeLogValue(err.Error(), 1800),
			"finished_at": time.Now(),
		})
		return
	}

	for _, it := range items {
		raw, _ := json.Marshal(it.Raw)
		res := ScrapeResult{
			Id:            utils.CreateUUID(),
			JobID:         jobId,
			CommodityName: it.Name,
			Price:         it.Price,
			Unit:          it.Unit,
			SourceURL:     it.SourceURL,
			ScrapedAt:     it.ScrapedAt,
			Raw:           raw,
		}
		_ = s.db.Create(&res).Error
	}

	_ = s.db.Model(&ScrapeJob{}).Where("id = ?", jobId).Updates(map[string]interface{}{
		"status":      "success",
		"message":     fmt.Sprintf("found %d rows", len(items)),
		"finished_at": time.Now(),
	})
}

// ListScrapeJobs returns recent jobs with pagination.
func (s *Service) ListScrapeJobs(params filter.BaseParams) ([]ScrapeJob, int64, error) {
	query := s.db.Model(&ScrapeJob{})

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

	var jobs []ScrapeJob
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&jobs).Error; err != nil {
		return nil, 0, err
	}

	return jobs, total, nil
}

func (s *Service) ListScrapeResults(jobId string, params filter.BaseParams) ([]ScrapeResult, int64, error) {
	query := s.db.Model(&ScrapeResult{}).Where("job_id = ?", jobId)

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

	var res []ScrapeResult
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&res).Error; err != nil {
		return nil, 0, err
	}

	return res, total, nil
}

// ListScrapeSources returns configured scrape sources with pagination.
func (s *Service) ListScrapeSources(params filter.BaseParams) ([]ScrapeSource, int64, error) {
	query := s.db.Model(&ScrapeSource{})

	if v, ok := params.Filters["type"]; ok {
		query = query.Where("type = ?", v)
	}
	if v, ok := params.Filters["category"]; ok {
		query = query.Where("category = ?", v)
	}

	if params.Search != "" {
		search := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(url) LIKE ? OR LOWER(category) LIKE ?", search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var sources []ScrapeSource
	if err := query.
		Order(fmt.Sprintf("%s %s", params.OrderBy, params.OrderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Find(&sources).Error; err != nil {
		return nil, 0, err
	}

	return sources, total, nil
}

// Import selected scrape results into commodity_prices (and commodities).
func (s *Service) CommitScrapeResults(jobId string, resultIds []string) ([]CommodityPrice, error) {
	if len(resultIds) == 0 {
		return nil, fmt.Errorf("result_ids is required")
	}
	var rows []ScrapeResult
	if err := s.db.Where("job_id = ? AND id IN ?", jobId, resultIds).Find(&rows).Error; err != nil {
		return nil, err
	}
	collected := time.Now()
	saved := make([]CommodityPrice, 0, len(rows))

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, r := range rows {
			if r.CommodityName == "" {
				continue
			}
			var c Commodity
			err := tx.Where("name = ?", r.CommodityName).First(&c).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c = Commodity{Id: utils.CreateUUID(), Name: r.CommodityName, Unit: r.Unit}
				if err := tx.Create(&c).Error; err != nil {
					return err
				}
			} else if err != nil {
				return err
			}

			cp := CommodityPrice{
				Id:          utils.CreateUUID(),
				CommodityID: c.Id,
				Price:       r.Price,
				CollectedAt: collected,
				SourceURL:   r.SourceURL,
			}
			if err := tx.Create(&cp).Error; err != nil {
				return err
			}
			cp.Commodity = &c
			saved = append(saved, cp)
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return saved, nil
}

// defaultScrapeUrls returns active scrape_source urls filtered by type, or env fallback.
func (s *Service) defaultScrapeUrls(sourceType string) []string {
	urls := []string{}
	if sourceType == "" {
		sourceType = "prices"
	}
	var sources []ScrapeSource
	if err := s.db.Where("is_active = ? AND type = ?", true, sourceType).Find(&sources).Error; err == nil {
		for _, src := range sources {
			urls = append(urls, src.URL)
		}
	}
	if len(urls) > 0 {
		return urls
	}
	envKey := "SCRAPE_PANGAN_URL"
	if sourceType == "news" {
		envKey = "SCRAPE_NEWS_URL"
	}
	if def := utils.GetEnv(envKey, "").(string); def != "" {
		urls = append(urls, def)
	}
	return urls
}

func resolvePythonScriptPath(scriptPath string) (string, error) {
	path := strings.TrimSpace(scriptPath)
	if path == "" {
		return "", fmt.Errorf("script path is empty")
	}

	if info, err := os.Stat(path); err == nil {
		if info.IsDir() {
			return "", fmt.Errorf("script path is a directory: %s", path)
		}
		return path, nil
	}

	if filepath.IsAbs(path) {
		return "", fmt.Errorf("script file not found: %s", path)
	}

	executablePath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("script file not found: %s", path)
	}

	absoluteCandidate := filepath.Join(filepath.Dir(executablePath), path)
	info, err := os.Stat(absoluteCandidate)
	if err != nil {
		return "", fmt.Errorf("script file not found: %s (also tried %s)", path, absoluteCandidate)
	}
	if info.IsDir() {
		return "", fmt.Errorf("script path is a directory: %s", absoluteCandidate)
	}
	return absoluteCandidate, nil
}

func validatePythonRunner(pyRunner string) error {
	runner := strings.TrimSpace(pyRunner)
	if runner == "" {
		return fmt.Errorf("SCRAPE_PANGAN_PYTHON is empty")
	}

	if strings.ContainsRune(runner, '/') {
		info, err := os.Stat(runner)
		if err != nil {
			return fmt.Errorf("python runner not found at %s: %w", runner, err)
		}
		if info.IsDir() {
			return fmt.Errorf("python runner is a directory: %s", runner)
		}
		return nil
	}

	resolved, err := exec.LookPath(runner)
	if err != nil {
		return fmt.Errorf("python runner %q not found in PATH", runner)
	}
	if _, err := os.Stat(resolved); err != nil {
		return fmt.Errorf("python runner %q is not accessible: %w", resolved, err)
	}
	return nil
}

func sanitizeLogValue(raw string, limit int) string {
	val := strings.TrimSpace(raw)
	if val == "" {
		return ""
	}
	val = strings.Join(strings.Fields(val), " ")
	if limit <= 0 || len(val) <= limit {
		return val
	}
	if limit <= 3 {
		return val[:limit]
	}
	return val[:limit-3] + "..."
}

func buildNoValidCommodityMessage(pyRunner, scriptPath string, diagnostics []scrapeURLDiagnostic) string {
	parts := []string{
		fmt.Sprintf("no valid commodity rows found (runner=%s script=%s)", pyRunner, scriptPath),
	}

	if wd, err := os.Getwd(); err == nil {
		parts = append(parts, fmt.Sprintf("cwd=%s", wd))
	}

	if len(diagnostics) == 0 {
		parts = append(parts, "no scrape diagnostics captured")
		return sanitizeLogValue(strings.Join(parts, "; "), 900)
	}

	urlDetails := make([]string, 0, len(diagnostics))
	for _, diag := range diagnostics {
		chunks := []string{
			fmt.Sprintf("url=%s", diag.SourceURL),
			fmt.Sprintf("rows=%d", diag.ParsedRows),
			fmt.Sprintf("accepted=%d", diag.AcceptedRows),
			fmt.Sprintf("reject_name=%d", diag.RejectedInvalidName),
			fmt.Sprintf("reject_price=%d", diag.RejectedInvalidPrice),
		}
		if diag.FoundContainer != nil {
			chunks = append(chunks, fmt.Sprintf("found_container=%t", *diag.FoundContainer))
		}
		if diag.DebugLinesCount != nil {
			chunks = append(chunks, fmt.Sprintf("lines=%d", *diag.DebugLinesCount))
		}
		if diag.DebugReason != "" {
			chunks = append(chunks, fmt.Sprintf("reason=%s", sanitizeLogValue(diag.DebugReason, 80)))
		}
		if diag.DebugSample != "" {
			chunks = append(chunks, fmt.Sprintf("sample=%s", sanitizeLogValue(diag.DebugSample, 80)))
		}
		if diag.DebugAPIFallbackUsed != nil {
			chunks = append(chunks, fmt.Sprintf("api_fallback=%t", *diag.DebugAPIFallbackUsed))
		}
		if diag.DebugAPIRowsCount != nil {
			chunks = append(chunks, fmt.Sprintf("api_rows=%d", *diag.DebugAPIRowsCount))
		}
		if diag.DebugAPIError != "" {
			chunks = append(chunks, fmt.Sprintf("api_error=%s", sanitizeLogValue(diag.DebugAPIError, 80)))
		}
		urlDetails = append(urlDetails, strings.Join(chunks, " "))
	}

	parts = append(parts, "details="+strings.Join(urlDetails, " | "))
	return sanitizeLogValue(strings.Join(parts, "; "), 1800)
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

func parsePythonScrapeRows(output []byte) ([]map[string]interface{}, panganScrapePayload, error) {
	var payload panganScrapePayload
	if err := json.Unmarshal(output, &payload); err == nil && payload.Rows != nil {
		return payload.Rows, payload, nil
	}

	var rows []map[string]interface{}
	if err := json.Unmarshal(output, &rows); err == nil {
		payload.Rows = rows
		return rows, payload, nil
	}

	if err := json.Unmarshal(output, &payload); err != nil {
		return nil, payload, err
	}
	return payload.Rows, payload, nil
}

func isLikelyCommodityName(name string) bool {
	n := strings.TrimSpace(name)
	if n == "" || len(n) < 3 || len(n) > 80 {
		return false
	}
	if strings.Contains(n, "\t") {
		return false
	}

	lower := strings.ToLower(n)
	reject := []string{
		"beranda",
		"regulasi",
		"profil",
		"peta status harga pangan",
		"grafik perkembangan harga pangan",
		"informasi harga pangan",
		"jenis data panel",
		"pilih wilayah",
		"tampilkan",
		"harga rata-rata komoditas",
		"hari ini",
		"harga dibandingkan",
		"peta harga nasional",
		"periode",
		"intervensi",
		"het",
		"provinsi",
		"zona",
	}
	for _, kw := range reject {
		if strings.Contains(lower, kw) {
			return false
		}
	}

	return true
}

// stripTags removes HTML tags (very basic).
func stripTags(s string) string {
	var b strings.Builder
	inTag := false
	for _, r := range s {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			b.WriteRune(r)
		}
	}
	return strings.TrimSpace(b.String())
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

func normalizeAreaNetIncome(areas []NetIncomeAreaRequest) []NetIncomeAreaItem {
	if len(areas) == 0 {
		return []NetIncomeAreaItem{}
	}

	normalized := make([]NetIncomeAreaItem, 0, len(areas))
	for _, area := range areas {
		normalized = append(normalized, NetIncomeAreaItem{
			ProvinceCode: strings.TrimSpace(area.ProvinceCode),
			ProvinceName: strings.TrimSpace(area.ProvinceName),
			RegencyCode:  strings.TrimSpace(area.RegencyCode),
			RegencyName:  strings.TrimSpace(area.RegencyName),
		})
	}
	return normalizeAreaNetIncomeItems(normalized)
}

func normalizeAreaNetIncomeItems(areas []NetIncomeAreaItem) []NetIncomeAreaItem {
	if len(areas) == 0 {
		return []NetIncomeAreaItem{}
	}

	seen := make(map[string]struct{}, len(areas))
	out := make([]NetIncomeAreaItem, 0, len(areas))
	for _, area := range areas {
		item := NetIncomeAreaItem{
			ProvinceCode: strings.TrimSpace(area.ProvinceCode),
			ProvinceName: strings.TrimSpace(area.ProvinceName),
			RegencyCode:  strings.TrimSpace(area.RegencyCode),
			RegencyName:  strings.TrimSpace(area.RegencyName),
		}
		if item.ProvinceCode == "" && item.ProvinceName == "" && item.RegencyCode == "" && item.RegencyName == "" {
			continue
		}
		if item.ProvinceName == "" {
			item.ProvinceName = item.ProvinceCode
		}
		if item.RegencyName == "" {
			item.RegencyName = item.RegencyCode
		}
		if item.ProvinceCode == "" || item.RegencyCode == "" {
			// keep legacy entries readable, but new writes always require codes from request validation
			if item.RegencyName == "" {
				continue
			}
		}

		key := strings.ToLower(strings.Join([]string{
			item.ProvinceCode,
			item.ProvinceName,
			item.RegencyCode,
			item.RegencyName,
		}, "|"))
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, item)
	}
	return out
}

func encodeAreaNetIncome(areas []NetIncomeAreaItem) datatypes.JSON {
	clean := normalizeAreaNetIncomeItems(areas)
	if len(clean) == 0 {
		return datatypes.JSON([]byte("[]"))
	}
	b, err := json.Marshal(clean)
	if err != nil {
		return datatypes.JSON([]byte("[]"))
	}
	return datatypes.JSON(b)
}

func decodeAreaNetIncome(raw datatypes.JSON) []NetIncomeAreaItem {
	if len(raw) == 0 {
		return []NetIncomeAreaItem{}
	}

	var areas []NetIncomeAreaItem
	if err := json.Unmarshal(raw, &areas); err == nil {
		return normalizeAreaNetIncomeItems(areas)
	}

	// Backward compatibility for old payload shape: []string
	var legacy []string
	if err := json.Unmarshal(raw, &legacy); err == nil {
		mapped := make([]NetIncomeAreaItem, 0, len(legacy))
		for _, item := range legacy {
			val := strings.TrimSpace(item)
			if val == "" {
				continue
			}
			mapped = append(mapped, NetIncomeAreaItem{
				ProvinceCode: "",
				ProvinceName: "",
				RegencyCode:  val,
				RegencyName:  val,
			})
		}
		return normalizeAreaNetIncomeItems(mapped)
	}

	return []NetIncomeAreaItem{}
}

// Lookups for dropdowns
func (s *Service) Lookups() (map[string]interface{}, error) {
	var fcs []FinanceCompany
	var motors []MotorType
	var installments []Installment
	var jobs []Job
	var dealers []Dealer

	if err := s.db.Find(&fcs).Error; err != nil {
		return nil, err
	}
	if err := s.db.Find(&motors).Error; err != nil {
		return nil, err
	}
	if err := s.db.Preload("MotorType").Find(&installments).Error; err != nil {
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
		"installments":      installments,
		"jobs":              jobs,
		"dealers":           dealers,
		"regencies":         regencies,
	}, nil
}
