package serviceorder

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/oviekshgya/shago-lib/excel"

	domainlocation "service-songket/internal/domain/location"
	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	interfacelocation "service-songket/internal/interfaces/location"
	"service-songket/utils"
)

const (
	orderExportStatusQueued     = "queued"
	orderExportStatusRunning    = "running"
	orderExportStatusCompleted  = "completed"
	orderExportStatusFailed     = "failed"
	orderExportStatusDownloaded = "downloaded"
	orderExportStorageDir       = "storage/order-exports"
)

var orderExportJobStore = struct {
	mu   sync.RWMutex
	jobs map[string]*domainorder.OrderExportJob
}{
	jobs: map[string]*domainorder.OrderExportJob{},
}

func cloneOrderExportJob(job *domainorder.OrderExportJob) domainorder.OrderExportJob {
	if job == nil {
		return domainorder.OrderExportJob{}
	}
	copied := *job
	return copied
}

func getOrderExportJobCopy(jobID string) (domainorder.OrderExportJob, bool) {
	orderExportJobStore.mu.RLock()
	defer orderExportJobStore.mu.RUnlock()
	job, ok := orderExportJobStore.jobs[jobID]
	if !ok {
		return domainorder.OrderExportJob{}, false
	}
	return cloneOrderExportJob(job), true
}

func upsertOrderExportJob(job *domainorder.OrderExportJob) {
	orderExportJobStore.mu.Lock()
	defer orderExportJobStore.mu.Unlock()
	orderExportJobStore.jobs[job.ID] = job
}

func mutateOrderExportJob(jobID string, mutator func(*domainorder.OrderExportJob)) {
	orderExportJobStore.mu.Lock()
	defer orderExportJobStore.mu.Unlock()
	job, ok := orderExportJobStore.jobs[jobID]
	if !ok {
		return
	}
	mutator(job)
	job.UpdatedAt = time.Now()
}

func validateOrderExportRequest(req dto.OrderExportRequest) error {
	req.FromDate = strings.TrimSpace(req.FromDate)
	req.ToDate = strings.TrimSpace(req.ToDate)
	if req.FromDate == "" || req.ToDate == "" {
		return fmt.Errorf("from_date and to_date are required")
	}

	fromTime, err := time.Parse("2006-01-02", req.FromDate)
	if err != nil {
		return fmt.Errorf("from_date must use YYYY-MM-DD format")
	}
	toTime, err := time.Parse("2006-01-02", req.ToDate)
	if err != nil {
		return fmt.Errorf("to_date must use YYYY-MM-DD format")
	}
	if fromTime.After(toTime) {
		return fmt.Errorf("from_date cannot be after to_date")
	}

	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != "" && status != "approve" && status != "reject" && status != "pending" {
		return fmt.Errorf("status must be one of: approve, reject, pending")
	}
	return nil
}

func canAccessOrderExport(job *domainorder.OrderExportJob, role, userID string) bool {
	if job == nil {
		return false
	}
	return true
}

