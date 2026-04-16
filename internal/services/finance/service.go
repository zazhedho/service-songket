package servicefinance

import (
	"fmt"
	"log"
	"sort"
	"strings"

	domainfinance "service-songket/internal/domain/finance"
	domainfinancecompany "service-songket/internal/domain/financecompany"
	domainorder "service-songket/internal/domain/order"
	interfacefinance "service-songket/internal/interfaces/finance"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewFinanceService(db *gorm.DB) interfacefinance.ServiceFinanceInterface {
	return &Service{db: db}
}

func (s *Service) DealerMetrics(dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (map[string]interface{}, error) {
	baseOrders := func(tx *gorm.DB) *gorm.DB {
		q := tx.Model(&domainorder.Order{}).Where("dealer_id = ?", dealerID)
		if !dateRange.From.IsZero() {
			q = q.Where("pooling_at >= ?", dateRange.From)
		}
		if !dateRange.To.IsZero() {
			q = q.Where("pooling_at <= ?", dateRange.To)
		}
		return q
	}

	qOrders := baseOrders(s.db)
	var totalOrders int64
	if err := qOrders.Count(&totalOrders).Error; err != nil {
		return nil, err
	}

	var leadSeconds *float64
	if err := qOrders.Select("avg(extract(epoch from result_at - pooling_at))").Where("result_at IS NOT NULL").Scan(&leadSeconds).Error; err != nil {
		return nil, err
	}

	qApprove := s.db.Model(&domainorder.OrderFinanceAttempt{}).
		Joins("JOIN orders o ON o.id = order_finance_attempts.order_id").
		Where("o.dealer_id = ?", dealerID).
		Where("order_finance_attempts.status = ?", "approve")
	if financeCompanyID != nil && *financeCompanyID != "" {
		qApprove = qApprove.Where("order_finance_attempts.finance_company_id = ?", *financeCompanyID)
	}
	if !dateRange.From.IsZero() {
		qApprove = qApprove.Where("o.pooling_at >= ?", dateRange.From)
	}
	if !dateRange.To.IsZero() {
		qApprove = qApprove.Where("o.pooling_at <= ?", dateRange.To)
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

	qRescue := s.db.Model(&domainorder.Order{}).
		Joins("JOIN order_finance_attempts a1 ON a1.order_id = orders.id AND a1.attempt_no = 1").
		Joins("JOIN order_finance_attempts a2 ON a2.order_id = orders.id AND a2.attempt_no = 2").
		Where("orders.dealer_id = ?", dealerID).
		Where("a1.status = ?", "reject").
		Where("a2.status = ?", "approve")
	if financeCompanyID != nil && *financeCompanyID != "" {
		qRescue = qRescue.Where("a2.finance_company_id = ?", *financeCompanyID)
	}
	if !dateRange.From.IsZero() {
		qRescue = qRescue.Where("orders.pooling_at >= ?", dateRange.From)
	}
	if !dateRange.To.IsZero() {
		qRescue = qRescue.Where("orders.pooling_at <= ?", dateRange.To)
	}
	var rescued int64
	if err := qRescue.Count(&rescued).Error; err != nil {
		return nil, err
	}

	var financeCompanies []domainfinancecompany.FinanceCompany
	if err := s.db.Find(&financeCompanies).Error; err != nil {
		return nil, err
	}

	type fcMetric struct {
		FinanceCompanyID   string   `json:"finance_company_id"`
		FinanceCompanyName string   `json:"finance_company_name"`
		TotalOrders        int64    `json:"total_orders"`
		ApprovedCount      int64    `json:"approved_count"`
		RejectedCount      int64    `json:"rejected_count"`
		LeadTimeSecondsAvg *float64 `json:"lead_time_seconds_avg"`
		ApprovalRate       float64  `json:"approval_rate"`
		RescueApprovedFc2  int64    `json:"rescue_approved_fc2"`
	}
	fcMetrics := make([]fcMetric, 0, len(financeCompanies))

	type financeApprovalGrouping struct {
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
			q := s.db.Model(&domainorder.OrderFinanceAttempt{}).
				Joins("JOIN orders o ON o.id = order_finance_attempts.order_id").
				Where("o.dealer_id = ?", dealerID).
				Where("order_finance_attempts.attempt_no = ?", 1).
				Where("order_finance_attempts.finance_company_id = ?", fc.Id)
			if !dateRange.From.IsZero() {
				q = q.Where("o.pooling_at >= ?", dateRange.From)
			}
			if !dateRange.To.IsZero() {
				q = q.Where("o.pooling_at <= ?", dateRange.To)
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

		qRescueFc := s.db.Model(&domainorder.Order{}).
			Joins("JOIN order_finance_attempts a1 ON a1.order_id = orders.id AND a1.attempt_no = 1").
			Joins("JOIN order_finance_attempts a2 ON a2.order_id = orders.id AND a2.attempt_no = 2").
			Where("orders.dealer_id = ?", dealerID).
			Where("a1.status = ?", "reject").
			Where("a2.status = ?", "approve").
			Where("a2.finance_company_id = ?", fc.Id)
		if !dateRange.From.IsZero() {
			qRescueFc = qRescueFc.Where("orders.pooling_at >= ?", dateRange.From)
		}
		if !dateRange.To.IsZero() {
			qRescueFc = qRescueFc.Where("orders.pooling_at <= ?", dateRange.To)
		}
		var fcRescued int64
		if err := qRescueFc.Count(&fcRescued).Error; err != nil {
			return nil, err
		}

		fcMetrics = append(fcMetrics, fcMetric{
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

	type financeApprovalGroupingRaw struct {
		FinanceCompanyID   string `json:"finance_company_id"`
		FinanceCompanyName string `json:"finance_company_name"`
		Status             string `json:"status"`
		TotalData          int64  `json:"total_data"`
	}

	groupingBase := s.db.Model(&domainorder.OrderFinanceAttempt{}).
		Joins("JOIN orders o ON o.id = order_finance_attempts.order_id").
		Joins("JOIN order_finance_attempts a1 ON a1.order_id = order_finance_attempts.order_id AND a1.attempt_no = 1").
		Joins("LEFT JOIN finance_companies fc ON fc.id = order_finance_attempts.finance_company_id").
		Where("o.dealer_id = ?", dealerID).
		Where("order_finance_attempts.attempt_no = ?", 2).
		Where("a1.status = ?", "reject").
		Where("LOWER(order_finance_attempts.status) IN ?", []string{"approve", "reject"})

	if financeCompanyID != nil && *financeCompanyID != "" {
		groupingBase = groupingBase.Where("order_finance_attempts.finance_company_id = ?", *financeCompanyID)
	}
	if !dateRange.From.IsZero() {
		groupingBase = groupingBase.Where("o.pooling_at >= ?", dateRange.From)
	}
	if !dateRange.To.IsZero() {
		groupingBase = groupingBase.Where("o.pooling_at <= ?", dateRange.To)
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

	financeApprovalGroupings := make([]financeApprovalGrouping, 0, len(groupingRaw))
	for _, row := range groupingRaw {
		financeID := strings.TrimSpace(row.FinanceCompanyID)
		total := totalByFinance[financeID]
		rate := 0.0
		if total > 0 {
			rate = float64(row.TotalData) / float64(total)
		}
		financeApprovalGroupings = append(financeApprovalGroupings, financeApprovalGrouping{
			FinanceCompanyID:   row.FinanceCompanyID,
			FinanceCompanyName: row.FinanceCompanyName,
			Status:             strings.ToLower(strings.TrimSpace(row.Status)),
			TotalData:          row.TotalData,
			ApprovalRate:       rate,
		})
	}

	statusOrder := map[string]int{"approve": 1, "reject": 2}
	sort.Slice(financeApprovalGroupings, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(financeApprovalGroupings[i].FinanceCompanyName))
		right := strings.ToLower(strings.TrimSpace(financeApprovalGroupings[j].FinanceCompanyName))
		if left != right {
			return left < right
		}
		leftStatus := strings.ToLower(strings.TrimSpace(financeApprovalGroupings[i].Status))
		rightStatus := strings.ToLower(strings.TrimSpace(financeApprovalGroupings[j].Status))
		return statusOrder[leftStatus] < statusOrder[rightStatus]
	})

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
		Where("o.dealer_id = ?", dealerID).
		Where("a2.attempt_no = ?", 2).
		Where("LOWER(a1.status) = ?", "reject").
		Where("LOWER(a2.status) IN ?", []string{"approve", "reject"})

	if financeCompanyID != nil && *financeCompanyID != "" {
		transitionBase = transitionBase.Where("a2.finance_company_id = ?", *financeCompanyID)
	}
	if !dateRange.From.IsZero() {
		transitionBase = transitionBase.Where("o.pooling_at >= ?", dateRange.From)
	}
	if !dateRange.To.IsZero() {
		transitionBase = transitionBase.Where("o.pooling_at <= ?", dateRange.To)
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
		Where("o1.dealer_id = ?", dealerID).
		Where("o2.dealer_id = o1.dealer_id").
		Where("LOWER(o1.result_status) = ?", "reject").
		Where("LOWER(o2.result_status) IN ?", []string{"approve", "reject"}).
		Where("o1.created_at <= o2.created_at").
		Where("NOT EXISTS (SELECT 1 FROM order_finance_attempts a2x WHERE a2x.order_id = o1.id AND a2x.attempt_no = 2)")
	if financeCompanyID != nil && *financeCompanyID != "" {
		fallbackTransitionBase = fallbackTransitionBase.Where("a2f.finance_company_id = ?", *financeCompanyID)
	}
	if !dateRange.From.IsZero() {
		fallbackTransitionBase = fallbackTransitionBase.Where("o1.pooling_at >= ?", dateRange.From)
	}
	if !dateRange.To.IsZero() {
		fallbackTransitionBase = fallbackTransitionBase.Where("o1.pooling_at <= ?", dateRange.To)
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
		addTransitionAggregate(row.Finance1CompanyID, row.Finance1CompanyName, row.Finance2CompanyID, row.Finance2CompanyName, row.TotalData, row.ApprovedCount, row.RejectedCount)
	}
	for _, row := range transitionFallbackRaw {
		addTransitionAggregate(row.Finance1CompanyID, row.Finance1CompanyName, row.Finance2CompanyID, row.Finance2CompanyName, row.TotalData, row.ApprovedCount, row.RejectedCount)
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
		"finance_approval_grouping":    financeApprovalGroupings,
		"finance_approval_transitions": financeApprovalTransitions,
		"date_from":                    dateRange.From,
		"date_to":                      dateRange.To,
		"finance_company_filter":       financeCompanyID,
		"finance_companies":            fcMetrics,
	}, nil
}

func (s *Service) ListMigrationReport(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	query := s.db.
		Table("orders o").
		Joins(`
			JOIN LATERAL (
				SELECT
					a.order_id,
					a.finance_company_id,
					LOWER(a.status) AS status,
					a.notes,
					a.created_at
				FROM order_finance_attempts a
				WHERE a.order_id = o.id AND a.attempt_no = 1
				ORDER BY a.created_at DESC, a.id DESC
				LIMIT 1
			) a1 ON TRUE
		`).
		Joins(`
			LEFT JOIN LATERAL (
				SELECT
					a.order_id,
					a.finance_company_id,
					LOWER(a.status) AS status,
					a.notes,
					a.created_at
				FROM order_finance_attempts a
				WHERE a.order_id = o.id AND a.attempt_no = 2
				ORDER BY a.created_at DESC, a.id DESC
				LIMIT 1
			) a2 ON TRUE
		`).
		Joins(`
			LEFT JOIN LATERAL (
				SELECT
					o2.id AS order_id,
					o2.result_status,
					o2.result_notes,
					o2.created_at
				FROM orders o2
				WHERE o2.deleted_at IS NULL
					AND o2.pooling_number = o.pooling_number
					AND o2.dealer_id = o.dealer_id
					AND o2.id <> o.id
				ORDER BY o2.created_at ASC, o2.id ASC
				LIMIT 1
			) o2 ON TRUE
		`).
		Joins(`
			LEFT JOIN LATERAL (
				SELECT
					a.order_id,
					a.finance_company_id,
					LOWER(a.status) AS status,
					a.notes,
					a.created_at
				FROM order_finance_attempts a
				WHERE a.order_id = o2.order_id AND a.attempt_no = 1
				ORDER BY a.created_at DESC, a.id DESC
				LIMIT 1
			) o2a1 ON TRUE
		`).
		Joins("LEFT JOIN dealers d ON d.id = o.dealer_id AND d.deleted_at IS NULL").
		Joins("LEFT JOIN jobs j ON j.id = o.job_id AND j.deleted_at IS NULL").
		Joins("LEFT JOIN job_net_incomes jni ON jni.job_id = o.job_id AND jni.deleted_at IS NULL").
		Joins("LEFT JOIN motor_types mt ON mt.id = o.motor_type_id AND mt.deleted_at IS NULL").
		Joins(`
			LEFT JOIN LATERAL (
				SELECT i.amount
				FROM installments i
				WHERE i.deleted_at IS NULL
					AND i.motor_type_id = o.motor_type_id
				ORDER BY i.updated_at DESC, i.created_at DESC
				LIMIT 1
			) inst ON TRUE
		`).
		Joins("LEFT JOIN finance_companies fc1 ON fc1.id = a1.finance_company_id AND fc1.deleted_at IS NULL").
		Joins("LEFT JOIN finance_companies fc2 ON fc2.id = a2.finance_company_id AND fc2.deleted_at IS NULL").
		Joins("LEFT JOIN finance_companies fc2_clone ON fc2_clone.id = o2a1.finance_company_id AND fc2_clone.deleted_at IS NULL").
		Where("o.deleted_at IS NULL").
		Where("a1.status = ?", "reject").
		Where("(a2.finance_company_id IS NOT NULL OR o2a1.finance_company_id IS NOT NULL)").
		Where(`
			NOT EXISTS (
				SELECT 1
				FROM orders prev
				WHERE prev.deleted_at IS NULL
					AND prev.pooling_number = o.pooling_number
					AND prev.dealer_id = o.dealer_id
					AND prev.id <> o.id
					AND (
						prev.created_at < o.created_at
						OR (prev.created_at = o.created_at AND prev.id < o.id)
					)
			)
		`)

	if month > 0 {
		query = query.Where("EXTRACT(MONTH FROM o.pooling_at) = ?", month)
	}
	if year > 0 {
		query = query.Where("EXTRACT(YEAR FROM o.pooling_at) = ?", year)
	}
	if v, ok := params.Filters["order_id"]; ok {
		orderID := strings.TrimSpace(fmt.Sprint(v))
		if orderID != "" {
			query = query.Where("o.id = ?", orderID)
		}
	}
	if v, ok := params.Filters["dealer_id"]; ok {
		dealerID := strings.TrimSpace(fmt.Sprint(v))
		if dealerID != "" {
			query = query.Where("o.dealer_id = ?", dealerID)
		}
	}
	if v, ok := params.Filters["finance_1_company_id"]; ok {
		finance1ID := strings.TrimSpace(fmt.Sprint(v))
		if finance1ID != "" {
			query = query.Where("a1.finance_company_id = ?", finance1ID)
		}
	}
	if v, ok := params.Filters["finance_2_company_id"]; ok {
		finance2ID := strings.TrimSpace(fmt.Sprint(v))
		if finance2ID != "" {
			query = query.Where("COALESCE(a2.finance_company_id, o2a1.finance_company_id) = ?", finance2ID)
		}
	}
	if strings.TrimSpace(params.Search) != "" {
		search := "%" + strings.ToLower(strings.TrimSpace(params.Search)) + "%"
		query = query.Where(`
			LOWER(o.pooling_number) LIKE ?
			OR LOWER(o.consumer_name) LIKE ?
			OR LOWER(o.consumer_phone) LIKE ?
			OR LOWER(d.name) LIKE ?
			OR LOWER(fc1.name) LIKE ?
			OR LOWER(fc2.name) LIKE ?
			OR LOWER(fc2_clone.name) LIKE ?
			OR LOWER(mt.name) LIKE ?
		`, search, search, search, search, search, search, search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderByMap := map[string]string{
		"pooling_at":      "o.pooling_at",
		"dealer_name":     "d.name",
		"consumer_name":   "o.consumer_name",
		"finance_1_name":  "fc1.name",
		"finance_2_name":  "COALESCE(fc2.name, fc2_clone.name)",
		"created_at":      "o.created_at",
		"updated_at":      "o.updated_at",
		"finance_2_notes": "COALESCE(NULLIF(a2.notes, ''), NULLIF(o2a1.notes, ''), NULLIF(o2.result_notes, ''))",
	}
	orderColumn, ok := orderByMap[strings.TrimSpace(params.OrderBy)]
	if !ok || orderColumn == "" {
		orderColumn = "o.pooling_at"
	}
	orderDirection := strings.ToUpper(strings.TrimSpace(params.OrderDirection))
	if orderDirection != "ASC" {
		orderDirection = "DESC"
	}

	rows := make([]domainfinance.FinanceMigrationReportItem, 0, params.Limit)
	if err := query.
		Select(`
				o.id AS order_id,
				o.pooling_number AS pooling_number,
				o.pooling_at AS pooling_at,
				o.result_at AS result_at,
			(
				SELECT COUNT(1)
				FROM orders od
				WHERE od.deleted_at IS NULL
					AND od.dealer_id = o.dealer_id
						AND (? = 0 OR EXTRACT(MONTH FROM od.pooling_at) = ?)
						AND (? = 0 OR EXTRACT(YEAR FROM od.pooling_at) = ?)
				) AS dealer_order_total,
				COUNT(1) OVER (
					PARTITION BY o.dealer_id, a1.finance_company_id, COALESCE(a2.finance_company_id, o2a1.finance_company_id)
				) AS transition_total_data,
				COALESCE(d.name, '-') AS dealer_name,
			COALESCE(d.province, '-') AS dealer_province,
			COALESCE(d.regency, '-') AS dealer_regency,
			COALESCE(d.district, '-') AS dealer_district,
			COALESCE(d.village, '-') AS dealer_village,
			COALESCE(d.address, '-') AS dealer_address,
			COALESCE(o.consumer_name, '-') AS consumer_name,
			COALESCE(o.consumer_phone, '-') AS consumer_phone,
			COALESCE(o.province, '-') AS province,
			COALESCE(o.regency, '-') AS regency,
			COALESCE(o.district, '-') AS district,
			COALESCE(o.village, '-') AS village,
			COALESCE(o.address, '-') AS address,
			COALESCE(j.name, '-') AS job_name,
			COALESCE(jni.net_income, 0) AS net_income,
			COALESCE(mt.name, '-') AS motor_type_name,
			COALESCE(inst.amount, 0) AS installment_amount,
			COALESCE(o.otr, 0) AS otr,
			COALESCE(o.dp_gross, 0) AS dp_gross,
			COALESCE(o.dp_paid, 0) AS dp_paid,
			COALESCE(o.dp_pct, 0) AS dp_pct,
			COALESCE(o.tenor, 0) AS tenor,
			COALESCE(o.result_status, '-') AS order_result_status,
			COALESCE(o.result_notes, '') AS order_result_notes,
			COALESCE(fc1.name, '-') AS finance_1_name,
			COALESCE(a1.status, '-') AS finance_1_status,
			COALESCE(a1.notes, '') AS finance_1_notes,
			COALESCE(fc2.name, fc2_clone.name, '-') AS finance_2_name,
			COALESCE(NULLIF(a2.status, ''), NULLIF(o2a1.status, ''), LOWER(NULLIF(o2.result_status, '')), '-') AS finance_2_status,
			COALESCE(NULLIF(a2.notes, ''), NULLIF(o2a1.notes, ''), NULLIF(o2.result_notes, ''), '') AS finance_2_notes,
			o.created_at AS order_created_at,
			o.updated_at AS order_updated_at,
			a1.created_at AS finance_1_decision_at,
			COALESCE(a2.created_at, o2a1.created_at, o2.created_at, o.updated_at) AS finance_2_decision_at
		`, month, month, year, year).
		Order(fmt.Sprintf("%s %s", orderColumn, orderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	return rows, total, nil
}

func (s *Service) ListMigrationReportGroupedByFinance2(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	baseQuery := s.db.
		Table("orders o").
		Joins(`
			JOIN LATERAL (
				SELECT
					a.order_id,
					a.finance_company_id,
					LOWER(a.status) AS status,
					a.notes,
					a.created_at
				FROM order_finance_attempts a
				WHERE a.order_id = o.id AND a.attempt_no = 1
				ORDER BY a.created_at DESC, a.id DESC
				LIMIT 1
			) a1 ON TRUE
		`).
		Joins(`
			LEFT JOIN LATERAL (
				SELECT
					a.order_id,
					a.finance_company_id,
					LOWER(a.status) AS status,
					a.notes,
					a.created_at
				FROM order_finance_attempts a
				WHERE a.order_id = o.id AND a.attempt_no = 2
				ORDER BY a.created_at DESC, a.id DESC
				LIMIT 1
			) a2 ON TRUE
		`).
		Joins(`
			LEFT JOIN LATERAL (
				SELECT
					o2.id AS order_id,
					o2.result_status,
					o2.result_notes,
					o2.created_at
				FROM orders o2
				WHERE o2.deleted_at IS NULL
					AND o2.pooling_number = o.pooling_number
					AND o2.dealer_id = o.dealer_id
					AND o2.id <> o.id
				ORDER BY o2.created_at ASC, o2.id ASC
				LIMIT 1
			) o2 ON TRUE
		`).
		Joins(`
			LEFT JOIN LATERAL (
				SELECT
					a.order_id,
					a.finance_company_id,
					LOWER(a.status) AS status,
					a.notes,
					a.created_at
				FROM order_finance_attempts a
				WHERE a.order_id = o2.order_id AND a.attempt_no = 1
				ORDER BY a.created_at DESC, a.id DESC
				LIMIT 1
			) o2a1 ON TRUE
		`).
		Joins("LEFT JOIN dealers d ON d.id = o.dealer_id AND d.deleted_at IS NULL").
		Joins("LEFT JOIN jobs j ON j.id = o.job_id AND j.deleted_at IS NULL").
		Joins("LEFT JOIN motor_types mt ON mt.id = o.motor_type_id AND mt.deleted_at IS NULL").
		Joins("LEFT JOIN finance_companies fc1 ON fc1.id = a1.finance_company_id AND fc1.deleted_at IS NULL").
		Joins("LEFT JOIN finance_companies fc2 ON fc2.id = a2.finance_company_id AND fc2.deleted_at IS NULL").
		Joins("LEFT JOIN finance_companies fc2_clone ON fc2_clone.id = o2a1.finance_company_id AND fc2_clone.deleted_at IS NULL").
		Where("o.deleted_at IS NULL").
		Where("a1.status = ?", "reject").
		Where("(a2.finance_company_id IS NOT NULL OR o2a1.finance_company_id IS NOT NULL)").
		Where(`
			NOT EXISTS (
				SELECT 1
				FROM orders prev
				WHERE prev.deleted_at IS NULL
					AND prev.pooling_number = o.pooling_number
					AND prev.dealer_id = o.dealer_id
					AND prev.id <> o.id
					AND (
						prev.created_at < o.created_at
						OR (prev.created_at = o.created_at AND prev.id < o.id)
					)
			)
		`)

	if month > 0 {
		baseQuery = baseQuery.Where("EXTRACT(MONTH FROM o.pooling_at) = ?", month)
	}
	if year > 0 {
		baseQuery = baseQuery.Where("EXTRACT(YEAR FROM o.pooling_at) = ?", year)
	}
	if v, ok := params.Filters["dealer_id"]; ok {
		dealerID := strings.TrimSpace(fmt.Sprint(v))
		if dealerID != "" {
			baseQuery = baseQuery.Where("o.dealer_id = ?", dealerID)
		}
	}
	if v, ok := params.Filters["finance_1_company_id"]; ok {
		finance1ID := strings.TrimSpace(fmt.Sprint(v))
		if finance1ID != "" {
			baseQuery = baseQuery.Where("a1.finance_company_id = ?", finance1ID)
		}
	}
	if v, ok := params.Filters["finance_2_company_id"]; ok {
		finance2ID := strings.TrimSpace(fmt.Sprint(v))
		if finance2ID != "" {
			baseQuery = baseQuery.Where("COALESCE(a2.finance_company_id, o2a1.finance_company_id) = ?", finance2ID)
		}
	}
	if strings.TrimSpace(params.Search) != "" {
		search := "%" + strings.ToLower(strings.TrimSpace(params.Search)) + "%"
		baseQuery = baseQuery.Where(`
			LOWER(o.pooling_number) LIKE ?
			OR LOWER(o.consumer_name) LIKE ?
			OR LOWER(o.consumer_phone) LIKE ?
			OR LOWER(d.name) LIKE ?
			OR LOWER(fc1.name) LIKE ?
			OR LOWER(fc2.name) LIKE ?
			OR LOWER(fc2_clone.name) LIKE ?
			OR LOWER(mt.name) LIKE ?
		`, search, search, search, search, search, search, search, search)
	}

	finance2StatusExpr := "COALESCE(NULLIF(a2.status, ''), NULLIF(o2a1.status, ''), LOWER(NULLIF(o2.result_status, '')), '-')"
	finance2CompanyExpr := "COALESCE(a2.finance_company_id::text, o2a1.finance_company_id::text)"
	finance2DecisionExpr := "COALESCE(a2.created_at, o2a1.created_at, o2.created_at, o.updated_at)"

	groupedSubquery := baseQuery.Select(fmt.Sprintf(`
		o.id AS order_id,
		COALESCE(fc1.name, '-') AS finance_1_name,
		COALESCE(a1.status, '-') AS finance_1_status,
		COALESCE(fc2.name, fc2_clone.name, '-') AS finance_2_name,
		%s AS finance_2_status,
		%s AS finance_2_decision_at,
		%s AS finance_2_company_id,
		COUNT(1) OVER (PARTITION BY %s) AS transition_total_data,
		SUM(CASE WHEN %s IN ('approve', 'approved', 'success') THEN 1 ELSE 0 END) OVER (PARTITION BY %s) AS total_approve_finance_2,
		SUM(CASE WHEN %s IN ('reject', 'rejected', 'error') THEN 1 ELSE 0 END) OVER (PARTITION BY %s) AS total_reject_finance_2,
		ROW_NUMBER() OVER (
			PARTITION BY %s
			ORDER BY %s DESC, o.created_at DESC, o.id DESC
		) AS finance_2_rank
	`, finance2StatusExpr, finance2DecisionExpr, finance2CompanyExpr, finance2CompanyExpr, finance2StatusExpr, finance2CompanyExpr, finance2StatusExpr, finance2CompanyExpr, finance2CompanyExpr, finance2DecisionExpr))

	groupedQuery := s.db.Table("(?) AS grouped", groupedSubquery).Where("grouped.finance_2_rank = 1")

	var total int64
	if err := groupedQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderByMap := map[string]string{
		"finance_2_name":          "grouped.finance_2_name",
		"finance_2_status":        "grouped.finance_2_status",
		"finance_1_name":          "grouped.finance_1_name",
		"finance_2_decision":      "grouped.finance_2_decision_at",
		"total_data":              "grouped.transition_total_data",
		"total_approve_finance_2": "grouped.total_approve_finance_2",
		"total_reject_finance_2":  "grouped.total_reject_finance_2",
		"last_status_finance_2":   "grouped.finance_2_status",
	}
	orderColumn, ok := orderByMap[strings.TrimSpace(params.OrderBy)]
	if !ok || orderColumn == "" {
		orderColumn = "grouped.finance_2_decision_at"
	}
	orderDirection := strings.ToUpper(strings.TrimSpace(params.OrderDirection))
	if orderDirection != "ASC" {
		orderDirection = "DESC"
	}

	rows := make([]domainfinance.FinanceMigrationReportItem, 0, params.Limit)
	if err := groupedQuery.
		Select(`
			grouped.order_id AS order_id,
			grouped.finance_1_name AS finance_1_name,
			grouped.finance_1_status AS finance_1_status,
			grouped.finance_2_name AS finance_2_name,
			grouped.finance_2_status AS finance_2_status,
			grouped.transition_total_data AS transition_total_data,
			grouped.total_approve_finance_2 AS total_approve_finance_2,
			grouped.total_reject_finance_2 AS total_reject_finance_2,
			grouped.finance_2_decision_at AS finance_2_decision_at
		`).
		Order(fmt.Sprintf("%s %s", orderColumn, orderDirection)).
		Offset(params.Offset).
		Limit(params.Limit).
		Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	return rows, total, nil
}

func (s *Service) ListMigrationOrderInDetail(anchorOrderID string, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	type financeMigrationOrderInAnchor struct {
		Finance2CompanyID string `gorm:"column:finance_2_company_id"`
	}

	var anchor financeMigrationOrderInAnchor
	if err := s.db.
		Table("orders o").
		Joins(`
			JOIN LATERAL (
				SELECT
					a.order_id,
					a.finance_company_id,
					LOWER(a.status) AS status
				FROM order_finance_attempts a
				WHERE a.order_id = o.id AND a.attempt_no = 1
				ORDER BY a.created_at DESC, a.id DESC
				LIMIT 1
			) a1 ON TRUE
		`).
		Joins(`
			LEFT JOIN LATERAL (
				SELECT
					a.order_id,
					a.finance_company_id
				FROM order_finance_attempts a
				WHERE a.order_id = o.id AND a.attempt_no = 2
				ORDER BY a.created_at DESC, a.id DESC
				LIMIT 1
			) a2 ON TRUE
		`).
		Joins(`
			LEFT JOIN LATERAL (
				SELECT
					o2.id AS order_id
				FROM orders o2
				WHERE o2.deleted_at IS NULL
					AND o2.pooling_number = o.pooling_number
					AND o2.dealer_id = o.dealer_id
					AND o2.id <> o.id
				ORDER BY o2.created_at ASC, o2.id ASC
				LIMIT 1
			) o2 ON TRUE
		`).
		Joins(`
			LEFT JOIN LATERAL (
				SELECT
					a.order_id,
					a.finance_company_id
				FROM order_finance_attempts a
				WHERE a.order_id = o2.order_id AND a.attempt_no = 1
				ORDER BY a.created_at DESC, a.id DESC
				LIMIT 1
			) o2a1 ON TRUE
		`).
		Where("o.deleted_at IS NULL").
		Where("o.id = ?", anchorOrderID).
		Where("a1.status = ?", "reject").
		Select(`
			COALESCE(a2.finance_company_id::text, o2a1.finance_company_id::text, '') AS finance_2_company_id
		`).
		Take(&anchor).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return []domainfinance.FinanceMigrationReportItem{}, 0, nil
		}
		return nil, 0, err
	}

	if strings.TrimSpace(anchor.Finance2CompanyID) == "" {
		return []domainfinance.FinanceMigrationReportItem{}, 0, nil
	}

	reportParams := params
	reportFilters := map[string]interface{}{
		"finance_2_company_id": anchor.Finance2CompanyID,
	}
	if v, ok := params.Filters["finance_1_company_id"]; ok {
		finance1ID := strings.TrimSpace(fmt.Sprint(v))
		if finance1ID != "" {
			reportFilters["finance_1_company_id"] = finance1ID
		}
	}
	reportParams.Filters = reportFilters

	return s.ListMigrationReport(reportParams, month, year)
}
