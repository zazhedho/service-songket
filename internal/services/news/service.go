package servicenews

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	domainnews "service-songket/internal/domain/news"
	"service-songket/internal/dto"
	interfacenews "service-songket/internal/interfaces/news"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

var errNewsAlreadyAdded = errors.New("news already added")

type Service struct {
	repo interfacenews.RepoNewsInterface
}

type newsScrapeTarget struct {
	URL      string
	SourceID string
	Category string
}

type newsScraperCommand struct {
	Bin  string
	Args []string
}

func NewNewsService(repo interfacenews.RepoNewsInterface) *Service {
	return &Service{repo: repo}
}

func (s *Service) UpsertSource(req dto.NewsSourceRequest) (domainnews.NewsSource, error) {
	name := strings.TrimSpace(req.Name)
	row, err := s.repo.GetSourceByName(name)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = domainnews.NewsSource{
			Id:       utils.CreateUUID(),
			Name:     name,
			URL:      strings.TrimSpace(req.URL),
			Category: strings.TrimSpace(req.Category),
		}
		if err := s.repo.StoreSource(row); err != nil {
			return domainnews.NewsSource{}, err
		}
		return row, nil
	}
	if err != nil {
		return domainnews.NewsSource{}, err
	}

	row.URL = strings.TrimSpace(req.URL)
	row.Category = strings.TrimSpace(req.Category)
	if err := s.repo.UpdateSource(row); err != nil {
		return domainnews.NewsSource{}, err
	}
	return row, nil
}

func (s *Service) ListSources(params filter.BaseParams) ([]domainnews.NewsSource, int64, error) {
	return s.repo.GetAllSources(params)
}

func (s *Service) Latest(category string) (map[string]domainnews.NewsItem, error) {
	sources, err := s.repo.GetSources(category)
	if err != nil {
		return nil, err
	}

	result := make(map[string]domainnews.NewsItem)
	for _, source := range sources {
		item, err := s.repo.GetLatestItemBySource(source.Id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				continue
			}
			return nil, err
		}
		item.Content = sanitizeNewsContent(item.Content)
		result[source.Name] = item
	}
	return result, nil
}

func (s *Service) ListItems(category string, params filter.BaseParams) ([]domainnews.NewsItem, int64, error) {
	rows, total, err := s.repo.GetAllItems(category, params)
	if err != nil {
		return nil, 0, err
	}
	for i := range rows {
		if strings.TrimSpace(rows[i].SourceName) == "" {
			if rows[i].Source != nil && strings.TrimSpace(rows[i].Source.Name) != "" {
				rows[i].SourceName = strings.TrimSpace(rows[i].Source.Name)
			} else {
				rows[i].SourceName = strings.TrimSpace(hostFromURL(rows[i].URL))
			}
		}
		rows[i].Content = sanitizeNewsContent(rows[i].Content)
	}
	return rows, total, nil
}

func (s *Service) DeleteItem(id string) error {
	return s.repo.DeleteItem(id)
}

func (s *Service) Scrape(ctx context.Context, urls []string) ([]domainnews.NewsScrapedArticle, error) {
	if len(urls) > 0 {
		return s.scrapeFromURLs(ctx, urls)
	}

	sources, err := s.repo.GetSources("")
	if err != nil {
		return nil, err
	}

	targets := make([]newsScrapeTarget, 0, len(sources))
	for _, source := range sources {
		url := strings.TrimSpace(source.URL)
		if url == "" {
			continue
		}
		targets = append(targets, newsScrapeTarget{
			URL:      url,
			SourceID: source.Id,
			Category: source.Category,
		})
	}

	if len(targets) == 0 {
		for _, rawURL := range s.defaultScrapeURLs() {
			rawURL = strings.TrimSpace(rawURL)
			if rawURL == "" {
				continue
			}
			targets = append(targets, newsScrapeTarget{URL: rawURL})
		}
	}
	if len(targets) == 0 {
		return nil, fmt.Errorf("no news sources configured")
	}

	return s.scrapeTargets(ctx, targets)
}