func (s *Service) StartExport(req dto.OrderExportRequest, role, userID string) (domainorder.OrderExportJob, error) {
	if err := validateOrderExportRequest(req); err != nil {
		return domainorder.OrderExportJob{}, err
	}

	now := time.Now()
	jobID := utils.CreateUUID()
	job := &domainorder.OrderExportJob{
		ID:           jobID,
		Status:       orderExportStatusQueued,
		Progress:     0,
		Message:      "Export job is queued",
		FromDate:     strings.TrimSpace(req.FromDate),
		ToDate:       strings.TrimSpace(req.ToDate),
		Search:       strings.TrimSpace(req.Search),
		StatusFilter: strings.ToLower(strings.TrimSpace(req.Status)),
		CreatedBy:    strings.TrimSpace(userID),
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	upsertOrderExportJob(job)
	go s.runOrderExport(jobID, req, role, userID)
	return cloneOrderExportJob(job), nil
}

func (s *Service) runOrderExport(jobID string, req dto.OrderExportRequest, role, userID string) {
	mutateOrderExportJob(jobID, func(job *domainorder.OrderExportJob) {
		job.Status = orderExportStatusRunning
		job.Progress = 10
		job.Message = "Collecting order-in data"
		job.Error = ""
	})

	orders, err := s.listOrdersForExport(req, role, userID)
	if err != nil {
		mutateOrderExportJob(jobID, func(job *domainorder.OrderExportJob) {
			job.Status = orderExportStatusFailed
			job.Progress = 100
			job.Message = "Failed to collect order data"
			job.Error = err.Error()
			finishedAt := time.Now()
			job.FinishedAt = &finishedAt
		})
		return
	}

	mutateOrderExportJob(jobID, func(job *domainorder.OrderExportJob) {
		job.Progress = 55
		job.Message = fmt.Sprintf("Generating Excel (%d rows)", len(orders))
		job.TotalRows = len(orders)
	})

	columns, rows := s.mapOrdersToExportRows(orders)
	if err := os.MkdirAll(orderExportStorageDir, 0o755); err != nil {
		mutateOrderExportJob(jobID, func(job *domainorder.OrderExportJob) {
			job.Status = orderExportStatusFailed
			job.Progress = 100
			job.Message = "Failed to prepare export directory"
			job.Error = err.Error()
			finishedAt := time.Now()
			job.FinishedAt = &finishedAt
		})
		return
	}

	fileName := fmt.Sprintf("order-in-%s-%s.xlsx", time.Now().Format("20060102-150405"), strings.ReplaceAll(jobID, "-", ""))
	outputPath := filepath.Join(orderExportStorageDir, fileName)
	result, err := excel.GenerateAndSave(excel.Request{FileName: fileName, Columns: columns, Data: rows}, outputPath)
	if err != nil {
		mutateOrderExportJob(jobID, func(job *domainorder.OrderExportJob) {
			job.Status = orderExportStatusFailed
			job.Progress = 100
			job.Message = "Failed to generate Excel file"
			job.Error = err.Error()
			finishedAt := time.Now()
			job.FinishedAt = &finishedAt
		})
		return
	}

	mutateOrderExportJob(jobID, func(job *domainorder.OrderExportJob) {
		job.Status = orderExportStatusCompleted
		job.Progress = 100
		job.Message = "Export is ready to download"
		job.FileName = result.FileName
		job.FilePath = result.OutputPath
		job.ExportedRows = len(rows)
		job.Error = ""
		finishedAt := time.Now()
		job.FinishedAt = &finishedAt
	})
}

func (s *Service) listOrdersForExport(req dto.OrderExportRequest, role, userID string) ([]domainorder.Order, error) {
	return s.repo.ListForExport(req, role, userID)
}

func (s *Service) GetExportJob(jobID, role, userID string) (domainorder.OrderExportJob, error) {
	raw, exists := getOrderExportJobCopy(strings.TrimSpace(jobID))
	if !exists {
		return domainorder.OrderExportJob{}, domainorder.ErrOrderExportNotFound
	}
	if !canAccessOrderExport(&raw, role, userID) {
		return domainorder.OrderExportJob{}, domainorder.ErrOrderExportForbidden
	}
	return raw, nil
}

func (s *Service) DownloadExport(jobID, role, userID string) (domainorder.OrderExportDownload, error) {
	raw, exists := getOrderExportJobCopy(strings.TrimSpace(jobID))
	if !exists {
		return domainorder.OrderExportDownload{}, domainorder.ErrOrderExportNotFound
	}
	if !canAccessOrderExport(&raw, role, userID) {
		return domainorder.OrderExportDownload{}, domainorder.ErrOrderExportForbidden
	}
	if raw.Status != orderExportStatusCompleted || strings.TrimSpace(raw.FilePath) == "" {
		return domainorder.OrderExportDownload{}, domainorder.ErrOrderExportNotReady
	}

	filePath := strings.TrimSpace(raw.FilePath)
	content, err := os.ReadFile(filePath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			mutateOrderExportJob(raw.ID, func(job *domainorder.OrderExportJob) {
				job.Status = orderExportStatusFailed
				job.Progress = 100
				job.Message = "Export file is missing"
				job.Error = domainorder.ErrOrderExportFileGone.Error()
				job.FilePath = ""
				finishedAt := time.Now()
				job.FinishedAt = &finishedAt
			})
			return domainorder.OrderExportDownload{}, domainorder.ErrOrderExportFileGone
		}
		return domainorder.OrderExportDownload{}, err
	}

	fileName := strings.TrimSpace(raw.FileName)
	if fileName == "" {
		fileName = filepath.Base(filePath)
	}
	if removeErr := os.Remove(filePath); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
		return domainorder.OrderExportDownload{}, removeErr
	}

	mutateOrderExportJob(raw.ID, func(job *domainorder.OrderExportJob) {
		job.Status = orderExportStatusDownloaded
		job.Progress = 100
		job.Message = "File downloaded"
		job.FilePath = ""
		finishedAt := time.Now()
		job.FinishedAt = &finishedAt
	})

	return domainorder.OrderExportDownload{
		FileName:    fileName,
		ContentType: excel.ContentTypeXLSX,
		Content:     content,
	}, nil
}

