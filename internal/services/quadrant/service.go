package servicequadrant

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	domaincredit "service-songket/internal/domain/credit"
	domainquadrant "service-songket/internal/domain/quadrant"
	"service-songket/internal/dto"
	interfacecredit "service-songket/internal/interfaces/credit"
	interfacequadrant "service-songket/internal/interfaces/quadrant"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo          interfacequadrant.RepoQuadrantInterface
	creditService interfacecredit.ServiceCreditInterface
}

func NewQuadrantService(repo interfacequadrant.RepoQuadrantInterface, creditService interfacecredit.ServiceCreditInterface) *Service {
	return &Service{repo: repo, creditService: creditService}
}

func (s *Service) Summary(ctx context.Context, selectedYear, selectedMonth int) ([]domainquadrant.QuadrantFlowSummary, error) {
	const orderGrowthThresholdPct = 0.0
	const creditThresholdPct = 35.0

	orderRows, err := s.repo.ListMonthlyOrderAggregates(ctx)
	if err != nil {
		return nil, err
	}

	latestMonthKey := 0
	latestYear := 0
	latestMonth := 0
	if selectedYear > 0 && selectedMonth >= 1 && selectedMonth <= 12 {
		latestYear = selectedYear
		latestMonth = selectedMonth
		latestMonthKey = selectedYear*100 + selectedMonth
	} else if selectedYear > 0 {
		for _, row := range orderRows {
			if row.Year != selectedYear || row.Month <= 0 || row.Month > 12 {
				continue
			}
			monthKey := row.Year*100 + row.Month
			if monthKey > latestMonthKey {
				latestMonthKey = monthKey
				latestYear = row.Year
				latestMonth = row.Month
			}
		}
	} else {
		for _, row := range orderRows {
			if row.Year <= 0 || row.Month <= 0 || row.Month > 12 {
				continue
			}
			monthKey := row.Year*100 + row.Month
			if monthKey > latestMonthKey {
				latestMonthKey = monthKey
				latestYear = row.Year
				latestMonth = row.Month
			}
		}
	}
	if latestMonthKey == 0 {
		return []domainquadrant.QuadrantFlowSummary{}, nil
	}

	latestMonthTime := time.Date(latestYear, time.Month(latestMonth), 1, 0, 0, 0, 0, time.UTC)
	previousMonthTime := latestMonthTime.AddDate(0, -1, 0)
	previousYear := previousMonthTime.Year()
	previousMonth := int(previousMonthTime.Month())
	referenceMonth := fmt.Sprintf("%04d-%02d", latestYear, latestMonth)
	referencePrevMonth := fmt.Sprintf("%04d-%02d", previousYear, previousMonth)

	type areaJobOrderAggregate struct {
		Province      string
		Regency       string
		JobID         string
		JobName       string
		CurrentTotal  int64
		PreviousTotal int64
	}

	normalize := func(value string) string {
		return strings.ToLower(strings.TrimSpace(value))
	}
	makeAreaJobKey := func(province, regency, jobToken string) string {
		return normalize(province) + "|" + normalize(regency) + "|" + normalize(jobToken)
	}

	ordersByAreaJob := map[string]*areaJobOrderAggregate{}
	for _, row := range orderRows {
		if row.Year <= 0 || row.Month <= 0 || row.Month > 12 {
			continue
		}
		jobID := strings.TrimSpace(row.JobID)
		jobName := strings.TrimSpace(row.JobName)
		if jobName == "" {
			jobName = "-"
		}
		jobToken := jobID
		if jobToken == "" {
			jobToken = "__name__:" + normalize(jobName)
		}
		isCurrentMonth := row.Year == latestYear && row.Month == latestMonth
		isPreviousMonth := row.Year == previousYear && row.Month == previousMonth
		if !isCurrentMonth && !isPreviousMonth {
			continue
		}
		key := makeAreaJobKey(row.Province, row.Regency, jobToken)
		if key == "||" {
			continue
		}
		item, exists := ordersByAreaJob[key]
		if !exists {
			item = &areaJobOrderAggregate{
				Province: row.Province,
				Regency:  row.Regency,
				JobID:    jobID,
				JobName:  jobName,
			}
			ordersByAreaJob[key] = item
		}
		if isCurrentMonth {
			item.CurrentTotal += row.Total
		}
		if isPreviousMonth {
			item.PreviousTotal += row.Total
		}
	}

	worksheetRaw, err := s.creditService.Worksheet(ctx, "", "", "", "", "", "")
	if err != nil {
		return nil, err
	}

	areas, ok := worksheetRaw["areas"].([]domaincredit.CreditWorksheetArea)
	if !ok {
		return nil, fmt.Errorf("invalid worksheet area format")
	}

	appendUnique := func(values []string, candidate string) []string {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			return values
		}
		for _, existing := range values {
			if strings.EqualFold(existing, candidate) {
				return values
			}
		}
		return append(values, candidate)
	}
	makeCapabilityKey := func(province, regency, jobID string) string {
		return normalize(province) + "|" + normalize(regency) + "|" + normalize(jobID)
	}

	capabilityByAreaJob := map[string]float64{}
	for _, area := range areas {
		provinceCandidates := []string{}
		provinceCandidates = appendUnique(provinceCandidates, area.ProvinceCode)
		provinceCandidates = appendUnique(provinceCandidates, area.ProvinceName)
		regencyCandidates := []string{}
		regencyCandidates = appendUnique(regencyCandidates, area.RegencyCode)
		regencyCandidates = appendUnique(regencyCandidates, area.RegencyName)

		for _, row := range area.Matrix {
			jobID := strings.TrimSpace(row.JobID)
			if jobID == "" {
				continue
			}
			sumRate := 0.0
			countRate := 0
			for _, cell := range row.Cells {
				sumRate += cell.CapabilityRate
				countRate++
			}
			if countRate == 0 {
				continue
			}
			capabilityPct := (sumRate / float64(countRate)) * 100

			for _, reg := range regencyCandidates {
				capabilityByAreaJob[makeCapabilityKey("", reg, jobID)] = capabilityPct
				for _, prov := range provinceCandidates {
					capabilityByAreaJob[makeCapabilityKey(prov, reg, jobID)] = capabilityPct
				}
			}
		}
	}

	results := make([]domainquadrant.QuadrantFlowSummary, 0, len(ordersByAreaJob))
	for _, areaOrders := range ordersByAreaJob {
		if strings.TrimSpace(areaOrders.Regency) == "" {
			continue
		}

		orderGrowthPct := pctChange(float64(areaOrders.CurrentTotal), float64(areaOrders.PreviousTotal))
		capabilityPct := 0.0
		if strings.TrimSpace(areaOrders.JobID) != "" {
			if value, exists := capabilityByAreaJob[makeCapabilityKey(areaOrders.Province, areaOrders.Regency, areaOrders.JobID)]; exists {
				capabilityPct = value
			} else if value, exists := capabilityByAreaJob[makeCapabilityKey("", areaOrders.Regency, areaOrders.JobID)]; exists {
				capabilityPct = value
			}
		}

		quadrant := 2
		switch {
		case orderGrowthPct >= orderGrowthThresholdPct && capabilityPct >= creditThresholdPct:
			quadrant = 3
		case orderGrowthPct >= orderGrowthThresholdPct && capabilityPct < creditThresholdPct:
			quadrant = 1
		case orderGrowthPct < orderGrowthThresholdPct && capabilityPct >= creditThresholdPct:
			quadrant = 4
		case orderGrowthPct < orderGrowthThresholdPct && capabilityPct < creditThresholdPct:
			quadrant = 2
		}

		results = append(results, domainquadrant.QuadrantFlowSummary{
			JobID:                areaOrders.JobID,
			JobName:              areaOrders.JobName,
			Province:             areaOrders.Province,
			Regency:              areaOrders.Regency,
			TotalOrders:          areaOrders.CurrentTotal,
			OrderInPercent:       orderGrowthPct,
			OrderInGrowthPercent: orderGrowthPct,
			OrderInCurrentTotal:  areaOrders.CurrentTotal,
			OrderInPreviousTotal: areaOrders.PreviousTotal,
			ReferenceMonth:       referenceMonth,
			ReferencePrevMonth:   referencePrevMonth,
			CreditCapability:     capabilityPct,
			Quadrant:             quadrant,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].OrderInGrowthPercent != results[j].OrderInGrowthPercent {
			return results[i].OrderInGrowthPercent > results[j].OrderInGrowthPercent
		}
		if results[i].CreditCapability != results[j].CreditCapability {
			return results[i].CreditCapability > results[j].CreditCapability
		}
		if !strings.EqualFold(results[i].JobName, results[j].JobName) {
			return strings.ToLower(results[i].JobName) < strings.ToLower(results[j].JobName)
		}
		if !strings.EqualFold(results[i].Province, results[j].Province) {
			return strings.ToLower(results[i].Province) < strings.ToLower(results[j].Province)
		}
		return strings.ToLower(results[i].Regency) < strings.ToLower(results[j].Regency)
	})

	return results, nil
}

