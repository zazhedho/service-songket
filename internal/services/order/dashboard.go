package serviceorder

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"service-songket/internal/dto"
	"service-songket/utils"
)

type dashboardSummaryRow struct {
	PoolingAt          time.Time  `gorm:"column:pooling_at"`
	ResultAt           *time.Time `gorm:"column:result_at"`
	ResultStatus       string     `gorm:"column:result_status"`
	DPPct              float64    `gorm:"column:dp_pct"`
	JobName            string     `gorm:"column:job_name"`
	MotorTypeName      string     `gorm:"column:motor_type_name"`
	FinanceCompanyName string     `gorm:"column:finance_company_name"`
}

type dashboardPeriodWindow struct {
	Analysis      string
	CurrentFrom   time.Time
	CurrentTo     time.Time
	CurrentLabel  string
	PreviousFrom  time.Time
	PreviousTo    time.Time
	PreviousLabel string
}

type dashboardPeriodTotals struct {
	OrderIn int64
	Approve int64
	Reject  int64
}

func applyDashboardScopeFilters(query *gorm.DB, req dto.DashboardSummaryQuery, role, userID, financeCompanyColumn string) *gorm.DB {
	if role == utils.RoleDealer {
		query = query.Where("o.created_by = ?", userID)
	}
	if dealerID := strings.TrimSpace(req.DealerID); dealerID != "" {
		query = query.Where("o.dealer_id = ?", dealerID)
	}
	if financeCompanyID := strings.TrimSpace(req.FinanceCompanyID); financeCompanyID != "" && strings.TrimSpace(financeCompanyColumn) != "" {
		query = query.Where(fmt.Sprintf("%s = ?", financeCompanyColumn), financeCompanyID)
	}
	if area := strings.ToLower(strings.TrimSpace(req.Area)); area != "" {
		query = query.Where("(LOWER(COALESCE(d.regency, '')) = ? OR LOWER(COALESCE(d.district, '')) = ?)", area, area)
	}
	if resultStatus := strings.ToLower(strings.TrimSpace(req.ResultStatus)); resultStatus != "" {
		query = query.Where("LOWER(COALESCE(o.result_status, '')) = ?", resultStatus)
	}
	return query
}

func (s *Service) buildDashboardSummaryBaseQuery(req dto.DashboardSummaryQuery, role, userID string) *gorm.DB {
	query := s.db.
		Table("orders o").
		Select(`
			o.pooling_at,
			o.result_at,
			LOWER(COALESCE(o.result_status, '')) AS result_status,
			COALESCE(o.dp_pct, 0) AS dp_pct,
			COALESCE(NULLIF(j.name, ''), '-') AS job_name,
			COALESCE(NULLIF(mt.name, ''), '-') AS motor_type_name,
			COALESCE(NULLIF(fc1.name, ''), '-') AS finance_company_name
		`).
		Joins("LEFT JOIN jobs j ON j.id = o.job_id AND j.deleted_at IS NULL").
		Joins("LEFT JOIN motor_types mt ON mt.id = o.motor_type_id AND mt.deleted_at IS NULL").
		Joins("LEFT JOIN dealers d ON d.id = o.dealer_id AND d.deleted_at IS NULL").
		Joins("LEFT JOIN order_finance_attempts a1 ON a1.order_id = o.id AND a1.attempt_no = 1").
		Joins("LEFT JOIN finance_companies fc1 ON fc1.id = a1.finance_company_id AND fc1.deleted_at IS NULL").
		Where("o.deleted_at IS NULL")
	return applyDashboardScopeFilters(query, req, role, userID, "a1.finance_company_id")
}

