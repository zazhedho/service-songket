package servicefinance

import (
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

func (s *Service) DealerMetrics(dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (map[string]interface{}, error) {
	base, err := s.repo.GetDealerMetricsBase(dealerID, financeCompanyID, dateRange)
	if err != nil {
		return nil, err
	}

	fcRows, err := s.repo.ListDealerFinanceCompanyMetrics(dealerID, dateRange)
	if err != nil {
		return nil, err
	}

	groupingRows, err := s.repo.ListDealerFinanceApprovalGrouping(dealerID, financeCompanyID, dateRange)
	if err != nil {
		return nil, err
	}

	transitionRows, err := s.repo.ListDealerFinanceApprovalTransitions(dealerID, financeCompanyID, dateRange)
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

	financeApprovalTransitions := make([]financeApprovalTransition, 0, len(transitionRows))
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
		"total_orders":                 base.TotalOrders,
		"lead_time_seconds_avg":        base.LeadTimeSecondsAvg,
		"approval_rate":                approvalRate,
		"rescue_approved_fc2":          base.RescuedOrders,
		"finance_approval_grouping":    financeApprovalGroupings,
		"finance_approval_transitions": financeApprovalTransitions,
		"date_from":                    dateRange.From,
		"date_to":                      dateRange.To,
		"finance_company_filter":       financeCompanyID,
		"finance_companies":            fcMetrics,
	}, nil
}

func (s *Service) ListMigrationReport(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	return s.repo.ListMigrationReport(params, month, year)
}

func (s *Service) ListMigrationReportGroupedByFinance2(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	return s.repo.ListMigrationReportGroupedByFinance2(params, month, year)
}

func (s *Service) ListMigrationOrderInDetail(anchorOrderID string, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	finance2CompanyID, err := s.repo.GetMigrationAnchorFinance2CompanyID(anchorOrderID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return []domainfinance.FinanceMigrationReportItem{}, 0, nil
		}
		return nil, 0, err
	}

	if strings.TrimSpace(finance2CompanyID) == "" {
		return []domainfinance.FinanceMigrationReportItem{}, 0, nil
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

	return s.repo.ListMigrationReport(reportParams, month, year)
}