func (s *Service) Import(items []domainnews.NewsScrapedArticle) ([]domainnews.NewsItem, error) {
	if len(items) == 0 {
		return nil, fmt.Errorf("items is required")
	}

	saved := make([]domainnews.NewsItem, 0, len(items))
	errs := make([]string, 0)
	duplicateFound := false
	seenURL := map[string]struct{}{}

	for _, row := range items {
		title := strings.TrimSpace(row.Title)
		rawURL := strings.TrimSpace(row.URL)
		if title == "" || rawURL == "" {
			continue
		}

		key := normalizeNewsURL(rawURL)
		if key == "" {
			key = strings.TrimSpace(strings.ToLower(rawURL))
		}
		if _, exists := seenURL[key]; exists {
			continue
		}
		seenURL[key] = struct{}{}

		sourceID := validUUIDOrEmpty(row.SourceID)
		category := strings.TrimSpace(row.Category)
		sourceURL := strings.TrimSpace(row.SourceURL)
		if sourceURL == "" {
			sourceURL = baseSiteURL(rawURL)
		}
		if sourceID == "" {
			resolvedSourceID, resolvedCategory, err := s.ensureNewsSourceForURL(sourceURL, category)
			if err == nil {
				sourceID = resolvedSourceID
				if category == "" {
					category = resolvedCategory
				}
			}
		}

		published := time.Now()
		if rawTime := strings.TrimSpace(row.CreatedAt); rawTime != "" {
			if t, ok := parseNewsTime(rawTime); ok {
				published = t
			}
		}

		item, err := s.upsertNewsItem(row, sourceID, category, published)
		if err != nil {
			if errors.Is(err, errNewsAlreadyAdded) {
				duplicateFound = true
				continue
			}
			errs = append(errs, fmt.Sprintf("%s: %v", rawURL, err))
			continue
		}
		saved = append(saved, item)
	}

	switch {
	case len(saved) > 0:
		return saved, nil
	case duplicateFound && len(errs) == 0:
		return nil, errNewsAlreadyAdded
	case len(errs) == 0:
		return nil, fmt.Errorf("no valid selected news")
	default:
		return nil, fmt.Errorf("news import failed: %s", strings.Join(errs, "; "))
	}
}

func (s *Service) AutoImport(ctx context.Context) (int, int, error) {
	rows, err := s.Scrape(ctx, nil)
	if err != nil {
		return 0, 0, err
	}
	if len(rows) == 0 {
		return 0, 0, nil
	}

	saved, err := s.Import(rows)
	if err != nil {
		if errors.Is(err, errNewsAlreadyAdded) {
			return 0, len(rows), nil
		}
		return 0, 0, err
	}

	imported := len(saved)
	skipped := 0
	if len(rows) > imported {
		skipped = len(rows) - imported
	}

	return imported, skipped, nil
}

func (s *Service) scrapeFromURLs(ctx context.Context, urls []string) ([]domainnews.NewsScrapedArticle, error) {
	if len(urls) == 0 {
		urls = s.defaultScrapeURLs()
	}
	if len(urls) == 0 {
		return nil, fmt.Errorf("urls is required")
	}

	sources, err := s.repo.GetSources("")
	if err != nil {
		return nil, err
	}
	sourceByURL := make(map[string]domainnews.NewsSource, len(sources))
	for _, source := range sources {
		key := baseSiteURL(source.URL)
		if key != "" {
			sourceByURL[key] = source
		}
	}

	targets := make([]newsScrapeTarget, 0, len(urls))
	for _, raw := range urls {
		url := strings.TrimSpace(raw)
		if url == "" {
			continue
		}
		target := newsScrapeTarget{URL: url}
		if source, ok := sourceByURL[baseSiteURL(url)]; ok {
			target.SourceID = source.Id
			target.Category = source.Category
		}
		targets = append(targets, target)
	}
	if len(targets) == 0 {
		return nil, fmt.Errorf("urls is required")
	}

	return s.scrapeTargets(ctx, targets)
}