func applyDashboardPeriodFilters(query *gorm.DB, req dto.DashboardSummaryQuery) *gorm.DB {
	analysis := strings.ToLower(strings.TrimSpace(req.Analysis))
	switch analysis {
	case "yearly":
		if req.Year > 0 {
			query = query.Where("EXTRACT(YEAR FROM o.pooling_at) = ?", req.Year)
		}
		return query
	case "monthly":
		if req.Year > 0 {
			query = query.Where("EXTRACT(YEAR FROM o.pooling_at) = ?", req.Year)
		}
		if req.Month >= 1 && req.Month <= 12 {
			query = query.Where("EXTRACT(MONTH FROM o.pooling_at) = ?", req.Month)
		}
		return query
	case "daily":
		if date := strings.TrimSpace(req.Date); date != "" {
			query = query.Where("DATE(o.pooling_at) = ?", date)
		}
		return query
	case "custom":
		if from := strings.TrimSpace(req.From); from != "" {
			query = query.Where("DATE(o.pooling_at) >= ?", from)
		}
		if to := strings.TrimSpace(req.To); to != "" {
			query = query.Where("DATE(o.pooling_at) <= ?", to)
		}
		return query
	}

	if date := strings.TrimSpace(req.Date); date != "" {
		query = query.Where("DATE(o.pooling_at) = ?", date)
	}
	if from := strings.TrimSpace(req.From); from != "" {
		query = query.Where("DATE(o.pooling_at) >= ?", from)
	}
	if to := strings.TrimSpace(req.To); to != "" {
		query = query.Where("DATE(o.pooling_at) <= ?", to)
	}
	if req.Month >= 1 && req.Month <= 12 {
		query = query.Where("EXTRACT(MONTH FROM o.pooling_at) = ?", req.Month)
	}
	if req.Year > 0 {
		query = query.Where("EXTRACT(YEAR FROM o.pooling_at) = ?", req.Year)
	}
	return query
}

func parseDashboardHolidaySet(rawValues ...string) map[string]struct{} {
	out := map[string]struct{}{}
	for _, raw := range rawValues {
		for _, token := range strings.Split(raw, ",") {
			candidate := strings.TrimSpace(token)
			if candidate == "" {
				continue
			}
			parsed, err := time.Parse("2006-01-02", candidate)
			if err != nil {
				continue
			}
			out[parsed.Format("2006-01-02")] = struct{}{}
		}
	}
	return out
}

func workingDaysInMonth(year, month int, holidays map[string]struct{}) int {
	if year <= 0 || month < 1 || month > 12 {
		return 0
	}
	totalDays := time.Date(year, time.Month(month)+1, 0, 0, 0, 0, 0, time.UTC).Day()
	workingDays := 0
	for day := 1; day <= totalDays; day++ {
		current := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
		if current.Weekday() == time.Sunday {
			continue
		}
		if _, isHoliday := holidays[current.Format("2006-01-02")]; isHoliday {
			continue
		}
		workingDays++
	}
	return workingDays
}

func workingSecondsWithinDailyWindow(start, end time.Time, windowStartHour, windowEndHour int) float64 {
	if !end.After(start) || windowEndHour <= windowStartHour {
		return 0
	}
	loc := start.Location()
	if loc == nil {
		loc = end.Location()
	}
	if loc == nil {
		loc = time.Local
	}
	startAt := start.In(loc)
	endAt := end.In(loc)
	dayCursor := time.Date(startAt.Year(), startAt.Month(), startAt.Day(), 0, 0, 0, 0, loc)
	lastDay := time.Date(endAt.Year(), endAt.Month(), endAt.Day(), 0, 0, 0, 0, loc)
	totalSeconds := 0.0
	for !dayCursor.After(lastDay) {
		windowStart := time.Date(dayCursor.Year(), dayCursor.Month(), dayCursor.Day(), windowStartHour, 0, 0, 0, loc)
		windowEnd := time.Date(dayCursor.Year(), dayCursor.Month(), dayCursor.Day(), windowEndHour, 0, 0, 0, loc)
		overlapStart := windowStart
		if startAt.After(overlapStart) {
			overlapStart = startAt
		}
		overlapEnd := windowEnd
		if endAt.Before(overlapEnd) {
			overlapEnd = endAt
		}
		if overlapEnd.After(overlapStart) {
			totalSeconds += overlapEnd.Sub(overlapStart).Seconds()
		}
		dayCursor = dayCursor.AddDate(0, 0, 1)
	}
	return totalSeconds
}

func parseYearMonthKey(key string) (int, int, bool) {
	t, err := time.Parse("2006-01", strings.TrimSpace(key))
	if err != nil {
		return 0, 0, false
	}
	return t.Year(), int(t.Month()), true
}