func getOrderDealerName(order domainorder.Order) string {
	if order.Dealer == nil {
		return ""
	}
	return order.Dealer.Name
}

func getOrderJobName(order domainorder.Order) string {
	if order.Job == nil {
		return ""
	}
	return order.Job.Name
}

func getOrderMotorTypeName(order domainorder.Order) string {
	if order.MotorType == nil {
		return ""
	}
	return order.MotorType.Name
}

func getOrderMotorBrand(order domainorder.Order) string {
	if order.MotorType == nil {
		return ""
	}
	return order.MotorType.Brand
}

func getOrderMotorModel(order domainorder.Order) string {
	if order.MotorType == nil {
		return ""
	}
	return order.MotorType.Model
}

func getOrderMotorVariant(order domainorder.Order) string {
	if order.MotorType == nil {
		return ""
	}
	return order.MotorType.VariantType
}

func getAttemptFinanceCompanyName(attempt domainorder.OrderFinanceAttempt) string {
	if attempt.FinanceCompany == nil {
		return ""
	}
	return attempt.FinanceCompany.Name
}

func formatExportTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.Format("2006-01-02 15:04:05")
}

func formatExportTimePtr(value *time.Time) string {
	if value == nil {
		return ""
	}
	return formatExportTime(*value)
}

func (s *Service) mapOrdersToExportRows(orders []domainorder.Order) ([]string, []map[string]any) {
	columns := []string{"No", "Pooling Number", "Pooling At", "Result At", "Dealer Name", "Consumer Name", "Consumer Phone", "Province", "Regency", "District", "Village", "Address", "Job Name", "Motor Type Name", "Motor Brand", "Motor Model", "Motor Variant Type", "Installment", "OTR", "DP Gross", "DP Paid", "DP Pct", "Tenor", "Result Status", "Result Notes", "Finance 1", "Status Finance 1", "Keterangan Finance 1", "Finance 2", "Status Finance 2", "Keterangan Finance 2"}

	rows := make([]map[string]any, 0, len(orders))
	locationResolver := newExportLocationResolver(s.locationRepo)
	for idx, order := range orders {
		attempt1, _ := findAttempt(order.Attempts, 1)
		attempt2, _ := findAttempt(order.Attempts, 2)
		provinceName := locationResolver.resolveProvinceName(order.Province)
		regencyName := locationResolver.resolveRegencyName(order.Province, order.Regency)
		districtName := locationResolver.resolveDistrictName(order.Province, order.Regency, order.District)

		rows = append(rows, map[string]any{
			"No":                   idx + 1,
			"Pooling Number":       strings.TrimSpace(order.PoolingNumber),
			"Pooling At":           formatExportTime(order.PoolingAt),
			"Result At":            formatExportTimePtr(order.ResultAt),
			"Dealer Name":          strings.TrimSpace(getOrderDealerName(order)),
			"Consumer Name":        strings.TrimSpace(order.ConsumerName),
			"Consumer Phone":       strings.TrimSpace(order.ConsumerPhone),
			"Province":             strings.TrimSpace(provinceName),
			"Regency":              strings.TrimSpace(regencyName),
			"District":             strings.TrimSpace(districtName),
			"Village":              strings.TrimSpace(order.Village),
			"Address":              strings.TrimSpace(order.Address),
			"Job Name":             strings.TrimSpace(getOrderJobName(order)),
			"Motor Type Name":      strings.TrimSpace(getOrderMotorTypeName(order)),
			"Motor Brand":          strings.TrimSpace(getOrderMotorBrand(order)),
			"Motor Model":          strings.TrimSpace(getOrderMotorModel(order)),
			"Motor Variant Type":   strings.TrimSpace(getOrderMotorVariant(order)),
			"Installment":          order.Installment,
			"OTR":                  order.OTR,
			"DP Gross":             order.DPGross,
			"DP Paid":              order.DPPaid,
			"DP Pct":               order.DPPct,
			"Tenor":                order.Tenor,
			"Result Status":        strings.TrimSpace(order.ResultStatus),
			"Result Notes":         strings.TrimSpace(order.ResultNotes),
			"Finance 1":            strings.TrimSpace(getAttemptFinanceCompanyName(attempt1)),
			"Status Finance 1":     strings.TrimSpace(attempt1.Status),
			"Keterangan Finance 1": strings.TrimSpace(attempt1.Notes),
			"Finance 2":            strings.TrimSpace(getAttemptFinanceCompanyName(attempt2)),
			"Status Finance 2":     strings.TrimSpace(attempt2.Status),
			"Keterangan Finance 2": strings.TrimSpace(attempt2.Notes),
		})
	}
	return columns, rows
}

