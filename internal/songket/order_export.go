package songket

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"starter-kit/internal/master"
	"starter-kit/utils"

	"github.com/oviekshgya/shago-lib/excel"
	"gorm.io/gorm"
)

const (
	orderExportStatusQueued     = "queued"
	orderExportStatusRunning    = "running"
	orderExportStatusCompleted  = "completed"
	orderExportStatusFailed     = "failed"
	orderExportStatusDownloaded = "downloaded"

	orderExportStorageDir = "storage/order-exports"
)

var (
	ErrOrderExportNotFound  = errors.New("order export job not found")
	ErrOrderExportForbidden = errors.New("you are not allowed to access this export job")
	ErrOrderExportNotReady  = errors.New("export file is not ready")
	ErrOrderExportFileGone  = errors.New("export file is no longer available")
)

type OrderExportJob struct {
	ID           string     `json:"id"`
	Status       string     `json:"status"`
	Progress     int        `json:"progress"`
	Message      string     `json:"message"`
	FileName     string     `json:"file_name,omitempty"`
	TotalRows    int        `json:"total_rows"`
	ExportedRows int        `json:"exported_rows"`
	FromDate     string     `json:"from_date"`
	ToDate       string     `json:"to_date"`
	Search       string     `json:"search,omitempty"`
	StatusFilter string     `json:"status_filter,omitempty"`
	CreatedBy    string     `json:"created_by,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	FinishedAt   *time.Time `json:"finished_at,omitempty"`
	Error        string     `json:"error,omitempty"`
	FilePath     string     `json:"-"`
}

type OrderExportDownload struct {
	FileName    string
	ContentType string
	Content     []byte
}

var orderExportJobStore = struct {
	mu   sync.RWMutex
	jobs map[string]*OrderExportJob
}{
	jobs: map[string]*OrderExportJob{},
}

func cloneOrderExportJob(job *OrderExportJob) OrderExportJob {
	if job == nil {
		return OrderExportJob{}
	}
	copied := *job
	return copied
}

func getOrderExportJobCopy(jobID string) (OrderExportJob, bool) {
	orderExportJobStore.mu.RLock()
	defer orderExportJobStore.mu.RUnlock()
	job, ok := orderExportJobStore.jobs[jobID]
	if !ok {
		return OrderExportJob{}, false
	}
	return cloneOrderExportJob(job), true
}

func upsertOrderExportJob(job *OrderExportJob) {
	orderExportJobStore.mu.Lock()
	defer orderExportJobStore.mu.Unlock()
	orderExportJobStore.jobs[job.ID] = job
}

func mutateOrderExportJob(jobID string, mutator func(*OrderExportJob)) {
	orderExportJobStore.mu.Lock()
	defer orderExportJobStore.mu.Unlock()
	job, ok := orderExportJobStore.jobs[jobID]
	if !ok {
		return
	}
	mutator(job)
	job.UpdatedAt = time.Now()
}

func validateOrderExportRequest(req OrderExportRequest) error {
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

func canAccessOrderExport(job *OrderExportJob, role, userID string) bool {
	if job == nil {
		return false
	}
	if role == utils.RoleDealer && strings.TrimSpace(job.CreatedBy) != strings.TrimSpace(userID) {
		return false
	}
	return true
}

func (s *Service) StartOrderExport(req OrderExportRequest, role, userID string) (OrderExportJob, error) {
	if err := validateOrderExportRequest(req); err != nil {
		return OrderExportJob{}, err
	}

	now := time.Now()
	jobID := utils.CreateUUID()
	job := &OrderExportJob{
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

func (s *Service) runOrderExport(jobID string, req OrderExportRequest, role, userID string) {
	mutateOrderExportJob(jobID, func(job *OrderExportJob) {
		job.Status = orderExportStatusRunning
		job.Progress = 10
		job.Message = "Collecting order-in data"
		job.Error = ""
	})

	orders, err := s.listOrdersForExport(req, role, userID)
	if err != nil {
		mutateOrderExportJob(jobID, func(job *OrderExportJob) {
			job.Status = orderExportStatusFailed
			job.Progress = 100
			job.Message = "Failed to collect order data"
			job.Error = err.Error()
			finishedAt := time.Now()
			job.FinishedAt = &finishedAt
		})
		return
	}

	mutateOrderExportJob(jobID, func(job *OrderExportJob) {
		job.Progress = 55
		job.Message = fmt.Sprintf("Generating Excel (%d rows)", len(orders))
		job.TotalRows = len(orders)
	})

	columns, rows := s.mapOrdersToExportRows(orders)
	if err := os.MkdirAll(orderExportStorageDir, 0o755); err != nil {
		mutateOrderExportJob(jobID, func(job *OrderExportJob) {
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
	result, err := excel.GenerateAndSave(excel.Request{
		FileName: fileName,
		Columns:  columns,
		Data:     rows,
	}, outputPath)
	if err != nil {
		mutateOrderExportJob(jobID, func(job *OrderExportJob) {
			job.Status = orderExportStatusFailed
			job.Progress = 100
			job.Message = "Failed to generate Excel file"
			job.Error = err.Error()
			finishedAt := time.Now()
			job.FinishedAt = &finishedAt
		})
		return
	}

	mutateOrderExportJob(jobID, func(job *OrderExportJob) {
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

func (s *Service) listOrdersForExport(req OrderExportRequest, role, userID string) ([]Order, error) {
	query := s.db.
		Model(&Order{}).
		Preload("Dealer").
		Preload("Job").
		Preload("MotorType").
		Preload("Attempts", func(db *gorm.DB) *gorm.DB {
			return db.Order("attempt_no ASC").Preload("FinanceCompany")
		})

	if role == utils.RoleDealer {
		query = query.Where("created_by = ?", strings.TrimSpace(userID))
	}

	if dealerID := strings.TrimSpace(req.DealerID); dealerID != "" {
		query = query.Where("dealer_id = ?", dealerID)
	}
	if financeCompanyID := strings.TrimSpace(req.FinanceCompanyID); financeCompanyID != "" {
		query = query.
			Joins("LEFT JOIN order_finance_attempts oa1 ON oa1.order_id = orders.id AND oa1.attempt_no = 1").
			Where("oa1.finance_company_id = ?", financeCompanyID)
	}
	if status := strings.ToLower(strings.TrimSpace(req.Status)); status != "" {
		query = query.Where("LOWER(result_status) = ?", status)
	}
	if search := strings.ToLower(strings.TrimSpace(req.Search)); search != "" {
		pattern := "%" + search + "%"
		query = query.Where(
			"LOWER(pooling_number) LIKE ? OR LOWER(consumer_name) LIKE ? OR LOWER(consumer_phone) LIKE ?",
			pattern,
			pattern,
			pattern,
		)
	}

	fromDate := strings.TrimSpace(req.FromDate)
	toDate := strings.TrimSpace(req.ToDate)
	query = query.Where(
		`(
			(DATE(orders.created_at) >= ? AND DATE(orders.created_at) <= ?)
			OR
			(DATE(orders.pooling_at) >= ? AND DATE(orders.pooling_at) <= ?)
		)`,
		fromDate,
		toDate,
		fromDate,
		toDate,
	)

	// Backward compatibility: some environments may not yet have orders.installment.
	if !s.db.Migrator().HasColumn(&Order{}, "installment") {
		query = query.Select(`
			orders.id,
			orders.pooling_number,
			orders.pooling_at,
			orders.result_at,
			orders.dealer_id,
			orders.consumer_name,
			orders.consumer_phone,
			orders.province,
			orders.regency,
			orders.district,
			orders.village,
			orders.address,
			orders.job_id,
			orders.motor_type_id,
			orders.otr,
			orders.dp_gross,
			orders.dp_paid,
			orders.dp_pct,
			orders.tenor,
			orders.result_status,
			orders.result_notes,
			orders.created_by,
			orders.created_at,
			orders.updated_at
		`)
	}

	var orders []Order
	if err := query.Order("pooling_at ASC").Find(&orders).Error; err != nil {
		return nil, err
	}

	return orders, nil
}

func (s *Service) mapOrdersToExportRows(orders []Order) ([]string, []map[string]any) {
	columns := []string{
		"No",
		"Pooling Number",
		"Pooling At",
		"Result At",
		"Dealer Name",
		"Consumer Name",
		"Consumer Phone",
		"Province",
		"Regency",
		"District",
		"Village",
		"Address",
		"Job Name",
		"Motor Type Name",
		"Motor Brand",
		"Motor Model",
		"Motor Variant Type",
		"Installment",
		"OTR",
		"DP Gross",
		"DP Paid",
		"DP Pct",
		"Tenor",
		"Result Status",
		"Result Notes",
		"Finance 1",
		"Status Finance 1",
		"Keterangan Finance 1",
		"Finance 2",
		"Status Finance 2",
		"Keterangan Finance 2",
	}

	rows := make([]map[string]any, 0, len(orders))
	locationResolver := newExportLocationResolver(s.db)
	for idx, order := range orders {
		attempt1, _ := findAttempt(order.Attempts, 1)
		attempt2, _ := findAttempt(order.Attempts, 2)

		provinceName := locationResolver.resolveProvinceName(order.Province)
		regencyName := locationResolver.resolveRegencyName(order.Province, order.Regency)
		districtName := locationResolver.resolveDistrictName(order.Province, order.Regency, order.District)

		row := map[string]any{
			"No":             idx + 1,
			"Pooling Number": strings.TrimSpace(order.PoolingNumber),
			"Pooling At":     formatExportTime(order.PoolingAt),
			"Result At":      formatExportTimePtr(order.ResultAt),
			"Dealer Name":    strings.TrimSpace(getOrderDealerName(order)),
			"Consumer Name":  strings.TrimSpace(order.ConsumerName),
			"Consumer Phone": strings.TrimSpace(order.ConsumerPhone),
			"Province":       strings.TrimSpace(provinceName),
			"Regency":        strings.TrimSpace(regencyName),
			"District":       strings.TrimSpace(districtName),
			"Village":        strings.TrimSpace(order.Village),
			"Address":        strings.TrimSpace(order.Address),
			"Job Name":       strings.TrimSpace(getOrderJobName(order)),
			"Motor Type Name": strings.TrimSpace(
				getOrderMotorTypeName(order),
			),
			"Motor Brand":        strings.TrimSpace(getOrderMotorBrand(order)),
			"Motor Model":        strings.TrimSpace(getOrderMotorModel(order)),
			"Motor Variant Type": strings.TrimSpace(getOrderMotorVariant(order)),
			"Installment":        order.Installment,
			"OTR":                order.OTR,
			"DP Gross":           order.DPGross,
			"DP Paid":            order.DPPaid,
			"DP Pct":             order.DPPct,
			"Tenor":              order.Tenor,
			"Result Status":      strings.TrimSpace(order.ResultStatus),
			"Result Notes":       strings.TrimSpace(order.ResultNotes),
			"Finance 1": strings.TrimSpace(
				getAttemptFinanceCompanyName(attempt1),
			),
			"Status Finance 1":     strings.TrimSpace(attempt1.Status),
			"Keterangan Finance 1": strings.TrimSpace(attempt1.Notes),
			"Finance 2": strings.TrimSpace(
				getAttemptFinanceCompanyName(attempt2),
			),
			"Status Finance 2":     strings.TrimSpace(attempt2.Status),
			"Keterangan Finance 2": strings.TrimSpace(attempt2.Notes),
		}
		rows = append(rows, row)
	}

	return columns, rows
}

type exportLocationResolver struct {
	db *gorm.DB

	provinceNameCache map[string]string
	provinceCodes     map[string][]string
	regencyNameCache  map[string]string
	regencyCodes      map[string][]string
	districtNameCache map[string]string
}

func newExportLocationResolver(db *gorm.DB) *exportLocationResolver {
	return &exportLocationResolver{
		db:                db,
		provinceNameCache: map[string]string{},
		provinceCodes:     map[string][]string{},
		regencyNameCache:  map[string]string{},
		regencyCodes:      map[string][]string{},
		districtNameCache: map[string]string{},
	}
}

func normalizeAreaToken(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

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

	var rows []master.MasterProvince
	if err := r.db.
		Model(&master.MasterProvince{}).
		Select("code", "name").
		Where("LOWER(code) = ? OR LOWER(name) = ?", cacheKey, cacheKey).
		Find(&rows).Error; err != nil {
		result := dedupeTokens([]string{base})
		r.provinceCodes[cacheKey] = result
		return result
	}

	result := make([]string, 0, len(rows)+1)
	for _, row := range rows {
		if code := strings.TrimSpace(row.Code); code != "" {
			result = append(result, code)
		}
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

	var row master.MasterProvince
	if err := r.db.
		Model(&master.MasterProvince{}).
		Select("name").
		Where("LOWER(code) = ? OR LOWER(name) = ?", cacheKey, cacheKey).
		First(&row).Error; err == nil {
		name := strings.TrimSpace(row.Name)
		if name != "" {
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
		var rows []master.MasterRegency
		if err := r.db.
			Model(&master.MasterRegency{}).
			Select("code").
			Where("province_code = ? AND (LOWER(code) = ? OR LOWER(name) = ?)", strings.TrimSpace(provinceCode), regencyKey, regencyKey).
			Find(&rows).Error; err != nil {
			continue
		}
		for _, row := range rows {
			if code := strings.TrimSpace(row.Code); code != "" {
				result = append(result, code)
			}
		}
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
		var row master.MasterRegency
		if err := r.db.
			Model(&master.MasterRegency{}).
			Select("name").
			Where("province_code = ? AND (LOWER(code) = ? OR LOWER(name) = ?)", strings.TrimSpace(provinceCode), regencyKey, regencyKey).
			First(&row).Error; err == nil {
			name := strings.TrimSpace(row.Name)
			if name != "" {
				r.regencyNameCache[cacheKey] = name
				return name
			}
		}
	}

	var fallback master.MasterRegency
	if err := r.db.
		Model(&master.MasterRegency{}).
		Select("name").
		Where("LOWER(code) = ? OR LOWER(name) = ?", regencyKey, regencyKey).
		First(&fallback).Error; err == nil {
		name := strings.TrimSpace(fallback.Name)
		if name != "" {
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
			var row master.MasterDistrict
			if err := r.db.
				Model(&master.MasterDistrict{}).
				Select("name").
				Where(
					"province_code = ? AND regency_code = ? AND (LOWER(code) = ? OR LOWER(name) = ?)",
					strings.TrimSpace(provinceCode),
					strings.TrimSpace(regencyCode),
					districtKey,
					districtKey,
				).
				First(&row).Error; err == nil {
				name := strings.TrimSpace(row.Name)
				if name != "" {
					r.districtNameCache[cacheKey] = name
					return name
				}
			}
		}
	}

	var fallback master.MasterDistrict
	if err := r.db.
		Model(&master.MasterDistrict{}).
		Select("name").
		Where("LOWER(code) = ? OR LOWER(name) = ?", districtKey, districtKey).
		First(&fallback).Error; err == nil {
		name := strings.TrimSpace(fallback.Name)
		if name != "" {
			r.districtNameCache[cacheKey] = name
			return name
		}
	}

	r.districtNameCache[cacheKey] = base
	return base
}

func getOrderDealerName(order Order) string {
	if order.Dealer == nil {
		return ""
	}
	return order.Dealer.Name
}

func getOrderJobName(order Order) string {
	if order.Job == nil {
		return ""
	}
	return order.Job.Name
}

func getOrderMotorTypeName(order Order) string {
	if order.MotorType == nil {
		return ""
	}
	return order.MotorType.Name
}

func getOrderMotorBrand(order Order) string {
	if order.MotorType == nil {
		return ""
	}
	return order.MotorType.Brand
}

func getOrderMotorModel(order Order) string {
	if order.MotorType == nil {
		return ""
	}
	return order.MotorType.Model
}

func getOrderMotorVariant(order Order) string {
	if order.MotorType == nil {
		return ""
	}
	return order.MotorType.VariantType
}

func getAttemptFinanceCompanyName(attempt OrderFinanceAttempt) string {
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

func (s *Service) GetOrderExportJob(jobID, role, userID string) (OrderExportJob, error) {
	raw, exists := getOrderExportJobCopy(strings.TrimSpace(jobID))
	if !exists {
		return OrderExportJob{}, ErrOrderExportNotFound
	}
	if !canAccessOrderExport(&raw, role, userID) {
		return OrderExportJob{}, ErrOrderExportForbidden
	}
	return raw, nil
}

func (s *Service) DownloadOrderExportFile(jobID, role, userID string) (OrderExportDownload, error) {
	raw, exists := getOrderExportJobCopy(strings.TrimSpace(jobID))
	if !exists {
		return OrderExportDownload{}, ErrOrderExportNotFound
	}
	if !canAccessOrderExport(&raw, role, userID) {
		return OrderExportDownload{}, ErrOrderExportForbidden
	}

	if raw.Status != orderExportStatusCompleted || strings.TrimSpace(raw.FilePath) == "" {
		return OrderExportDownload{}, ErrOrderExportNotReady
	}

	filePath := strings.TrimSpace(raw.FilePath)
	content, err := os.ReadFile(filePath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			mutateOrderExportJob(raw.ID, func(job *OrderExportJob) {
				job.Status = orderExportStatusFailed
				job.Progress = 100
				job.Message = "Export file is missing"
				job.Error = ErrOrderExportFileGone.Error()
				job.FilePath = ""
				finishedAt := time.Now()
				job.FinishedAt = &finishedAt
			})
			return OrderExportDownload{}, ErrOrderExportFileGone
		}
		return OrderExportDownload{}, err
	}

	fileName := strings.TrimSpace(raw.FileName)
	if fileName == "" {
		fileName = filepath.Base(filePath)
	}

	if removeErr := os.Remove(filePath); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
		return OrderExportDownload{}, removeErr
	}

	mutateOrderExportJob(raw.ID, func(job *OrderExportJob) {
		job.Status = orderExportStatusDownloaded
		job.Progress = 100
		job.Message = "File downloaded"
		job.FilePath = ""
		finishedAt := time.Now()
		job.FinishedAt = &finishedAt
	})

	return OrderExportDownload{
		FileName:    fileName,
		ContentType: excel.ContentTypeXLSX,
		Content:     content,
	}, nil
}
