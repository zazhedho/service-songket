package servicecommodity

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	domaincommodity "service-songket/internal/domain/commodity"
	"service-songket/internal/dto"
	interfacecommodity "service-songket/internal/interfaces/commodity"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo interfacecommodity.RepoCommodityInterface
}

type scrapedItem struct {
	Name      string
	Price     float64
	Unit      string
	SourceURL string
	ScrapedAt time.Time
	Raw       map[string]interface{}
}

type panganScrapePayload struct {
	URL                  string                   `json:"url"`
	Rows                 []map[string]interface{} `json:"rows"`
	FoundContainer       *bool                    `json:"found_container,omitempty"`
	DebugLinesCount      *int                     `json:"debug_lines_count,omitempty"`
	DebugContainerSample string                   `json:"debug_container_sample,omitempty"`
	DebugReason          string                   `json:"debug_reason,omitempty"`
	DebugAPIFallbackUsed *bool                    `json:"debug_api_fallback_used,omitempty"`
	DebugAPIRowsCount    *int                     `json:"debug_api_rows_count,omitempty"`
	DebugAPIError        string                   `json:"debug_api_error,omitempty"`
}

type scrapeURLDiagnostic struct {
	SourceURL            string
	ParsedRows           int
	AcceptedRows         int
	RejectedInvalidName  int
	RejectedInvalidPrice int
	FoundContainer       *bool
	DebugLinesCount      *int
	DebugReason          string
	DebugSample          string
	DebugAPIFallbackUsed *bool
	DebugAPIRowsCount    *int
	DebugAPIError        string
}

func NewCommodityService(repo interfacecommodity.RepoCommodityInterface) *Service {
	return &Service{repo: repo}
}

func (s *Service) Upsert(req dto.CommodityRequest) (domaincommodity.Commodity, error) {
	name := strings.TrimSpace(req.Name)
	unit := strings.TrimSpace(req.Unit)

	row, err := s.repo.GetCommodityByName(name)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = domaincommodity.Commodity{
			Id:   utils.CreateUUID(),
			Name: name,
			Unit: unit,
		}
		if err := s.repo.StoreCommodity(row); err != nil {
			return domaincommodity.Commodity{}, err
		}
		return row, nil
	}
	if err != nil {
		return domaincommodity.Commodity{}, err
	}

	row.Unit = unit
	if err := s.repo.UpdateCommodity(row); err != nil {
		return domaincommodity.Commodity{}, err
	}
	return row, nil
}

func (s *Service) AddPrice(req dto.CommodityPriceRequest) (domaincommodity.CommodityPrice, error) {
	var commodity domaincommodity.Commodity
	var err error

	if strings.TrimSpace(req.CommodityID) != "" {
		commodity, err = s.repo.GetCommodityByID(req.CommodityID)
		if err != nil {
			return domaincommodity.CommodityPrice{}, fmt.Errorf("commodity not found")
		}
	} else {
		name := strings.TrimSpace(req.CommodityName)
		if name == "" {
			return domaincommodity.CommodityPrice{}, fmt.Errorf("commodity_name is required")
		}
		commodity, err = s.repo.GetCommodityByName(name)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			commodity = domaincommodity.Commodity{
				Id:   utils.CreateUUID(),
				Name: name,
				Unit: strings.TrimSpace(req.Unit),
			}
			if commodity.Unit == "" {
				commodity.Unit = "unit"
			}
			if err := s.repo.StoreCommodity(commodity); err != nil {
				return domaincommodity.CommodityPrice{}, err
			}
		} else if err != nil {
			return domaincommodity.CommodityPrice{}, err
		}
	}

	collectedAt := time.Now()
	if raw := strings.TrimSpace(req.CollectedAt); raw != "" {
		if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
			collectedAt = parsed
		}
	}

	price := domaincommodity.CommodityPrice{
		Id:          utils.CreateUUID(),
		CommodityID: commodity.Id,
		Price:       req.Price,
		CollectedAt: collectedAt,
		SourceURL:   strings.TrimSpace(req.SourceURL),
	}
	if err := s.repo.StorePrice(price); err != nil {
		return domaincommodity.CommodityPrice{}, err
	}
	price.Commodity = &commodity
	return price, nil
}