type exportLocationResolver struct {
	locationRepo interfacelocation.RepoLocationInterface

	provinceNameCache map[string]string
	provinceCodes     map[string][]string
	regencyNameCache  map[string]string
	regencyCodes      map[string][]string
	districtNameCache map[string]string
}

func newExportLocationResolver(locationRepo interfacelocation.RepoLocationInterface) *exportLocationResolver {
	return &exportLocationResolver{
		locationRepo:      locationRepo,
		provinceNameCache: map[string]string{},
		provinceCodes:     map[string][]string{},
		regencyNameCache:  map[string]string{},
		regencyCodes:      map[string][]string{},
		districtNameCache: map[string]string{},
	}
}

func normalizeAreaToken(value string) string { return strings.ToLower(strings.TrimSpace(value)) }

func dedupeTokens(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, raw := range values {
		clean := strings.TrimSpace(raw)
		if clean == "" {
			continue
		}
		key := normalizeAreaToken(clean)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, clean)
	}
	return out
}

func (r *exportLocationResolver) resolveProvinceCodes(provinceRaw string) []string {
	base := strings.TrimSpace(provinceRaw)
	cacheKey := normalizeAreaToken(base)
	if cacheKey == "" {
		return nil
	}
	if cached, ok := r.provinceCodes[cacheKey]; ok {
		return cached
	}

	rows, err := r.locationRepo.ListProvinceCache()
	if err != nil {
		result := dedupeTokens([]string{base})
		r.provinceCodes[cacheKey] = result
		return result
	}
	result := make([]string, 0, len(rows)+1)
	for _, row := range rows {
		if strings.EqualFold(strings.TrimSpace(row.Code), cacheKey) || strings.EqualFold(strings.TrimSpace(row.Name), cacheKey) {
			if code := strings.TrimSpace(row.Code); code != "" {
				result = append(result, code)
			}
		}
	}
	if len(result) == 0 {
		for _, row := range rows {
			if code := strings.TrimSpace(row.Code); code != "" && strings.EqualFold(strings.TrimSpace(row.Name), base) {
				result = append(result, code)
			}
		}
	}
	if len(result) == 0 {
		for _, row := range rows {
			if code := strings.TrimSpace(row.Code); code != "" {
				result = append(result, code)
			}
		}
		result = findMatchingLocationCodes(rows, cacheKey, base)
	}
	if len(result) == 0 {
		result = append(result, base)
	}
	result = dedupeTokens(result)
	r.provinceCodes[cacheKey] = result
	return result
}

func (r *exportLocationResolver) resolveProvinceName(provinceRaw string) string {
	base := strings.TrimSpace(provinceRaw)
	cacheKey := normalizeAreaToken(base)
	if cacheKey == "" {
		return ""
	}
	if cached, ok := r.provinceNameCache[cacheKey]; ok {
		return cached
	}

	rows, err := r.locationRepo.ListProvinceCache()
	if err == nil {
		if name := findLocationName(rows, cacheKey); name != "" {
			r.provinceNameCache[cacheKey] = name
			return name
		}
	}
	r.provinceNameCache[cacheKey] = base
	return base
}