func (s *Service) Recompute(ctx context.Context, req dto.QuadrantComputeRequest) ([]domainquadrant.QuadrantResult, error) {
	orderThreshold := req.OrderThreshold
	scoreThreshold := req.ScoreThreshold

	var fromTime *time.Time
	var toTime *time.Time
	if strings.TrimSpace(req.From) != "" {
		if t, err := time.Parse("2006-01-02", req.From); err == nil {
			fromTime = &t
		}
	}
	if strings.TrimSpace(req.To) != "" {
		if t, err := time.Parse("2006-01-02", req.To); err == nil {
			toTime = &t
		}
	}

	rows, err := s.repo.ListOrderCounts(ctx, fromTime, toTime)
	if err != nil {
		return nil, err
	}

	orderCountMap := map[string]int64{}
	for _, row := range rows {
		key := row.Regency + "|" + row.JobID
		orderCountMap[key] = row.Total
	}

	capabilities, err := s.repo.ListCreditCapabilities(ctx)
	if err != nil {
		return nil, err
	}

	results := make([]domainquadrant.QuadrantResult, 0, len(capabilities))
	for _, capability := range capabilities {
		key := capability.Regency + "|" + capability.JobID
		count := orderCountMap[key]
		results = append(results, domainquadrant.QuadrantResult{
			Id:          utils.CreateUUID(),
			Regency:     capability.Regency,
			JobID:       capability.JobID,
			Quadrant:    computeQuadrant(count, capability.Score, orderThreshold, scoreThreshold),
			OrderCount:  count,
			CreditScore: capability.Score,
			ComputedAt:  time.Now(),
		})
	}

	if err := s.repo.ReplaceAll(ctx, results); err != nil {
		return nil, err
	}

	return results, nil
}

func (s *Service) List(ctx context.Context, params filter.BaseParams) ([]domainquadrant.QuadrantResult, int64, error) {
	return s.repo.GetAll(ctx, params)
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

func pctChange(current, previous float64) float64 {
	if previous == 0 {
		if current > 0 {
			return 100
		}
		return 0
	}
	return ((current - previous) / previous) * 100
}