func (s *Service) LatestPrices() ([]domaincommodity.CommodityPrice, error) {
	commodities, err := s.repo.GetAllCommodities()
	if err != nil {
		return nil, err
	}

	result := make([]domaincommodity.CommodityPrice, 0, len(commodities))
	for _, commodity := range commodities {
		price, err := s.repo.GetLatestPriceByCommodityID(commodity.Id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				continue
			}
			return nil, err
		}
		price.Commodity = &commodity
		result = append(result, price)
	}
	return result, nil
}

func (s *Service) ListCommodities() ([]domaincommodity.Commodity, error) {
	return s.repo.GetAllCommodities()
}

func (s *Service) ListPrices(params filter.BaseParams) ([]domaincommodity.CommodityPrice, int64, error) {
	return s.repo.GetAllPrices(params)
}

func (s *Service) DeletePrice(id string) error {
	return s.repo.DeletePrice(id)
}

func (s *Service) Scrape(ctx context.Context, urls []string) ([]domaincommodity.CommodityPrice, error) {
	if len(urls) == 0 {
		urls = s.defaultScrapeURLs("prices")
	}
	return s.scrapeViaPython(ctx, urls)
}

func (s *Service) CreateScrapeJob(urls []string) (domaincommodity.ScrapeJob, error) {
	if len(urls) == 0 {
		urls = s.defaultScrapeURLs("prices")
	}
	if len(urls) == 0 {
		return domaincommodity.ScrapeJob{}, fmt.Errorf("no urls to scrape")
	}
	raw, _ := json.Marshal(urls)
	job := domaincommodity.ScrapeJob{
		Id:         utils.CreateUUID(),
		Status:     "pending",
		SourceUrls: raw,
	}
	if err := s.repo.StoreScrapeJob(job); err != nil {
		return domaincommodity.ScrapeJob{}, err
	}
	go s.runScrapeJob(job.Id, urls)
	return job, nil
}

func (s *Service) ListScrapeJobs(params filter.BaseParams) ([]domaincommodity.ScrapeJob, int64, error) {
	return s.repo.GetAllScrapeJobs(params)
}

func (s *Service) ListScrapeResults(jobID string, params filter.BaseParams) ([]domaincommodity.ScrapeResult, int64, error) {
	return s.repo.GetAllScrapeResults(jobID, params)
}

func (s *Service) CommitScrapeResults(jobID string, resultIDs []string) ([]domaincommodity.CommodityPrice, error) {
	if len(resultIDs) == 0 {
		return nil, fmt.Errorf("result_ids is required")
	}
	rows, err := s.repo.GetScrapeResults(jobID, resultIDs)
	if err != nil {
		return nil, err
	}
	return s.repo.CommitScrapeResults(rows)
}

func (s *Service) runScrapeJob(jobID string, urls []string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	startedAt := time.Now()
	_ = s.repo.UpdateScrapeJobFields(jobID, map[string]interface{}{
		"status":     "running",
		"started_at": startedAt,
	})

	items, err := s.fetchScrapedItems(ctx, urls)
	if err != nil {
		_ = s.repo.UpdateScrapeJobFields(jobID, map[string]interface{}{
			"status":      "error",
			"message":     sanitizeLogValue(err.Error(), 1800),
			"finished_at": time.Now(),
		})
		return
	}

	for _, item := range items {
		raw, _ := json.Marshal(item.Raw)
		_ = s.repo.StoreScrapeResult(domaincommodity.ScrapeResult{
			Id:            utils.CreateUUID(),
			JobID:         jobID,
			CommodityName: item.Name,
			Price:         item.Price,
			Unit:          item.Unit,
			SourceURL:     item.SourceURL,
			ScrapedAt:     item.ScrapedAt,
			Raw:           raw,
		})
	}

	_ = s.repo.UpdateScrapeJobFields(jobID, map[string]interface{}{
		"status":      "success",
		"message":     fmt.Sprintf("found %d rows", len(items)),
		"finished_at": time.Now(),
	})
}