func (r *exportLocationResolver) resolveRegencyCodes(provinceRaw, regencyRaw string) []string {
	provinceKey := normalizeAreaToken(provinceRaw)
	regencyKey := normalizeAreaToken(regencyRaw)
	cacheKey := provinceKey + "|" + regencyKey
	if regencyKey == "" {
		return nil
	}
	if cached, ok := r.regencyCodes[cacheKey]; ok {
		return cached
	}

	provinceCodes := r.resolveProvinceCodes(provinceRaw)
	result := []string{}
	for _, provinceCode := range provinceCodes {
		rows, err := r.locationRepo.ListCityCache(strings.TrimSpace(provinceCode))
		if err != nil {
			continue
		}
		result = append(result, findMatchingLocationCodes(rows, regencyKey, regencyRaw)...)
	}
	if len(result) == 0 {
		result = append(result, strings.TrimSpace(regencyRaw))
	}
	result = dedupeTokens(result)
	r.regencyCodes[cacheKey] = result
	return result
}

func (r *exportLocationResolver) resolveRegencyName(provinceRaw, regencyRaw string) string {
	base := strings.TrimSpace(regencyRaw)
	regencyKey := normalizeAreaToken(base)
	if regencyKey == "" {
		return ""
	}
	cacheKey := normalizeAreaToken(provinceRaw) + "|" + regencyKey
	if cached, ok := r.regencyNameCache[cacheKey]; ok {
		return cached
	}

	provinceCodes := r.resolveProvinceCodes(provinceRaw)
	for _, provinceCode := range provinceCodes {
		rows, err := r.locationRepo.ListCityCache(strings.TrimSpace(provinceCode))
		if err != nil {
			continue
		}
		if name := findLocationName(rows, regencyKey); name != "" {
			r.regencyNameCache[cacheKey] = name
			return name
		}
	}
	r.regencyNameCache[cacheKey] = base
	return base
}

func (r *exportLocationResolver) resolveDistrictName(provinceRaw, regencyRaw, districtRaw string) string {
	base := strings.TrimSpace(districtRaw)
	districtKey := normalizeAreaToken(base)
	if districtKey == "" {
		return ""
	}
	cacheKey := normalizeAreaToken(provinceRaw) + "|" + normalizeAreaToken(regencyRaw) + "|" + districtKey
	if cached, ok := r.districtNameCache[cacheKey]; ok {
		return cached
	}

	provinceCodes := r.resolveProvinceCodes(provinceRaw)
	regencyCodes := r.resolveRegencyCodes(provinceRaw, regencyRaw)
	for _, provinceCode := range provinceCodes {
		for _, regencyCode := range regencyCodes {
			rows, err := r.locationRepo.ListDistrictCache(strings.TrimSpace(provinceCode), strings.TrimSpace(regencyCode))
			if err != nil {
				continue
			}
			if name := findLocationName(rows, districtKey); name != "" {
				r.districtNameCache[cacheKey] = name
				return name
			}
		}
	}
	r.districtNameCache[cacheKey] = base
	return base
}

func findMatchingLocationCodes(rows []domainlocation.LocationItem, normalizedValue, rawValue string) []string {
	result := make([]string, 0)
	if normalizedValue == "" {
		return result
	}
	for _, row := range rows {
		if strings.EqualFold(strings.TrimSpace(row.Code), normalizedValue) || strings.EqualFold(strings.TrimSpace(row.Name), normalizedValue) {
			if code := strings.TrimSpace(row.Code); code != "" {
				result = append(result, code)
			}
		}
	}
	if len(result) > 0 {
		return result
	}
	rawValue = strings.TrimSpace(rawValue)
	for _, row := range rows {
		if strings.EqualFold(strings.TrimSpace(row.Name), rawValue) {
			if code := strings.TrimSpace(row.Code); code != "" {
				result = append(result, code)
			}
		}
	}
	return result
}

func findLocationName(rows []domainlocation.LocationItem, normalizedValue string) string {
	for _, row := range rows {
		if strings.EqualFold(strings.TrimSpace(row.Code), normalizedValue) || strings.EqualFold(strings.TrimSpace(row.Name), normalizedValue) {
			if name := strings.TrimSpace(row.Name); name != "" {
				return name
			}
		}
	}
	return ""
}
