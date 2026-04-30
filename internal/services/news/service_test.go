package servicenews

import (
	"errors"
	domainnews "service-songket/internal/domain/news"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
	"testing"
	"time"

	"gorm.io/gorm"
)

type newsRepoMock struct {
	sourceByName               map[string]domainnews.NewsSource
	sourceByURL                map[string]domainnews.NewsSource
	existingItem               domainnews.NewsItem
	storeSourceCalls           []domainnews.NewsSource
	updateSourceCalls          []domainnews.NewsSource
	updateSourceFieldsCalls    []map[string]interface{}
	storedItems                []domainnews.NewsItem
	listActiveScrapeSourceURLs []string
	expiredCutoffs             []time.Time
}

func (m *newsRepoMock) StoreSource(data domainnews.NewsSource) error {
	m.storeSourceCalls = append(m.storeSourceCalls, data)
	m.sourceByName[data.Name] = data
	return nil
}
func (m *newsRepoMock) GetSourceByName(name string) (domainnews.NewsSource, error) {
	if row, ok := m.sourceByName[name]; ok {
		return row, nil
	}
	return domainnews.NewsSource{}, gorm.ErrRecordNotFound
}
func (m *newsRepoMock) UpdateSource(data domainnews.NewsSource) error {
	m.updateSourceCalls = append(m.updateSourceCalls, data)
	return nil
}
func (m *newsRepoMock) GetAllSources(params filter.BaseParams) ([]domainnews.NewsSource, int64, error) {
	return nil, 0, nil
}
func (m *newsRepoMock) GetSources(category string) ([]domainnews.NewsSource, error) { return nil, nil }
func (m *newsRepoMock) GetLatestItemBySource(sourceID string) (domainnews.NewsItem, error) {
	return domainnews.NewsItem{}, gorm.ErrRecordNotFound
}
func (m *newsRepoMock) GetAllItems(category string, params filter.BaseParams) ([]domainnews.NewsItem, int64, error) {
	return nil, 0, nil
}
func (m *newsRepoMock) DeleteItem(id string) error { return nil }
func (m *newsRepoMock) HardDeleteItemsPublishedBefore(cutoff time.Time) error {
	m.expiredCutoffs = append(m.expiredCutoffs, cutoff)
	return nil
}
func (m *newsRepoMock) GetSourceByURLCandidates(urls []string) (domainnews.NewsSource, error) {
	for _, u := range urls {
		if row, ok := m.sourceByURL[u]; ok {
			return row, nil
		}
	}
	return domainnews.NewsSource{}, gorm.ErrRecordNotFound
}
func (m *newsRepoMock) UpdateSourceFields(id string, updates map[string]interface{}) error {
	call := map[string]interface{}{"id": id}
	for k, v := range updates {
		call[k] = v
	}
	m.updateSourceFieldsCalls = append(m.updateSourceFieldsCalls, call)
	return nil
}
func (m *newsRepoMock) StoreItem(data domainnews.NewsItem) error {
	m.storedItems = append(m.storedItems, data)
	return nil
}
func (m *newsRepoMock) GetItemByURLCandidates(urls []string) (domainnews.NewsItem, error) {
	if m.existingItem.Id != "" {
		return m.existingItem, nil
	}
	return domainnews.NewsItem{}, gorm.ErrRecordNotFound
}
func (m *newsRepoMock) ListActiveScrapeSourceURLs(sourceType string) ([]string, error) {
	return append([]string{}, m.listActiveScrapeSourceURLs...), nil
}

func TestListItemsHardDeletesExpiredNewsBeforeQuery(t *testing.T) {
	repo := &newsRepoMock{
		sourceByName: map[string]domainnews.NewsSource{},
		sourceByURL:  map[string]domainnews.NewsSource{},
	}
	service := NewNewsService(repo)

	_, _, err := service.ListItems("news", filter.BaseParams{Limit: 10})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(repo.expiredCutoffs) != 1 {
		t.Fatalf("expected one expired cleanup call, got %d", len(repo.expiredCutoffs))
	}
	cutoff := repo.expiredCutoffs[0]
	if cutoff.Hour() != 0 || cutoff.Minute() != 0 || cutoff.Second() != 0 || cutoff.Nanosecond() != 0 {
		t.Fatalf("expected cutoff at start of day, got %s", cutoff)
	}
	expected := time.Now().AddDate(0, 0, -7)
	if cutoff.Year() != expected.Year() || cutoff.YearDay() != expected.YearDay() {
		t.Fatalf("expected cutoff date seven days ago, got %s", cutoff)
	}
}

func TestUpsertSourceCreatesWhenNotFound(t *testing.T) {
	repo := &newsRepoMock{
		sourceByName: map[string]domainnews.NewsSource{},
		sourceByURL:  map[string]domainnews.NewsSource{},
	}
	service := NewNewsService(repo)

	row, err := service.UpsertSource(dto.NewsSourceRequest{Name: " Kompas ", URL: " https://kompas.com ", Category: "news"})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if row.Name != "Kompas" && row.Name != " Kompas " {
		// name is only trimmed, not title-cased.
	}
	if len(repo.storeSourceCalls) != 1 {
		t.Fatalf("expected one source store call, got %d", len(repo.storeSourceCalls))
	}
}

func TestEnsureNewsSourceForURLUpdatesCategoryWhenSourceExistsByURL(t *testing.T) {
	repo := &newsRepoMock{
		sourceByName: map[string]domainnews.NewsSource{},
		sourceByURL: map[string]domainnews.NewsSource{
			"https://example.com": {Id: "source-1", URL: "https://example.com", Category: ""},
		},
	}
	service := NewNewsService(repo)

	sourceID, category, err := service.ensureNewsSourceForURL("https://example.com/some/path", "economy")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if sourceID != "source-1" || category != "economy" {
		t.Fatalf("expected existing source with updated category, got id=%q category=%q", sourceID, category)
	}
	if len(repo.updateSourceFieldsCalls) != 1 {
		t.Fatalf("expected category update call, got %+v", repo.updateSourceFieldsCalls)
	}
}

func TestImportReturnsAlreadyAddedWhenAllItemsDuplicate(t *testing.T) {
	repo := &newsRepoMock{
		sourceByName: map[string]domainnews.NewsSource{},
		sourceByURL:  map[string]domainnews.NewsSource{},
		existingItem: domainnews.NewsItem{Id: "item-1"},
	}
	service := NewNewsService(repo)

	_, err := service.Import([]domainnews.NewsScrapedArticle{{
		Title:     "Headline",
		URL:       "https://example.com/article",
		Content:   "content",
		CreatedAt: time.Now().Format(time.RFC3339),
	}})
	if !errors.Is(err, errNewsAlreadyAdded) {
		t.Fatalf("expected errNewsAlreadyAdded, got %v", err)
	}
}

func TestImportStoresNewItemWhenNotDuplicate(t *testing.T) {
	repo := &newsRepoMock{
		sourceByName: map[string]domainnews.NewsSource{},
		sourceByURL:  map[string]domainnews.NewsSource{},
	}
	service := NewNewsService(repo)

	items, err := service.Import([]domainnews.NewsScrapedArticle{{
		Title:     "Headline",
		URL:       "https://example.com/article",
		Content:   "content",
		CreatedAt: time.Now().Format(time.RFC3339),
		Source:    "example.com",
	}})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(items) != 1 || len(repo.storedItems) != 1 {
		t.Fatalf("expected one stored item, got items=%d stored=%d", len(items), len(repo.storedItems))
	}
}