func (s *Service) scrapeTargets(ctx context.Context, targets []newsScrapeTarget) ([]domainnews.NewsScrapedArticle, error) {
	limit := 15
	if rawLimit := strings.TrimSpace(utils.GetEnv("SCRAPE_BERITA_LIMIT", "").(string)); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil && parsed > 0 && parsed <= 50 {
			limit = parsed
		}
	}

	result := make([]domainnews.NewsScrapedArticle, 0)
	seenURL := make(map[string]struct{})
	errs := make([]string, 0)

	for _, target := range targets {
		sourceID := validUUIDOrEmpty(target.SourceID)
		if sourceID == "" {
			resolvedSourceID, resolvedCategory, err := s.ensureNewsSourceForURL(target.URL, target.Category)
			if err == nil {
				sourceID = resolvedSourceID
				if target.Category == "" {
					target.Category = resolvedCategory
				}
			}
		}

		output, err := s.runNewsScraper(ctx, target.URL, limit)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", target.URL, err))
			continue
		}

		articles, err := parsePythonNewsArticles(output)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", target.URL, err))
			continue
		}

		for _, article := range articles {
			if strings.TrimSpace(article.URL) == "" || strings.TrimSpace(article.Title) == "" {
				continue
			}
			article.SourceID = sourceID
			article.SourceURL = target.URL
			if article.Category == "" {
				article.Category = target.Category
			}
			if article.Source == "" {
				article.Source = strings.TrimSpace(hostFromURL(article.URL))
			}

			key := normalizeNewsURL(article.URL)
			if key == "" {
				key = strings.TrimSpace(strings.ToLower(article.URL))
			}
			if _, exists := seenURL[key]; exists {
				continue
			}
			seenURL[key] = struct{}{}
			result = append(result, article)
		}
	}

	if len(result) == 0 {
		if len(errs) == 0 {
			return nil, fmt.Errorf("no articles scraped")
		}
		return nil, fmt.Errorf("news scrape failed: %s", strings.Join(errs, "; "))
	}
	return result, nil
}

func (s *Service) runNewsScraper(ctx context.Context, homeURL string, limit int) ([]byte, error) {
	commands := s.newsScraperCommands(homeURL, limit)
	if len(commands) == 0 {
		return nil, fmt.Errorf("news scraper command is not configured")
	}

	for i, command := range commands {
		cmd := exec.CommandContext(ctx, command.Bin, command.Args...)
		output, err := cmd.CombinedOutput()
		if err == nil {
			return output, nil
		}

		if isExecNotFound(err) && i < len(commands)-1 {
			continue
		}

		msg := strings.TrimSpace(string(output))
		if msg == "" {
			return nil, fmt.Errorf("%s: %w", command.display(), err)
		}
		return nil, fmt.Errorf("%s: %w: %s", command.display(), err, msg)
	}

	return nil, fmt.Errorf("unable to execute news scraper command")
}

func (s *Service) newsScraperCommands(homeURL string, limit int) []newsScraperCommand {
	out := make([]newsScraperCommand, 0, 3)
	seen := map[string]struct{}{}
	push := func(bin string, args ...string) {
		bin = strings.TrimSpace(bin)
		if bin == "" {
			return
		}
		key := bin + "\x00" + strings.Join(args, "\x00")
		if _, exists := seen[key]; exists {
			return
		}
		seen[key] = struct{}{}
		out = append(out, newsScraperCommand{Bin: bin, Args: args})
	}

	binPath := strings.TrimSpace(utils.GetEnv("SCRAPE_BERITA_BIN", "").(string))
	if binPath == "" {
		defaultBin := "python/songket-scraping/bin/scrape_berita"
		if stat, err := os.Stat(defaultBin); err == nil && !stat.IsDir() {
			binPath = defaultBin
		}
	}
	push(binPath, homeURL, "--limit", strconv.Itoa(limit))

	scriptPath := strings.TrimSpace(utils.GetEnv("SCRAPE_BERITA_SCRIPT", "").(string))
	if scriptPath == "" {
		scriptPath = "python/songket-scraping/scrape_berita.py"
	}
	if strings.HasSuffix(strings.ToLower(scriptPath), ".py") {
		pythonRunner := strings.TrimSpace(utils.GetEnv("SCRAPE_BERITA_PYTHON", "").(string))
		if pythonRunner == "" {
			pythonRunner = "python3"
		}
		push(pythonRunner, scriptPath, homeURL, "--limit", strconv.Itoa(limit))
	} else {
		push(scriptPath, homeURL, "--limit", strconv.Itoa(limit))
	}

	return out
}

func (s *Service) defaultScrapeURLs() []string {
	urls, err := s.repo.ListActiveScrapeSourceURLs("news")
	if err == nil && len(urls) > 0 {
		return urls
	}

	out := make([]string, 0, 1)
	if fallback := strings.TrimSpace(utils.GetEnv("SCRAPE_NEWS_URL", "").(string)); fallback != "" {
		out = append(out, fallback)
	}
	return out
}