func (s *Service) defaultScrapeURLs(sourceType string) []string {
	urls, err := s.repo.ListActiveScrapeSourceURLs(sourceType)
	if err == nil && len(urls) > 0 {
		return urls
	}
	if sourceType == "news" {
		if fallback := strings.TrimSpace(utils.GetEnv("SCRAPE_NEWS_URL", "").(string)); fallback != "" {
			return []string{fallback}
		}
		return nil
	}
	if fallback := strings.TrimSpace(utils.GetEnv("SCRAPE_PANGAN_URL", "").(string)); fallback != "" {
		return []string{fallback}
	}
	return nil
}

func (s *Service) scrapeViaPython(ctx context.Context, urls []string) ([]domaincommodity.CommodityPrice, error) {
	items, err := s.fetchScrapedItems(ctx, urls)
	if err != nil {
		return nil, err
	}

	collected := time.Now()
	result := make([]domaincommodity.CommodityPrice, 0, len(items))
	for _, item := range items {
		if item.Name == "" {
			continue
		}

		commodity, err := s.repo.GetCommodityByName(item.Name)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			commodity = domaincommodity.Commodity{Id: utils.CreateUUID(), Name: item.Name, Unit: item.Unit}
			_ = s.repo.StoreCommodity(commodity)
		} else if err != nil {
			return nil, err
		}

		price := domaincommodity.CommodityPrice{
			Id:          utils.CreateUUID(),
			CommodityID: commodity.Id,
			Price:       item.Price,
			CollectedAt: collected,
			SourceURL:   item.SourceURL,
		}
		if err := s.repo.StorePrice(price); err == nil {
			price.Commodity = &commodity
			result = append(result, price)
		}
	}
	return result, nil
}

func (s *Service) fetchScrapedItems(ctx context.Context, urls []string) ([]scrapedItem, error) {
	if len(urls) == 0 {
		return nil, fmt.Errorf("no urls to scrape")
	}

	collected := time.Now()
	result := make([]scrapedItem, 0)

	scriptPath := strings.TrimSpace(utils.GetEnv("SCRAPE_PANGAN_SCRIPT", "").(string))
	if scriptPath == "" {
		scriptPath = "python/songket-scraping/scrape_pangan_html.py"
	}
	resolvedScriptPath, err := resolvePythonScriptPath(scriptPath)
	if err != nil {
		return nil, fmt.Errorf("invalid SCRAPE_PANGAN_SCRIPT: %w", err)
	}

	pyRunner := strings.TrimSpace(utils.GetEnv("SCRAPE_PANGAN_PYTHON", "").(string))
	if pyRunner == "" {
		pyRunner = "python3"
	}
	if err := validatePythonRunner(pyRunner); err != nil {
		return nil, err
	}

	diagnostics := make([]scrapeURLDiagnostic, 0, len(urls))
	for _, rawURL := range urls {
		sourceURL := strings.TrimSpace(rawURL)
		if sourceURL == "" {
			continue
		}

		diag := scrapeURLDiagnostic{SourceURL: sourceURL}
		cmd := exec.CommandContext(ctx, pyRunner, resolvedScriptPath, sourceURL)
		output, err := cmd.CombinedOutput()
		if err != nil {
			msg := sanitizeLogValue(string(output), 400)
			if msg == "" {
				return nil, fmt.Errorf("python scrape error (%s): runner=%s script=%s: %w", sourceURL, pyRunner, resolvedScriptPath, err)
			}
			return nil, fmt.Errorf("python scrape error (%s): runner=%s script=%s: %w: %s", sourceURL, pyRunner, resolvedScriptPath, err, msg)
		}

		rows, payload, err := parsePythonScrapeRows(output)
		if err != nil {
			snippet := sanitizeLogValue(string(output), 400)
			if snippet == "" {
				return nil, fmt.Errorf("parse python output (%s): runner=%s script=%s: %w", sourceURL, pyRunner, resolvedScriptPath, err)
			}
			return nil, fmt.Errorf("parse python output (%s): runner=%s script=%s: %w; output=%s", sourceURL, pyRunner, resolvedScriptPath, err, snippet)
		}
		diag.ParsedRows = len(rows)
		diag.FoundContainer = payload.FoundContainer
		diag.DebugLinesCount = payload.DebugLinesCount
		diag.DebugReason = strings.TrimSpace(payload.DebugReason)
		diag.DebugSample = sanitizeLogValue(payload.DebugContainerSample, 120)
		diag.DebugAPIFallbackUsed = payload.DebugAPIFallbackUsed
		diag.DebugAPIRowsCount = payload.DebugAPIRowsCount
		diag.DebugAPIError = sanitizeLogValue(payload.DebugAPIError, 120)

		for _, row := range rows {
			name := strings.TrimSpace(firstString(row, "name", "nama", "komoditas", "commodity", "wilayah"))
			if !isLikelyCommodityName(name) {
				diag.RejectedInvalidName++
				continue
			}
			price := firstFloat(row, "price", "harga")
			if price <= 0 || price > 1000000 {
				diag.RejectedInvalidPrice++
				continue
			}

			unit := firstString(row, "unit", "satuan")
			source := firstString(row, "source_url", "url")
			if source == "" {
				source = sourceURL
			}

			result = append(result, scrapedItem{
				Name:      name,
				Price:     price,
				Unit:      unit,
				SourceURL: source,
				ScrapedAt: collected,
				Raw:       row,
			})
			diag.AcceptedRows++
		}
		diagnostics = append(diagnostics, diag)
	}

	if len(result) == 0 {
		return nil, errors.New(buildNoValidCommodityMessage(pyRunner, resolvedScriptPath, diagnostics))
	}
	return result, nil
}

