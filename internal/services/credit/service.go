package servicecredit

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"

	domaincredit "service-songket/internal/domain/credit"
	"service-songket/internal/dto"
	interfacecredit "service-songket/internal/interfaces/credit"
	interfacejob "service-songket/internal/interfaces/job"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo    interfacecredit.RepoCreditInterface
	jobRepo interfacejob.RepoJobInterface
}

func NewCreditService(repo interfacecredit.RepoCreditInterface, jobRepo interfacejob.RepoJobInterface) *Service {
	return &Service{repo: repo, jobRepo: jobRepo}
}

func (s *Service) Upsert(req dto.CreditCapabilityRequest) (domaincredit.CreditCapability, error) {
	normalizedJobID, err := sharedsvc.NormalizeRequiredUUID(req.JobID, "job_id")
	if err != nil {
		return domaincredit.CreditCapability{}, err
	}

	if _, err := s.jobRepo.GetByID(normalizedJobID); err != nil {
		return domaincredit.CreditCapability{}, fmt.Errorf("job not found")
	}

	province := strings.TrimSpace(req.Province)
	regency := strings.TrimSpace(req.Regency)
	district := strings.TrimSpace(req.District)
	village := strings.TrimSpace(req.Village)
	address := strings.TrimSpace(req.Address)

	row, err := s.repo.GetByRegencyAndJob(regency, normalizedJobID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = domaincredit.CreditCapability{
			Id:       utils.CreateUUID(),
			Province: province,
			Regency:  regency,
			District: district,
			Village:  village,
			Address:  address,
			JobID:    normalizedJobID,
			Score:    req.Score,
		}
		if err := s.repo.Store(row); err != nil {
			return domaincredit.CreditCapability{}, err
		}
		return row, nil
	}
	if err != nil {
		return domaincredit.CreditCapability{}, err
	}

	row.Province = province
	row.Regency = regency
	row.District = district
	row.Village = village
	row.Address = address
	row.Score = req.Score
	if err := s.repo.Update(row); err != nil {
		return domaincredit.CreditCapability{}, err
	}
	return row, nil
}

func (s *Service) List(params filter.BaseParams) ([]domaincredit.CreditCapability, int64, error) {
	return s.repo.GetAll(params)
}

func (s *Service) Summary(orderThreshold int64) ([]domaincredit.CreditSummary, error) {
	if orderThreshold <= 0 {
		orderThreshold = 5
	}

	rows, err := s.repo.ListSummaryRows()
	if err != nil {
		return nil, err
	}

	summaries := make([]domaincredit.CreditSummary, 0, len(rows))
	for _, row := range rows {
		score := 4
		approveMore := row.Approve > row.Reject
		rejectMore := row.Reject > row.Approve
		manyOrders := row.Total >= orderThreshold

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

		summaries = append(summaries, domaincredit.CreditSummary{
			Province:     row.Province,
			Regency:      row.Regency,
			District:     row.District,
			Village:      row.Village,
			TotalOrders:  row.Total,
			ApproveCount: row.Approve,
			RejectCount:  row.Reject,
			PendingCount: row.Pending,
			Score:        score,
		})
	}

	return summaries, nil
}