func (s *Service) ensureNewsSourceForURL(rawURL, category string) (string, string, error) {
	normalized := baseSiteURL(rawURL)
	if normalized == "" {
		return "", "", fmt.Errorf("invalid source url")
	}

	noSlash := strings.TrimRight(normalized, "/")
	withSlash := noSlash + "/"
	existing, err := s.repo.GetSourceByURLCandidates([]string{normalized, noSlash, withSlash})
	if err == nil {
		if existing.Category == "" && strings.TrimSpace(category) != "" {
			if err := s.repo.UpdateSourceFields(existing.Id, map[string]interface{}{"category": strings.TrimSpace(category)}); err != nil {
				return "", "", err
			}
			existing.Category = strings.TrimSpace(category)
		}
		return existing.Id, existing.Category, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", "", err
	}

	parsedURL, err := url.Parse(normalized)
	if err != nil {
		return "", "", err
	}
	name := strings.TrimSpace(strings.ToLower(parsedURL.Host))
	if name == "" {
		name = "news-source-" + utils.CreateUUID()[:8]
	}

	byName, err := s.repo.GetSourceByName(name)
	if err == nil {
		updates := map[string]interface{}{}
		if strings.TrimSpace(byName.URL) == "" {
			updates["url"] = normalized
			byName.URL = normalized
		}
		if strings.TrimSpace(byName.Category) == "" && strings.TrimSpace(category) != "" {
			updates["category"] = strings.TrimSpace(category)
			byName.Category = strings.TrimSpace(category)
		}
		if len(updates) > 0 {
			if err := s.repo.UpdateSourceFields(byName.Id, updates); err != nil {
				return "", "", err
			}
		}
		return byName.Id, byName.Category, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", "", err
	}

	row := domainnews.NewsSource{
		Id:       utils.CreateUUID(),
		Name:     name,
		URL:      normalized,
		Category: strings.TrimSpace(category),
	}
	if err := s.repo.StoreSource(row); err != nil {
		return "", "", err
	}
	return row.Id, row.Category, nil
}

func (s *Service) upsertNewsItem(row domainnews.NewsScrapedArticle, sourceID, category string, publishedAt time.Time) (domainnews.NewsItem, error) {
	urlOriginal := strings.TrimSpace(row.URL)
	urlRaw := urlOriginal
	if normalized := normalizeNewsURL(urlOriginal); normalized != "" {
		urlRaw = normalized
	}
	title := strings.TrimSpace(row.Title)
	content := sanitizeNewsContent(row.Content)
	sourceName := strings.TrimSpace(row.Source)
	if sourceName == "" {
		sourceName = strings.TrimSpace(hostFromURL(urlRaw))
	}
	sourceID = validUUIDOrEmpty(sourceID)
	if urlRaw == "" || title == "" {
		return domainnews.NewsItem{}, fmt.Errorf("invalid news row")
	}

	imagesJSON, _ := buildNewsImagesJSON(row.Images)
	candidates := make([]string, 0, 4)
	for _, candidate := range []string{urlOriginal, urlRaw, strings.TrimRight(urlOriginal, "/"), strings.TrimRight(urlRaw, "/")} {
		if trimmed := strings.TrimSpace(candidate); trimmed != "" {
			candidates = append(candidates, trimmed)
			candidates = append(candidates, strings.TrimRight(trimmed, "/")+"/")
		}
	}

	if _, err := s.repo.GetItemByURLCandidates(candidates); err == nil {
		return domainnews.NewsItem{}, errNewsAlreadyAdded
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return domainnews.NewsItem{}, err
	}

	item := domainnews.NewsItem{
		Id:          utils.CreateUUID(),
		SourceName:  sourceName,
		Title:       title,
		Content:     content,
		Images:      imagesJSON,
		URL:         urlRaw,
		Category:    category,
		PublishedAt: publishedAt,
	}
	if sourceID != "" {
		item.SourceID = stringPtr(sourceID)
	}
	if err := s.repo.StoreItem(item); err != nil {
		if sharedsvc.IsUniqueViolationError(err) {
			return domainnews.NewsItem{}, errNewsAlreadyAdded
		}
		return domainnews.NewsItem{}, err
	}
	return item, nil
}

func (c newsScraperCommand) display() string {
	if len(c.Args) == 0 {
		return c.Bin
	}
	return c.Bin + " " + strings.Join(c.Args, " ")
}