func resolvePythonScriptPath(scriptPath string) (string, error) {
	path := strings.TrimSpace(scriptPath)
	if path == "" {
		return "", fmt.Errorf("script path is empty")
	}
	if info, err := os.Stat(path); err == nil {
		if info.IsDir() {
			return "", fmt.Errorf("script path is a directory: %s", path)
		}
		return path, nil
	}
	if filepath.IsAbs(path) {
		return "", fmt.Errorf("script file not found: %s", path)
	}
	executablePath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("script file not found: %s", path)
	}
	absoluteCandidate := filepath.Join(filepath.Dir(executablePath), path)
	info, err := os.Stat(absoluteCandidate)
	if err != nil {
		return "", fmt.Errorf("script file not found: %s (also tried %s)", path, absoluteCandidate)
	}
	if info.IsDir() {
		return "", fmt.Errorf("script path is a directory: %s", absoluteCandidate)
	}
	return absoluteCandidate, nil
}

func validatePythonRunner(pyRunner string) error {
	runner := strings.TrimSpace(pyRunner)
	if runner == "" {
		return fmt.Errorf("SCRAPE_PANGAN_PYTHON is empty")
	}
	if strings.ContainsRune(runner, '/') {
		info, err := os.Stat(runner)
		if err != nil {
			return fmt.Errorf("python runner not found at %s: %w", runner, err)
		}
		if info.IsDir() {
			return fmt.Errorf("python runner is a directory: %s", runner)
		}
		return nil
	}
	resolved, err := exec.LookPath(runner)
	if err != nil {
		return fmt.Errorf("python runner %q not found in PATH", runner)
	}
	if _, err := os.Stat(resolved); err != nil {
		return fmt.Errorf("python runner %q is not accessible: %w", resolved, err)
	}
	return nil
}

func sanitizeLogValue(raw string, limit int) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	value = strings.Join(strings.Fields(value), " ")
	if limit <= 0 || len(value) <= limit {
		return value
	}
	if limit <= 3 {
		return value[:limit]
	}
	return value[:limit-3] + "..."
}

