package servicecommodity

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
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

func (s *Service) AutoImport(ctx context.Context) (int, error) {
	rows, err := s.Scrape(ctx, nil)
	if err != nil {
		return 0, err
	}
	return len(rows), nil
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
