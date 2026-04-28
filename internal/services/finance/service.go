package servicefinance

import (
	"context"
	"fmt"
	"sort"
	"strings"

	domainfinance "service-songket/internal/domain/finance"
	interfacefinance "service-songket/internal/interfaces/finance"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type Service struct {
	repo interfacefinance.RepoFinanceInterface
}

func NewFinanceService(repo interfacefinance.RepoFinanceInterface) interfacefinance.ServiceFinanceInterface {
	return &Service{repo: repo}
}

func (s *Service) DealerMetrics(ctx context.Context, dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (map[string]interface{}, error) {
	base, err := s.repo.GetDealerMetricsBase(ctx, dealerID, financeCompanyID, dateRange)
	if err != nil {
		return nil, err
	}

	fcRows, err := s.repo.ListDealerFinanceCompanyMetrics(ctx, dealerID, dateRange)
	if err != nil {
		return nil, err
	}

	groupingRows, err := s.repo.ListDealerFinanceApprovalGrouping(ctx, dealerID, financeCompanyID, dateRange)
	if err != nil {
		return nil, err
	}

	transitionRows, err := s.repo.ListDealerFinanceApprovalTransitions(ctx, dealerID, financeCompanyID, dateRange)
	if err != nil {
		return nil, err
	}

	approvalRate := 0.0
	if base.TotalOrders > 0 {
		approvalRate = float64(base.ApprovedOrders) / float64(base.TotalOrders)
	}

	type financeCompanyMetric struct {
		FinanceCompanyID   string   `json:"finance_company_id"`
		FinanceCompanyName string   `json:"finance_company_name"`
		TotalOrders        int64    `json:"total_orders"`
		ApprovedCount      int64    `json:"approved_count"`
		RejectedCount      int64    `json:"rejected_count"`
		LeadTimeSecondsAvg *float64 `json:"lead_time_seconds_avg"`
		ApprovalRate       float64  `json:"approval_rate"`
		RescueApprovedFc2  int64    `json:"rescue_approved_fc2"`
	}

	fcMetrics := make([]financeCompanyMetric, 0, len(fcRows))
	for _, row := range fcRows {
		fcApproval := 0.0
		if row.TotalOrders > 0 {
			fcApproval = float64(row.ApprovedCount) / float64(row.TotalOrders)
		}
		fcMetrics = append(fcMetrics, financeCompanyMetric{
			FinanceCompanyID:   row.FinanceCompanyID,
			FinanceCompanyName: row.FinanceCompanyName,
			TotalOrders:        row.TotalOrders,
			ApprovedCount:      row.ApprovedCount,
			RejectedCount:      row.RejectedCount,
			LeadTimeSecondsAvg: row.LeadTimeSecondsAvg,
			ApprovalRate:       fcApproval,
			RescueApprovedFc2:  row.RescueApprovedFc2,
		})
	}

	type financeApprovalGrouping struct {
		FinanceCompanyID   string  `json:"finance_company_id"`
		FinanceCompanyName string  `json:"finance_company_name"`
		Status             string  `json:"status"`
		TotalData          int64   `json:"total_data"`
		ApprovalRate       float64 `json:"approval_rate"`
	}

	totalByFinance := make(map[string]int64, len(groupingRows))
	for _, row := range groupingRows {
		financeID := strings.TrimSpace(row.FinanceCompanyID)
		totalByFinance[financeID] += row.TotalData
	}

	financeApprovalGroupings := make([]financeApprovalGrouping, 0, len(groupingRows))
	for _, row := range groupingRows {
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

	type financeApprovalTransitionSummary struct {
		Finance1CompanyID   string  `json:"finance_1_company_id"`
		Finance1CompanyName string  `json:"finance_1_company_name"`
		TotalData           int64   `json:"total_data"`
		ApprovedCount       int64   `json:"approved_count"`
		RejectedCount       int64   `json:"rejected_count"`
		ApprovalRate        float64 `json:"approval_rate"`
	}

	financeApprovalTransitions := make([]financeApprovalTransition, 0, len(transitionRows))
	transitionSummaryByFinance1 := map[string]*financeApprovalTransitionSummary{}
	for _, row := range transitionRows {
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

		finance1ID := strings.TrimSpace(row.Finance1CompanyID)
		if finance1ID != "" {
			summary := transitionSummaryByFinance1[finance1ID]
			if summary == nil {
				summary = &financeApprovalTransitionSummary{
					Finance1CompanyID:   finance1ID,
					Finance1CompanyName: strings.TrimSpace(row.Finance1CompanyName),
				}
				transitionSummaryByFinance1[finance1ID] = summary
			}
			summary.TotalData += row.TotalData
			summary.ApprovedCount += row.ApprovedCount
			summary.RejectedCount += row.RejectedCount
		}
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

	financeApprovalTransitionSummaries := make([]financeApprovalTransitionSummary, 0, len(transitionSummaryByFinance1))
	for _, summary := range transitionSummaryByFinance1 {
		if summary.TotalData > 0 {
			summary.ApprovalRate = float64(summary.ApprovedCount) / float64(summary.TotalData)
		}
		financeApprovalTransitionSummaries = append(financeApprovalTransitionSummaries, *summary)
	}
	sort.Slice(financeApprovalTransitionSummaries, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(financeApprovalTransitionSummaries[i].Finance1CompanyName))
		right := strings.ToLower(strings.TrimSpace(financeApprovalTransitionSummaries[j].Finance1CompanyName))
		if left != right {
			return left < right
		}
		return financeApprovalTransitionSummaries[i].Finance1CompanyID < financeApprovalTransitionSummaries[j].Finance1CompanyID
	})

	return map[string]interface{}{
		"total_orders":                        base.TotalOrders,
		"lead_time_seconds_avg":               base.LeadTimeSecondsAvg,
		"approval_rate":                       approvalRate,
		"rescue_approved_fc2":                 base.RescuedOrders,
		"finance_approval_grouping":           financeApprovalGroupings,
		"finance_approval_transitions":        financeApprovalTransitions,
		"finance_approval_transition_summary": financeApprovalTransitionSummaries,
		"date_from":                           dateRange.From,
		"date_to":                             dateRange.To,
		"finance_company_filter":              financeCompanyID,
		"finance_companies":                   fcMetrics,
	}, nil
}

func (s *Service) FinanceCompanyMetrics(ctx context.Context, financeCompanyID string, dateRange domainfinance.DateRange) (map[string]interface{}, error) {
	rows, err := s.repo.ListFinanceCompanyDealerMetrics(ctx, financeCompanyID, dateRange)
	if err != nil {
		return nil, err
	}

	type dealerMetric struct {
		DealerID           string   `json:"dealer_id"`
		DealerName         string   `json:"dealer_name"`
		TotalOrders        int64    `json:"total_orders"`
		ApprovedCount      int64    `json:"approved_count"`
		RejectedCount      int64    `json:"rejected_count"`
		ApprovalRate       float64  `json:"approval_rate"`
		LeadTimeSecondsAvg *float64 `json:"lead_time_seconds_avg"`
		RescueApprovedFc2  int64    `json:"rescue_approved_fc2"`
	}

	dealerRows := make([]dealerMetric, 0, len(rows))
	var totalOrders int64
	var approvedCount int64
	var rescueCount int64
	var leadWeight float64
	var leadTotal int64
	var activeDealers int64

	for _, row := range rows {
		approvalRate := 0.0
		if row.TotalOrders > 0 {
			approvalRate = float64(row.ApprovedCount) / float64(row.TotalOrders)
			activeDealers++
		}
		if row.LeadTimeSecondsAvg != nil && row.TotalOrders > 0 {
			leadWeight += *row.LeadTimeSecondsAvg * float64(row.TotalOrders)
			leadTotal += row.TotalOrders
		}
		totalOrders += row.TotalOrders
		approvedCount += row.ApprovedCount
		rescueCount += row.RescueApprovedFc2
		dealerRows = append(dealerRows, dealerMetric{
			DealerID:           row.DealerID,
			DealerName:         row.DealerName,
			TotalOrders:        row.TotalOrders,
			ApprovedCount:      row.ApprovedCount,
			RejectedCount:      row.RejectedCount,
			ApprovalRate:       approvalRate,
			LeadTimeSecondsAvg: row.LeadTimeSecondsAvg,
			RescueApprovedFc2:  row.RescueApprovedFc2,
		})
	}

	approvalRate := 0.0
	if totalOrders > 0 {
		approvalRate = float64(approvedCount) / float64(totalOrders)
	}
	var leadAvg *float64
	if leadTotal > 0 {
		value := leadWeight / float64(leadTotal)
		leadAvg = &value
	}

	return map[string]interface{}{
		"total_orders":          totalOrders,
		"approval_rate":         approvalRate,
		"lead_time_seconds_avg": leadAvg,
		"rescue_approved_fc2":   rescueCount,
		"active_dealers":        activeDealers,
		"dealer_rows":           dealerRows,
	}, nil
}

func (s *Service) ListMigrationReport(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	return s.repo.ListMigrationReport(ctx, params, month, year)
}

func (s *Service) ListMigrationReportGroupedByFinance2(ctx context.Context, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	return s.repo.ListMigrationReportGroupedByFinance2(ctx, params, month, year)
}

func (s *Service) GetMigrationSummary(ctx context.Context, params filter.BaseParams, month, year int) (domainfinance.FinanceMigrationSummary, error) {
	summary, err := s.repo.GetMigrationSummary(ctx, params, month, year)
	if err != nil {
		return domainfinance.FinanceMigrationSummary{}, err
	}
	if summary.TotalDataSum > 0 {
		summary.ApprovalRate = (float64(summary.TotalApproveSum) / float64(summary.TotalDataSum)) * 100
	}
	return summary, nil
}

func (s *Service) ListMigrationOrderInDetail(ctx context.Context, anchorOrderID string, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	reportParams, ok, err := s.buildMigrationOrderInParams(ctx, anchorOrderID, params)
	if err != nil {
		return nil, 0, err
	}
	if !ok {
		return []domainfinance.FinanceMigrationReportItem{}, 0, nil
	}

	return s.repo.ListMigrationReport(ctx, reportParams, month, year)
}

func (s *Service) GetMigrationOrderInSummary(ctx context.Context, anchorOrderID string, params filter.BaseParams, month, year int) (domainfinance.FinanceMigrationDetailSummary, error) {
	reportParams, ok, err := s.buildMigrationOrderInParams(ctx, anchorOrderID, params)
	if err != nil {
		return domainfinance.FinanceMigrationDetailSummary{}, err
	}
	if !ok {
		return domainfinance.FinanceMigrationDetailSummary{}, nil
	}

	summary, err := s.repo.GetMigrationOrderInSummary(ctx, reportParams, month, year)
	if err != nil {
		return domainfinance.FinanceMigrationDetailSummary{}, err
	}
	if summary.TotalOrders > 0 {
		summary.DealerCoveragePercent = (float64(summary.TotalDealers) / float64(summary.TotalOrders)) * 100
		summary.ApprovalRate = float64(summary.ApprovedCount) / float64(summary.TotalOrders)
	}
	return summary, nil
}

func (s *Service) buildMigrationOrderInParams(ctx context.Context, anchorOrderID string, params filter.BaseParams) (filter.BaseParams, bool, error) {
	finance2CompanyID, err := s.repo.GetMigrationAnchorFinance2CompanyID(ctx, anchorOrderID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return filter.BaseParams{}, false, nil
		}
		return filter.BaseParams{}, false, err
	}

	if strings.TrimSpace(finance2CompanyID) == "" {
		return filter.BaseParams{}, false, nil
	}

	reportParams := params
	reportFilters := map[string]interface{}{
		"finance_2_company_id": finance2CompanyID,
	}
	if v, ok := params.Filters["finance_1_company_id"]; ok {
		finance1ID := strings.TrimSpace(fmt.Sprint(v))
		if finance1ID != "" {
			reportFilters["finance_1_company_id"] = finance1ID
		}
	}
	reportParams.Filters = reportFilters

	return reportParams, true, nil
}