func buildNoValidCommodityMessage(pyRunner, scriptPath string, diagnostics []scrapeURLDiagnostic) string {
	parts := []string{fmt.Sprintf("no valid commodity rows found (runner=%s script=%s)", pyRunner, scriptPath)}
	if wd, err := os.Getwd(); err == nil {
		parts = append(parts, fmt.Sprintf("cwd=%s", wd))
	}
	if len(diagnostics) == 0 {
		parts = append(parts, "no scrape diagnostics captured")
		return sanitizeLogValue(strings.Join(parts, "; "), 900)
	}

	urlDetails := make([]string, 0, len(diagnostics))
	for _, diag := range diagnostics {
		chunks := []string{
			fmt.Sprintf("url=%s", diag.SourceURL),
			fmt.Sprintf("rows=%d", diag.ParsedRows),
			fmt.Sprintf("accepted=%d", diag.AcceptedRows),
			fmt.Sprintf("reject_name=%d", diag.RejectedInvalidName),
			fmt.Sprintf("reject_price=%d", diag.RejectedInvalidPrice),
		}
		if diag.FoundContainer != nil {
			chunks = append(chunks, fmt.Sprintf("found_container=%t", *diag.FoundContainer))
		}
		if diag.DebugLinesCount != nil {
			chunks = append(chunks, fmt.Sprintf("lines=%d", *diag.DebugLinesCount))
		}
		if diag.DebugReason != "" {
			chunks = append(chunks, fmt.Sprintf("reason=%s", sanitizeLogValue(diag.DebugReason, 80)))
		}
		if diag.DebugSample != "" {
			chunks = append(chunks, fmt.Sprintf("sample=%s", sanitizeLogValue(diag.DebugSample, 80)))
		}
		if diag.DebugAPIFallbackUsed != nil {
			chunks = append(chunks, fmt.Sprintf("api_fallback=%t", *diag.DebugAPIFallbackUsed))
		}
		if diag.DebugAPIRowsCount != nil {
			chunks = append(chunks, fmt.Sprintf("api_rows=%d", *diag.DebugAPIRowsCount))
		}
		if diag.DebugAPIError != "" {
			chunks = append(chunks, fmt.Sprintf("api_error=%s", sanitizeLogValue(diag.DebugAPIError, 80)))
		}
		urlDetails = append(urlDetails, strings.Join(chunks, " "))
	}
	parts = append(parts, "details="+strings.Join(urlDetails, " | "))
	return sanitizeLogValue(strings.Join(parts, "; "), 1800)
}

func parsePythonScrapeRows(output []byte) ([]map[string]interface{}, panganScrapePayload, error) {
	var payload panganScrapePayload
	if err := json.Unmarshal(output, &payload); err == nil && payload.Rows != nil {
		return payload.Rows, payload, nil
	}
	var rows []map[string]interface{}
	if err := json.Unmarshal(output, &rows); err == nil {
		payload.Rows = rows
		return rows, payload, nil
	}
	if err := json.Unmarshal(output, &payload); err != nil {
		return nil, payload, err
	}
	return payload.Rows, payload, nil
}

func isLikelyCommodityName(name string) bool {
	name = strings.TrimSpace(name)
	if name == "" || len(name) < 3 || len(name) > 80 {
		return false
	}
	if strings.Contains(name, "\t") {
		return false
	}
	lower := strings.ToLower(name)
	reject := []string{
		"beranda", "regulasi", "profil", "peta status harga pangan",
		"grafik perkembangan harga pangan", "informasi harga pangan", "jenis data panel",
		"pilih wilayah", "tampilkan", "harga rata-rata komoditas", "hari ini",
		"harga dibandingkan", "peta harga nasional", "periode", "intervensi", "het", "provinsi", "zona",
	}
	for _, keyword := range reject {
		if strings.Contains(lower, keyword) {
			return false
		}
	}
	return true
}

func firstString(m map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if value, ok := m[key]; ok {
			switch typed := value.(type) {
			case string:
				return typed
			case fmt.Stringer:
				return typed.String()
			}
		}
	}
	return ""
}

func firstFloat(m map[string]interface{}, keys ...string) float64 {
	for _, key := range keys {
		if value, ok := m[key]; ok {
			switch typed := value.(type) {
			case float64:
				return typed
			case int:
				return float64(typed)
			case int64:
				return float64(typed)
			case json.Number:
				if f, err := typed.Float64(); err == nil {
					return f
				}
			case string:
				if f, err := strconv.ParseFloat(typed, 64); err == nil {
					return f
				}
			}
		}
	}
	return 0
}