func (s *Service) Worksheet(provinceCode, regencyCode, jobID, motorTypeID, fromDate, toDate string) (map[string]interface{}, error) {
	type worksheetAreaAggregate struct {
		AreaKey      string
		ProvinceCode string
		ProvinceName string
		RegencyCode  string
		RegencyName  string
		JobsByID     map[string]domaincredit.CreditWorksheetJob
		MotorsByID   map[string]domaincredit.CreditWorksheetMotor
	}
	type jobIncomeValue struct {
		Name      string
		NetIncome float64
	}
	type motorInstallmentValue struct {
		Name        string
		Installment float64
	}
	type rangeCounter struct {
		Total   int64
		Approve int64
		Reject  int64
	}

	provinceFilter := strings.TrimSpace(provinceCode)
	regencyFilter := strings.TrimSpace(regencyCode)
	jobFilter := strings.TrimSpace(jobID)
	motorFilter := strings.TrimSpace(motorTypeID)
	fromFilter := strings.TrimSpace(fromDate)
	toFilter := strings.TrimSpace(toDate)

	var fromTime time.Time
	var toTime time.Time
	if fromFilter != "" {
		parsed, err := time.Parse("2006-01-02", fromFilter)
		if err != nil {
			return nil, fmt.Errorf("invalid from date format, expected YYYY-MM-DD")
		}
		fromTime = parsed
	}
	if toFilter != "" {
		parsed, err := time.Parse("2006-01-02", toFilter)
		if err != nil {
			return nil, fmt.Errorf("invalid to date format, expected YYYY-MM-DD")
		}
		toTime = parsed
	}
	if !fromTime.IsZero() && !toTime.IsZero() && toTime.Before(fromTime) {
		return nil, fmt.Errorf("invalid time range: to date must be greater than or equal to from date")
	}

	matchFilterValue := func(filterValue, codeValue, nameValue string) bool {
		filterValue = strings.ToLower(strings.TrimSpace(filterValue))
		if filterValue == "" {
			return true
		}
		return strings.ToLower(strings.TrimSpace(codeValue)) == filterValue ||
			strings.ToLower(strings.TrimSpace(nameValue)) == filterValue
	}
	matchesArea := func(provCode, provName, regCode, regName string) bool {
		return matchFilterValue(provinceFilter, provCode, provName) &&
			matchFilterValue(regencyFilter, regCode, regName)
	}
	matchesOrderArea := func(province, regency string) bool {
		return matchFilterValue(provinceFilter, province, province) &&
			matchFilterValue(regencyFilter, regency, regency)
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
	resolveDPRangeLabel := func(dp float64) string {
		switch {
		case dp < 10:
			return "<10%"
		case dp < 12.5:
			return "10% - 12.5%"
		case dp < 15:
			return "12.5% - 15%"
		case dp < 20:
			return "15% - 20%"
		case dp < 25:
			return "20% - 25%"
		case dp < 30:
			return "25% - 30%"
		case dp < 40:
			return "30% - 40%"
		default:
			return ">=40%"
		}
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
			JobsByID:     map[string]domaincredit.CreditWorksheetJob{},
			MotorsByID:   map[string]domaincredit.CreditWorksheetMotor{},
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

	jobRows, err := s.repo.ListJobIncomeRows(jobFilter)
	if err != nil {
		return nil, err
	}

	jobIncomeByArea := map[string]jobIncomeValue{}
	jobIncomeByJob := map[string]jobIncomeValue{}
	for _, row := range jobRows {
		currentJobID := strings.TrimSpace(row.JobID)
		if currentJobID == "" {
			continue
		}
		if _, ok := jobIncomeByJob[currentJobID]; !ok {
			jobIncomeByJob[currentJobID] = jobIncomeValue{
				Name:      strings.TrimSpace(row.JobName),
				NetIncome: row.NetIncome,
			}
		}

		areas := sharedsvc.DecodeAreaNetIncome(row.AreaNetIncome)
		for _, area := range areas {
			if strings.TrimSpace(area.RegencyCode) == "" && strings.TrimSpace(area.RegencyName) == "" {
				continue
			}
			if !matchesArea(area.ProvinceCode, area.ProvinceName, area.RegencyCode, area.RegencyName) {
				continue
			}

			areaAgg := ensureArea(area.ProvinceCode, area.ProvinceName, area.RegencyCode, area.RegencyName)
			if _, exists := areaAgg.JobsByID[currentJobID]; !exists {
				jobName := strings.TrimSpace(row.JobName)
				if jobName == "" {
					jobName = currentJobID
				}
				areaAgg.JobsByID[currentJobID] = domaincredit.CreditWorksheetJob{
					JobID:     currentJobID,
					JobName:   jobName,
					NetIncome: row.NetIncome,
					Area:      areaAgg.RegencyName,
				}
			}

			key := jobAreaKey(currentJobID, area.RegencyCode, area.RegencyName)
			if key == strings.ToLower(currentJobID)+"|" {
				continue
			}
			jobIncomeByArea[key] = jobIncomeValue{
				Name:      strings.TrimSpace(row.JobName),
				NetIncome: row.NetIncome,
			}
		}
	}

	motorRows, err := s.repo.ListMotorRows(motorFilter)
	if err != nil {
		return nil, err
	}

	motorInstallmentByArea := map[string]motorInstallmentValue{}
	motorInstallmentByID := map[string]motorInstallmentValue{}
	productInstallments := make([]float64, 0)
	for _, row := range motorRows {
		currentMotorID := strings.TrimSpace(row.MotorTypeID)
		if currentMotorID == "" {
			continue
		}

		value := motorInstallmentValue{
			Name:        strings.TrimSpace(row.MotorTypeName),
			Installment: row.Installment,
		}
		if _, ok := motorInstallmentByID[currentMotorID]; !ok {
			motorInstallmentByID[currentMotorID] = value
		}

		if strings.TrimSpace(row.RegencyCode) == "" && strings.TrimSpace(row.RegencyName) == "" {
			continue
		}
		if !matchesArea(row.ProvinceCode, row.ProvinceName, row.RegencyCode, row.RegencyName) {
			continue
		}
		if row.Installment > 0 {
			productInstallments = append(productInstallments, row.Installment)
		}

		area := ensureArea(row.ProvinceCode, row.ProvinceName, row.RegencyCode, row.RegencyName)
		if _, exists := area.MotorsByID[currentMotorID]; !exists {
			motorName := strings.TrimSpace(row.MotorTypeName)
			if motorName == "" {
				motorName = currentMotorID
			}
			area.MotorsByID[currentMotorID] = domaincredit.CreditWorksheetMotor{
				MotorTypeID:   currentMotorID,
				MotorTypeName: motorName,
				Installment:   row.Installment,
				Area:          area.RegencyName,
			}
		}

		key := motorAreaKey(currentMotorID, row.RegencyCode, row.RegencyName)
		if key == strings.ToLower(currentMotorID)+"|" {
			continue
		}
		motorInstallmentByArea[key] = value
	}

	const capabilityThreshold = 0.35
	const suggestionCap = 250000.0

	areasOut := make([]domaincredit.CreditWorksheetArea, 0, len(areasByKey))
	jobsMaster := make([]domaincredit.CreditWorksheetJobMaster, 0)
	motorsMaster := make([]domaincredit.CreditWorksheetMotorMaster, 0)
	jobsMasterSeen := map[string]struct{}{}
	motorsMasterSeen := map[string]struct{}{}

	for _, area := range areasByKey {
		if len(area.JobsByID) == 0 || len(area.MotorsByID) == 0 {
			continue
		}

		jobs := make([]domaincredit.CreditWorksheetJob, 0, len(area.JobsByID))
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
				jobsMaster = append(jobsMaster, domaincredit.CreditWorksheetJobMaster{
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

		motors := make([]domaincredit.CreditWorksheetMotor, 0, len(area.MotorsByID))
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
				motorsMaster = append(motorsMaster, domaincredit.CreditWorksheetMotorMaster{
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

		matrix := make([]domaincredit.CreditWorksheetMatrixRow, 0, len(jobs))
		for _, job := range jobs {
			row := domaincredit.CreditWorksheetMatrixRow{
				JobID:     job.JobID,
				JobName:   job.JobName,
				NetIncome: job.NetIncome,
				Area:      area.RegencyName,
				Cells:     make([]domaincredit.CreditWorksheetCell, 0, len(motors)),
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

				row.Cells = append(row.Cells, domaincredit.CreditWorksheetCell{
					MotorTypeID:       motor.MotorTypeID,
					MotorTypeName:     motor.MotorTypeName,
					Installment:       motor.Installment,
					CapabilityRate:    capabilityRate,
					ProgramSuggestion: programSuggestion,
				})
			}
			matrix = append(matrix, row)
		}

		areasOut = append(areasOut, domaincredit.CreditWorksheetArea{
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

	const installmentBucketSize int64 = 250000
	dpLabels := []string{"<10%", "10% - 12.5%", "12.5% - 15%", "15% - 20%", "20% - 25%", "25% - 30%", "30% - 40%", ">=40%"}
	installmentCounterByBucket := map[int64]*rangeCounter{}
	dpCounterByLabel := map[string]*rangeCounter{}
	for _, label := range dpLabels {
		dpCounterByLabel[label] = &rangeCounter{}
	}
	productBucketCounter := map[int64]int64{}
	for _, amount := range productInstallments {
		value := amount
		if value < 0 {
			value = 0
		}
		bucket := int64(value / float64(installmentBucketSize))
		productBucketCounter[bucket]++
	}

	var fromPtr *time.Time
	var toPtr *time.Time
	if !fromTime.IsZero() {
		fromPtr = &fromTime
	}
	if !toTime.IsZero() {
		toPtr = &toTime
	}
	orderRangeRows, err := s.repo.ListOrderRangeRows(jobFilter, motorFilter, fromPtr, toPtr)
	if err != nil {
		return nil, err
	}

	for _, row := range orderRangeRows {
		if !matchesOrderArea(row.Province, row.Regency) {
			continue
		}

		installmentValue := row.Installment
		if installmentValue < 0 {
			installmentValue = 0
		}
		installmentBucket := int64(installmentValue / float64(installmentBucketSize))
		if _, exists := installmentCounterByBucket[installmentBucket]; !exists {
			installmentCounterByBucket[installmentBucket] = &rangeCounter{}
		}
		installmentCounterByBucket[installmentBucket].Total++

		dpLabel := resolveDPRangeLabel(row.DPPct)
		dpCounterByLabel[dpLabel].Total++

		status := strings.ToLower(strings.TrimSpace(row.FinanceStatus))
		if status == "approve" {
			installmentCounterByBucket[installmentBucket].Approve++
			dpCounterByLabel[dpLabel].Approve++
		}
		if status == "reject" {
			installmentCounterByBucket[installmentBucket].Reject++
			dpCounterByLabel[dpLabel].Reject++
		}
	}

	buildApprovalRate := func(counter *rangeCounter) float64 {
		if counter == nil || counter.Total <= 0 {
			return 0
		}
		return (float64(counter.Approve) / float64(counter.Total)) * 100
	}

	bucketKeys := make([]int64, 0, len(installmentCounterByBucket)+len(productBucketCounter))
	bucketKeySeen := map[int64]struct{}{}
	for key := range installmentCounterByBucket {
		if _, exists := bucketKeySeen[key]; exists {
			continue
		}
		bucketKeySeen[key] = struct{}{}
		bucketKeys = append(bucketKeys, key)
	}
	for key := range productBucketCounter {
		if _, exists := bucketKeySeen[key]; exists {
			continue
		}
		bucketKeySeen[key] = struct{}{}
		bucketKeys = append(bucketKeys, key)
	}
	sort.Slice(bucketKeys, func(i, j int) bool { return bucketKeys[i] < bucketKeys[j] })

	installmentRangeSeries := make([]map[string]interface{}, 0, len(bucketKeys))
	for _, bucket := range bucketKeys {
		counter := installmentCounterByBucket[bucket]
		if counter == nil {
			counter = &rangeCounter{}
		}
		rangeStart := bucket * installmentBucketSize
		rangeEnd := rangeStart + installmentBucketSize
		productCount := productBucketCounter[bucket]
		installmentRangeSeries = append(installmentRangeSeries, map[string]interface{}{
			"label":             fmt.Sprintf("IDR %d - < IDR %d", rangeStart, rangeEnd),
			"range_start":       rangeStart,
			"range_end":         rangeEnd,
			"total":             counter.Total,
			"approve":           counter.Approve,
			"reject":            counter.Reject,
			"approval_rate":     buildApprovalRate(counter),
			"is_product_range":  productCount > 0,
			"product_range_hit": productCount,
		})
	}

	dpRangeSeries := make([]map[string]interface{}, 0, len(dpLabels))
	for _, label := range dpLabels {
		counter := dpCounterByLabel[label]
		dpRangeSeries = append(dpRangeSeries, map[string]interface{}{
			"label":         label,
			"total":         counter.Total,
			"approve":       counter.Approve,
			"reject":        counter.Reject,
			"approval_rate": buildApprovalRate(counter),
		})
	}

	return map[string]interface{}{
		"areas":              areasOut,
		"jobs_master":        jobsMaster,
		"motor_types_master": motorsMaster,
		"installment_range":  installmentRangeSeries,
		"dp_range":           dpRangeSeries,
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
		"applied_filters": map[string]string{
			"province":      provinceFilter,
			"regency":       regencyFilter,
			"job_id":        jobFilter,
			"motor_type_id": motorFilter,
			"from":          fromFilter,
			"to":            toFilter,
		},
	}, nil
}