func previousYearMonth(year, month int) (int, int) {
	if month <= 1 {
		return year - 1, 12
	}
	return year, month - 1
}

func parseDashboardDate(raw string) (time.Time, bool) {
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(raw))
	if err != nil {
		return time.Time{}, false
	}
	return parsed, true
}

func normalizeDashboardAnalysis(req dto.DashboardSummaryQuery) string {
	analysis := strings.ToLower(strings.TrimSpace(req.Analysis))
	if analysis != "" {
		return analysis
	}
	if strings.TrimSpace(req.From) != "" || strings.TrimSpace(req.To) != "" {
		return "custom"
	}
	if strings.TrimSpace(req.Date) != "" {
		return "daily"
	}
	if req.Year > 0 && req.Month >= 1 && req.Month <= 12 {
		return "monthly"
	}
	if req.Year > 0 {
		return "yearly"
	}
	return "daily"
}

func formatDashboardDateRangeLabel(from, to time.Time) string {
	fromLabel := from.Format("2006-01-02")
	toLabel := to.Format("2006-01-02")
	if fromLabel == toLabel {
		return fromLabel
	}
	return fmt.Sprintf("%s s/d %s", fromLabel, toLabel)
}

func clampDashboardDay(year int, month time.Month, day int) int {
	if day < 1 {
		day = 1
	}
	lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if day > lastDay {
		return lastDay
	}
	return day
}

func resolveDashboardPeriodWindow(req dto.DashboardSummaryQuery, fallback time.Time) dashboardPeriodWindow {
	if fallback.IsZero() {
		fallback = time.Now()
	}
	referenceDate := time.Date(fallback.Year(), fallback.Month(), fallback.Day(), 0, 0, 0, 0, time.UTC)
	anchorDate := referenceDate
	if parsedDate, ok := parseDashboardDate(req.Date); ok {
		anchorDate = parsedDate
	}
	analysis := normalizeDashboardAnalysis(req)
	window := dashboardPeriodWindow{Analysis: analysis}

	switch analysis {
	case "yearly":
		targetYear := req.Year
		if targetYear <= 0 {
			targetYear = referenceDate.Year()
		}
		currentToDay := clampDashboardDay(targetYear, anchorDate.Month(), anchorDate.Day())
		prevYear := targetYear - 1
		previousToDay := clampDashboardDay(prevYear, anchorDate.Month(), anchorDate.Day())
		window.CurrentFrom = time.Date(targetYear, 1, 1, 0, 0, 0, 0, time.UTC)
		window.CurrentTo = time.Date(targetYear, anchorDate.Month(), currentToDay, 0, 0, 0, 0, time.UTC)
		window.PreviousFrom = time.Date(prevYear, 1, 1, 0, 0, 0, 0, time.UTC)
		window.PreviousTo = time.Date(prevYear, anchorDate.Month(), previousToDay, 0, 0, 0, 0, time.UTC)
		window.CurrentLabel = "YTD"
		window.PreviousLabel = "YTD-1"
	case "monthly":
		targetYear := req.Year
		if targetYear <= 0 {
			targetYear = referenceDate.Year()
		}
		targetMonth := req.Month
		if targetMonth < 1 || targetMonth > 12 {
			targetMonth = int(referenceDate.Month())
		}
		currentToDay := clampDashboardDay(targetYear, time.Month(targetMonth), anchorDate.Day())
		prevYear, prevMonth := previousYearMonth(targetYear, targetMonth)
		previousToDay := clampDashboardDay(prevYear, time.Month(prevMonth), anchorDate.Day())
		window.CurrentFrom = time.Date(targetYear, time.Month(targetMonth), 1, 0, 0, 0, 0, time.UTC)
		window.CurrentTo = time.Date(targetYear, time.Month(targetMonth), currentToDay, 0, 0, 0, 0, time.UTC)
		window.PreviousFrom = time.Date(prevYear, time.Month(prevMonth), 1, 0, 0, 0, 0, time.UTC)
		window.PreviousTo = time.Date(prevYear, time.Month(prevMonth), previousToDay, 0, 0, 0, 0, time.UTC)
		window.CurrentLabel = "M"
		window.PreviousLabel = "M-1"
	case "custom":
		currentFrom, okFrom := parseDashboardDate(req.From)
		currentTo, okTo := parseDashboardDate(req.To)
		if !okFrom {
			currentFrom = referenceDate
		}
		if !okTo {
			currentTo = currentFrom
		}
		if currentTo.Before(currentFrom) {
			currentFrom, currentTo = currentTo, currentFrom
		}
		durationDays := int(currentTo.Sub(currentFrom).Hours()/24) + 1
		if durationDays <= 0 {
			durationDays = 1
		}
		previousTo := currentFrom.AddDate(0, 0, -1)
		previousFrom := previousTo.AddDate(0, 0, -(durationDays - 1))
		window.CurrentFrom = currentFrom
		window.CurrentTo = currentTo
		window.PreviousFrom = previousFrom
		window.PreviousTo = previousTo
		window.CurrentLabel = formatDashboardDateRangeLabel(currentFrom, currentTo)
		window.PreviousLabel = formatDashboardDateRangeLabel(previousFrom, previousTo)
	default:
		targetDate, ok := parseDashboardDate(req.Date)
		if !ok {
			targetDate = referenceDate
		}
		window.Analysis = "daily"
		window.CurrentFrom = targetDate
		window.CurrentTo = targetDate
		window.PreviousFrom = targetDate.AddDate(0, 0, -1)
		window.PreviousTo = window.PreviousFrom
		window.CurrentLabel = targetDate.Format("2006-01-02")
		window.PreviousLabel = window.PreviousFrom.Format("2006-01-02")
	}

	return window
}

