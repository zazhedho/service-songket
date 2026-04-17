package serviceorder

import (
	"fmt"
	"strings"
	"time"

	"service-songket/internal/dto"
)

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
	orderCount, err := s.repo.CountDashboardOrders(rangeReq, role, userID)
	if err != nil {
		return dashboardPeriodTotals{}, err
	}
	decisionTotals, err := s.repo.GetDashboardDecisionTotals(rangeReq, role, userID)
	if err != nil {
		return dashboardPeriodTotals{}, err
	}

	totals.OrderIn = orderCount
	totals.Approve = decisionTotals.ApproveTotal
	totals.Reject = decisionTotals.RejectTotal
	return totals, nil
}

func (s *Service) DashboardSummary(req dto.DashboardSummaryQuery, role, userID string) (map[string]interface{}, error) {
	return s.buildDashboardSummaryResponse(req, role, userID)
}
