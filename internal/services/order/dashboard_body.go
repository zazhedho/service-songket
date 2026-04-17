package serviceorder

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"service-songket/internal/dto"
	"service-songket/utils"
)

func (s *Service) buildDashboardSummaryResponse(req dto.DashboardSummaryQuery, role, userID string) (map[string]interface{}, error) {
	rows, err := s.repo.ListDashboardSummaryRows(req, role, userID)
	if err != nil {
		return nil, err
	}

	totalOrders := int64(len(rows))
	approvedOrders := int64(0)
	leadTotalSeconds := 0.0
	leadCount := int64(0)
	periodWindow := resolveDashboardPeriodWindow(req, time.Now())

	chartReq := req
	chartReq.Analysis = "custom"
	chartReq.Month = 0
	chartReq.Year = 0
	chartReq.Date = ""
	chartReq.From = periodWindow.CurrentFrom.Format("2006-01-02")
	chartReq.To = periodWindow.CurrentTo.Format("2006-01-02")

	chartRows, err := s.repo.ListDashboardSummaryRows(chartReq, role, userID)
	if err != nil {
		return nil, err
	}

	dailyCounterChart := map[string]int64{}
	dailyRetailCounterChart := map[string]int64{}
	dailyFinanceRejectCounterChart := map[string]int64{}
	monthlyCounter := map[string]int64{}
	monthlyRetailCounter := map[string]int64{}
	dailyMotorCounterChart := map[string]map[string]int64{}
	monthlyMotorCounter := map[string]map[string]int64{}
	jobCounter := map[string]int64{}
	productCounter := map[string]int64{}
	financeCounter := map[string]int64{}

	dpLabels := []string{"<10%", "10% - 12.5%", "12.5% - 15%", "15% - 20%", "20% - 25%", "25% - 30%", "30% - 40%", ">=40%"}
	dpCounter := map[string]int64{}
	for _, label := range dpLabels {
		dpCounter[label] = 0
	}

	for _, row := range rows {
		monthKey := row.PoolingAt.Format("2006-01")
		monthlyCounter[monthKey]++

		jobLabel := strings.TrimSpace(row.JobName)
		if jobLabel == "" {
			jobLabel = "-"
		}
		jobCounter[jobLabel]++

		productLabel := strings.TrimSpace(row.MotorTypeName)
		if productLabel == "" {
			productLabel = "-"
		}
		productCounter[productLabel]++
		if _, ok := monthlyMotorCounter[monthKey]; !ok {
			monthlyMotorCounter[monthKey] = map[string]int64{}
		}
		monthlyMotorCounter[monthKey][productLabel]++

		financeLabel := strings.TrimSpace(row.FinanceCompanyName)
		if financeLabel == "" {
			financeLabel = "-"
		}
		financeCounter[financeLabel]++

		if row.ResultStatus == "approve" {
			approvedOrders++
		}
		if row.ResultAt != nil && row.ResultAt.After(row.PoolingAt) {
			leadSeconds := workingSecondsWithinDailyWindow(row.PoolingAt, *row.ResultAt, 8, 19)
			if leadSeconds > 0 {
				leadTotalSeconds += leadSeconds
				leadCount++
			}
		}

		dp := row.DPPct
		switch {
		case dp < 10:
			dpCounter["<10%"]++
		case dp < 12.5:
			dpCounter["10% - 12.5%"]++
		case dp < 15:
			dpCounter["12.5% - 15%"]++
		case dp < 20:
			dpCounter["15% - 20%"]++
		case dp < 25:
			dpCounter["20% - 25%"]++
		case dp < 30:
			dpCounter["25% - 30%"]++
		case dp < 40:
			dpCounter["30% - 40%"]++
		default:
			dpCounter[">=40%"]++
		}
	}

	for _, row := range chartRows {
		dateKey := row.PoolingAt.Format("2006-01-02")
		dailyCounterChart[dateKey]++

		productLabel := strings.TrimSpace(row.MotorTypeName)
		if productLabel == "" {
			productLabel = "-"
		}
		if _, ok := dailyMotorCounterChart[dateKey]; !ok {
			dailyMotorCounterChart[dateKey] = map[string]int64{}
		}
		dailyMotorCounterChart[dateKey][productLabel]++
	}

	approvalRate := 0.0
	if totalOrders > 0 {
		approvalRate = float64(approvedOrders) / float64(totalOrders)
	}
	leadAvgSeconds := 0.0
	if leadCount > 0 {
		leadAvgSeconds = leadTotalSeconds / float64(leadCount)
	}

	financeApproveRows, err := s.repo.ListDashboardFinanceDecisionDailyRows(req, role, userID)
	if err != nil {
		return nil, err
	}
	for _, item := range financeApproveRows {
		dateKey := strings.TrimSpace(item.DateKey)
		if dateKey == "" {
			continue
		}
		monthKey := dateKey
		if len(monthKey) >= 7 {
			monthKey = monthKey[:7]
			monthlyRetailCounter[monthKey] += item.ApproveTotal
		}
	}

	financeApproveChartRows, err := s.repo.ListDashboardFinanceDecisionDailyRows(chartReq, role, userID)
	if err != nil {
		return nil, err
	}
	for _, item := range financeApproveChartRows {
		dateKey := strings.TrimSpace(item.DateKey)
		if dateKey == "" {
			continue
		}
		dailyRetailCounterChart[dateKey] += item.ApproveTotal
		dailyFinanceRejectCounterChart[dateKey] += item.RejectTotal
	}

	financeDecisionByCompanyRows, err := s.repo.ListDashboardFinanceDecisionByCompanyRows(chartReq, role, userID)
	if err != nil {
		return nil, err
	}
	dailyFinanceDecisionByCompany := make([]map[string]interface{}, 0, len(financeDecisionByCompanyRows))
	for _, item := range financeDecisionByCompanyRows {
		if item.ApproveTotal <= 0 && item.RejectTotal <= 0 {
			continue
		}
		dateKey := strings.TrimSpace(item.DateKey)
		if dateKey == "" {
			continue
		}
		company := strings.TrimSpace(item.FinanceCompany)
		if company == "" {
			company = "-"
		}
		dailyFinanceDecisionByCompany = append(dailyFinanceDecisionByCompany, map[string]interface{}{
			"date":            dateKey,
			"finance_company": company,
			"approve_total":   item.ApproveTotal,
			"reject_total":    item.RejectTotal,
		})
	}

	type proportionItem struct {
		Label string
		Total int64
	}

	dailyKeys := make([]string, 0, len(dailyCounterChart))
	for key := range dailyCounterChart {
		dailyKeys = append(dailyKeys, key)
	}
	sort.Strings(dailyKeys)

	dailySeries := make([]map[string]interface{}, 0, len(dailyKeys))
	dailyRetailSeries := make([]map[string]interface{}, 0, len(dailyKeys))
	dailyFinanceRejectSeries := make([]map[string]interface{}, 0, len(dailyKeys))
	for _, key := range dailyKeys {
		dailySeries = append(dailySeries, map[string]interface{}{"date": key, "total": dailyCounterChart[key]})
		dailyRetailSeries = append(dailyRetailSeries, map[string]interface{}{"date": key, "total": dailyRetailCounterChart[key]})
		dailyFinanceRejectSeries = append(dailyFinanceRejectSeries, map[string]interface{}{"date": key, "total": dailyFinanceRejectCounterChart[key]})
	}

	dailyMotorSeries := make([]map[string]interface{}, 0)
	for _, key := range dailyKeys {
		rowCounter := dailyMotorCounterChart[key]
		if len(rowCounter) == 0 {
			continue
		}
		items := make([]proportionItem, 0, len(rowCounter))
		for label, total := range rowCounter {
			if total <= 0 {
				continue
			}
			items = append(items, proportionItem{Label: label, Total: total})
		}
		sort.Slice(items, func(i, j int) bool {
			if items[i].Total != items[j].Total {
				return items[i].Total > items[j].Total
			}
			return strings.ToLower(items[i].Label) < strings.ToLower(items[j].Label)
		})
		for _, item := range items {
			dailyMotorSeries = append(dailyMotorSeries, map[string]interface{}{
				"date":       key,
				"motor_type": item.Label,
				"total":      item.Total,
			})
		}
	}

	holidayEnv := strings.TrimSpace(fmt.Sprint(utils.GetEnv("DASHBOARD_HOLIDAYS", "")))
	holidaySet := parseDashboardHolidaySet(holidayEnv, req.Holidays)

	monthlyKeys := make([]string, 0, len(monthlyCounter))
	for key := range monthlyCounter {
		monthlyKeys = append(monthlyKeys, key)
	}
	sort.Strings(monthlyKeys)
	if len(monthlyKeys) > 12 {
		monthlyKeys = monthlyKeys[len(monthlyKeys)-12:]
	}

	monthlySeries := make([]map[string]interface{}, 0, len(monthlyKeys))
	monthlyMotorSeries := make([]map[string]interface{}, 0)
	for _, key := range monthlyKeys {
		year, month, ok := parseYearMonthKey(key)
		workingDays := 0
		if ok {
			workingDays = workingDaysInMonth(year, month, holidaySet)
		}
		if workingDays <= 0 {
			workingDays = 1
		}
		total := monthlyCounter[key]
		avgDaily := float64(total) / float64(workingDays)
		monthlySeries = append(monthlySeries, map[string]interface{}{
			"month":        key,
			"total":        total,
			"working_days": workingDays,
			"avg_daily":    avgDaily,
		})

		rowCounter := monthlyMotorCounter[key]
		if len(rowCounter) == 0 {
			continue
		}
		items := make([]proportionItem, 0, len(rowCounter))
		for label, itemTotal := range rowCounter {
			if itemTotal <= 0 {
				continue
			}
			items = append(items, proportionItem{Label: label, Total: itemTotal})
		}
		sort.Slice(items, func(i, j int) bool {
			if items[i].Total != items[j].Total {
				return items[i].Total > items[j].Total
			}
			return strings.ToLower(items[i].Label) < strings.ToLower(items[j].Label)
		})
		for _, item := range items {
			monthlyMotorSeries = append(monthlyMotorSeries, map[string]interface{}{
				"month":        key,
				"motor_type":   item.Label,
				"total":        item.Total,
				"working_days": workingDays,
				"avg_daily":    float64(item.Total) / float64(workingDays),
			})
		}
	}

	buildProportions := func(counter map[string]int64) []map[string]interface{} {
		items := make([]proportionItem, 0, len(counter))
		for label, total := range counter {
			if total <= 0 {
				continue
			}
			items = append(items, proportionItem{Label: label, Total: total})
		}
		sort.Slice(items, func(i, j int) bool {
			if items[i].Total != items[j].Total {
				return items[i].Total > items[j].Total
			}
			return strings.ToLower(items[i].Label) < strings.ToLower(items[j].Label)
		})
		result := make([]map[string]interface{}, 0, len(items))
		for _, item := range items {
			percent := 0.0
			if totalOrders > 0 {
				percent = (float64(item.Total) / float64(totalOrders)) * 100
			}
			result = append(result, map[string]interface{}{"label": item.Label, "total": item.Total, "percent": percent})
		}
		return result
	}

	dpSeries := make([]map[string]interface{}, 0, 8)
	for _, label := range []string{"<10%", "10% - 12.5%", "12.5% - 15%", "15% - 20%", "20% - 25%", "25% - 30%", "30% - 40%", ">=40%"} {
		total := dpCounter[label]
		percent := 0.0
		if totalOrders > 0 {
			percent = (float64(total) / float64(totalOrders)) * 100
		}
		dpSeries = append(dpSeries, map[string]interface{}{"label": label, "total": total, "percent": percent})
	}

	currentPeriodTotals, err := s.computeDashboardPeriodTotals(req, role, userID, periodWindow.CurrentFrom, periodWindow.CurrentTo)
	if err != nil {
		return nil, err
	}
	previousPeriodTotals, err := s.computeDashboardPeriodTotals(req, role, userID, periodWindow.PreviousFrom, periodWindow.PreviousTo)
	if err != nil {
		return nil, err
	}

	currentApproveRate := computeRate(currentPeriodTotals.Approve, currentPeriodTotals.OrderIn)
	currentRejectRate := computeRate(currentPeriodTotals.Reject, currentPeriodTotals.OrderIn)
	previousApproveRate := computeRate(previousPeriodTotals.Approve, previousPeriodTotals.OrderIn)
	previousRejectRate := computeRate(previousPeriodTotals.Reject, previousPeriodTotals.OrderIn)
	periodDays := func(from, to time.Time) float64 {
		if to.Before(from) {
			return 1
		}
		days := int(to.Sub(from).Hours()/24) + 1
		if days <= 0 {
			return 1
		}
		return float64(days)
	}
	currentPeriodDays := periodDays(periodWindow.CurrentFrom, periodWindow.CurrentTo)
	previousPeriodDays := periodDays(periodWindow.PreviousFrom, periodWindow.PreviousTo)
	currentAvgDailyOrderIn := float64(currentPeriodTotals.OrderIn) / currentPeriodDays
	previousAvgDailyOrderIn := float64(previousPeriodTotals.OrderIn) / previousPeriodDays
	currentAvgDailySales := float64(currentPeriodTotals.Approve) / currentPeriodDays
	previousAvgDailySales := float64(previousPeriodTotals.Approve) / previousPeriodDays
	orderInGrowthPct := pctChange(float64(currentPeriodTotals.OrderIn), float64(previousPeriodTotals.OrderIn))
	avgDailyOrderInGrowthPct := pctChange(currentAvgDailyOrderIn, previousAvgDailyOrderIn)
	avgDailySalesGrowthPct := pctChange(currentAvgDailySales, previousAvgDailySales)

	orderDecisionSnapshot := []map[string]interface{}{
		{"label": periodWindow.PreviousLabel, "row_type": "value", "order_in": previousPeriodTotals.OrderIn, "approve": previousPeriodTotals.Approve, "reject": previousPeriodTotals.Reject, "avg_daily_order_in": previousAvgDailyOrderIn, "avg_daily_sales": previousAvgDailySales, "approve_rate_percent": previousApproveRate * 100, "reject_rate_percent": previousRejectRate * 100},
		{"label": periodWindow.CurrentLabel, "row_type": "value", "order_in": currentPeriodTotals.OrderIn, "approve": currentPeriodTotals.Approve, "reject": currentPeriodTotals.Reject, "avg_daily_order_in": currentAvgDailyOrderIn, "avg_daily_sales": currentAvgDailySales, "approve_rate_percent": currentApproveRate * 100, "reject_rate_percent": currentRejectRate * 100},
		{"label": "Growth", "row_type": "growth", "order_in": orderInGrowthPct, "approve": pctChange(float64(currentPeriodTotals.Approve), float64(previousPeriodTotals.Approve)), "reject": pctChange(float64(currentPeriodTotals.Reject), float64(previousPeriodTotals.Reject)), "avg_daily_order_in": avgDailyOrderInGrowthPct, "avg_daily_sales": avgDailySalesGrowthPct, "approve_rate_percent": pctChange(currentApproveRate*100, previousApproveRate*100), "reject_rate_percent": pctChange(currentRejectRate*100, previousRejectRate*100)},
	}

	return map[string]interface{}{
		"total_orders":                      totalOrders,
		"approved_orders":                   approvedOrders,
		"approval_rate":                     approvalRate,
		"lead_time_avg_seconds":             leadAvgSeconds,
		"lead_time_avg_hours":               leadAvgSeconds / 3600,
		"growth":                            orderInGrowthPct / 100,
		"growth_percent":                    orderInGrowthPct,
		"growth_month":                      periodWindow.CurrentLabel,
		"growth_prev_month":                 periodWindow.PreviousLabel,
		"avg_order_in_daily_m":              currentAvgDailyOrderIn,
		"avg_order_in_daily_prev_m":         previousAvgDailyOrderIn,
		"avg_retail_sales_daily_m":          currentAvgDailySales,
		"daily_order_in":                    dailySeries,
		"daily_retail_sales":                dailyRetailSeries,
		"daily_finance_reject":              dailyFinanceRejectSeries,
		"daily_finance_decision_by_company": dailyFinanceDecisionByCompany,
		"daily_order_in_by_motor":           dailyMotorSeries,
		"analysis_applied":                  periodWindow.Analysis,
		"order_decision_snapshot":           orderDecisionSnapshot,
		"monthly_order_in":                  monthlySeries,
		"monthly_order_in_by_motor":         monthlyMotorSeries,
		"job_proportion":                    buildProportions(jobCounter),
		"product_proportion":                buildProportions(productCounter),
		"finance_company_proportion":        buildProportions(financeCounter),
		"dp_range":                          dpSeries,
	}, nil
}