func pctChange(current, previous float64) float64 {
	if previous == 0 {
		if current == 0 {
			return 0
		}
		return 100
	}
	return ((current - previous) / previous) * 100
}

func computeRate(numerator, denominator int64) float64 {
	if denominator <= 0 {
		return 0
	}
	return float64(numerator) / float64(denominator)
}

func (s *Service) computeDashboardPeriodTotals(req dto.DashboardSummaryQuery, role, userID string, from, to time.Time) (dashboardPeriodTotals, error) {
	rangeReq := req
	rangeReq.Analysis = "custom"
	rangeReq.Month = 0
	rangeReq.Year = 0
	rangeReq.Date = ""
	rangeReq.From = from.Format("2006-01-02")
	rangeReq.To = to.Format("2006-01-02")

	var totals dashboardPeriodTotals
	orderInQuery := applyDashboardPeriodFilters(s.buildDashboardSummaryBaseQuery(rangeReq, role, userID), rangeReq)
	if err := orderInQuery.Distinct("o.id").Count(&totals.OrderIn).Error; err != nil {
		return dashboardPeriodTotals{}, err
	}

	type decisionTotalsRow struct {
		ApproveTotal int64 `gorm:"column:approve_total"`
		RejectTotal  int64 `gorm:"column:reject_total"`
	}
	var decisionRow decisionTotalsRow

	decisionQuery := s.db.
		Table("orders o").
		Select(`
			COUNT(CASE WHEN LOWER(COALESCE(oa.status, '')) = 'approve' THEN 1 END) AS approve_total,
			COUNT(CASE WHEN LOWER(COALESCE(oa.status, '')) = 'reject' THEN 1 END) AS reject_total
		`).
		Joins("JOIN order_finance_attempts oa ON oa.order_id = o.id").
		Joins("LEFT JOIN dealers d ON d.id = o.dealer_id AND d.deleted_at IS NULL").
		Where("o.deleted_at IS NULL").
		Where("LOWER(COALESCE(oa.status, '')) IN ?", []string{"approve", "reject"})
	decisionQuery = applyDashboardScopeFilters(decisionQuery, rangeReq, role, userID, "oa.finance_company_id")
	decisionQuery = applyDashboardPeriodFilters(decisionQuery, rangeReq)
	if err := decisionQuery.Scan(&decisionRow).Error; err != nil {
		return dashboardPeriodTotals{}, err
	}

	totals.Approve = decisionRow.ApproveTotal
	totals.Reject = decisionRow.RejectTotal
	return totals, nil
}

func (s *Service) DashboardSummary(req dto.DashboardSummaryQuery, role, userID string) (map[string]interface{}, error) {
	return s.buildDashboardSummaryResponse(req, role, userID)
}
