package master

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/go-resty/resty/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"service-songket/utils"
)

const (
	defaultSipedasBaseURL = "https://sipedas.pertanian.go.id/api/wilayah"
	wilayahLevelProvince  = "province"
	wilayahLevelRegency   = "regency"
	wilayahLevelDistrict  = "district"
)

var (
	errEmptySipedasResponse = errors.New("empty response from sipedas")
	errParseSipedasResponse = errors.New("unable to parse sipedas response")
)

// WilayahItem represents a code-name pair returned by Sipedas.
type WilayahItem struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type cachedWilayahItems struct {
	Items    []WilayahItem
	CachedAt time.Time
}

type sipedasHTTPStatusError struct {
	StatusCode int
}

func (e sipedasHTTPStatusError) Error() string {
	return fmt.Sprintf("sipedas returned %d", e.StatusCode)
}

// WilayahService fetches wilayah master data from Sipedas.
type WilayahService struct {
	client        *resty.Client
	db            *gorm.DB
	mu            sync.RWMutex
	provinceCache map[string]cachedWilayahItems
	schemaOnce    sync.Once
	schemaErr     error
}

func NewWilayahService(db *gorm.DB) *WilayahService {
	baseURL := strings.TrimRight(utils.GetEnv("SIPEDAS_BASE_URL", defaultSipedasBaseURL).(string), "/")

	timeoutSec := utils.GetEnv("SIPEDAS_TIMEOUT_SECONDS", 60).(int)
	if timeoutSec <= 0 {
		timeoutSec = 60
	}
	retryCount := utils.GetEnv("SIPEDAS_RETRY_COUNT", 2).(int)
	if retryCount < 0 {
		retryCount = 0
	}

	client := resty.New().
		SetBaseURL(baseURL).
		SetTimeout(time.Duration(timeoutSec) * time.Second).
		SetRetryCount(retryCount).
		SetRetryWaitTime(350 * time.Millisecond).
		SetRetryMaxWaitTime(2 * time.Second).
		AddRetryCondition(func(resp *resty.Response, err error) bool {
			if err != nil {
				return true
			}
			if resp == nil {
				return false
			}
			status := resp.StatusCode()
			return status == http.StatusTooManyRequests ||
				status == http.StatusRequestTimeout ||
				status == http.StatusBadGateway ||
				status == http.StatusServiceUnavailable ||
				status == http.StatusGatewayTimeout ||
				status >= 500
		})

	svc := &WilayahService{
		client:        client,
		db:            db,
		provinceCache: map[string]cachedWilayahItems{},
	}
	// Create master wilayah tables at startup (automigrate scope is limited to master tables only).
	svc.ensureSchema()
	return svc
}

// GetProvinsi returns province list for a given year (defaults to current year).
func (s *WilayahService) GetProvinsi(ctx context.Context, year string) ([]WilayahItem, error) {
	y := normalizeYear(year)
	if cached, err := s.getWilayahCache(wilayahLevelProvince, y, "", ""); err == nil && len(cached) > 0 {
		s.setProvinceCache(y, cached)
		return cached, nil
	}

	items, err := s.fetchWilayah(ctx, "/list_pro", map[string]string{"thn": y})
	if err == nil {
		s.upsertWilayahCache(wilayahLevelProvince, y, "", "", items, "third_party")
		s.setProvinceCache(y, items)
		return items, nil
	}

	// Prefer stale cache over failing fast when upstream is unstable.
	if cached, ok := s.getProvinceCache(y); ok {
		return cached, nil
	}
	if cached, ok := s.getProvinceCache("*"); ok {
		return cached, nil
	}

	// Graceful degradation for upstream instability to avoid frequent 502 on master lookup.
	if isWilayahSoftFail(err) {
		return []WilayahItem{}, nil
	}
	return nil, err
}

// GetKabupaten returns regencies/cities for the given province code.
func (s *WilayahService) GetKabupaten(ctx context.Context, year, provCode string) ([]WilayahItem, error) {
	if strings.TrimSpace(provCode) == "" {
		return nil, errors.New("parameter 'pro' is required")
	}

	y := normalizeYear(year)
	pro := strings.TrimSpace(provCode)
	resolvedPro := pro
	if !isNumericCode(resolvedPro) {
		if code, resolveErr := s.resolveProvinceCode(ctx, y, resolvedPro); resolveErr == nil && code != "" {
			resolvedPro = code
		}
	}
	if cached, err := s.getWilayahCache(wilayahLevelRegency, y, resolvedPro, ""); err == nil && len(cached) > 0 {
		return cached, nil
	}

	fetchPro := resolvedPro
	if strings.TrimSpace(fetchPro) == "" {
		fetchPro = pro
	}

	items, err := s.fetchWilayah(ctx, "/list_kab", map[string]string{
		"thn": y,
		"pro": fetchPro,
	})
	if err == nil {
		cachePro := resolvedPro
		if strings.TrimSpace(cachePro) == "" {
			cachePro = fetchPro
		}
		s.upsertWilayahCache(wilayahLevelRegency, y, cachePro, "", items, "third_party")
		return items, nil
	}

	// Backward compatibility for legacy callers that still send province name.
	if !isNumericCode(pro) {
		resolved, resolveErr := s.resolveProvinceCode(ctx, y, pro)
		if resolveErr == nil && resolved != "" && resolved != pro {
			retryItems, retryErr := s.fetchWilayah(ctx, "/list_kab", map[string]string{
				"thn": y,
				"pro": resolved,
			})
			if retryErr == nil {
				s.upsertWilayahCache(wilayahLevelRegency, y, resolved, "", retryItems, "third_party")
				return retryItems, nil
			}
			err = retryErr
		}
	}
	if isWilayahSoftFail(err) {
		return []WilayahItem{}, nil
	}
	return nil, err
}

// GetKecamatan returns districts for the given province + regency codes.
func (s *WilayahService) GetKecamatan(ctx context.Context, year, provCode, kabCode string) ([]WilayahItem, error) {
	if strings.TrimSpace(provCode) == "" || strings.TrimSpace(kabCode) == "" {
		return nil, errors.New("parameters 'pro' and 'kab' are required")
	}

	y := normalizeYear(year)
	pro := strings.TrimSpace(provCode)
	kab := strings.TrimSpace(kabCode)
	resolvedPro := pro
	if !isNumericCode(resolvedPro) {
		if code, resolveErr := s.resolveProvinceCode(ctx, y, resolvedPro); resolveErr == nil && code != "" {
			resolvedPro = code
		}
	}
	resolvedKab := kab
	if resolvedPro != "" && !isNumericCode(resolvedKab) {
		if code, resolveErr := s.resolveKabupatenCode(ctx, y, resolvedPro, resolvedKab); resolveErr == nil && code != "" {
			resolvedKab = code
		}
	}
	if cached, err := s.getWilayahCache(wilayahLevelDistrict, y, resolvedPro, resolvedKab); err == nil && len(cached) > 0 {
		return cached, nil
	}

	fetchPro := resolvedPro
	if strings.TrimSpace(fetchPro) == "" {
		fetchPro = pro
	}
	fetchKab := resolvedKab
	if strings.TrimSpace(fetchKab) == "" {
		fetchKab = kab
	}

	// First attempt: as-is (fast path for code-based calls).
	items, err := s.fetchWilayah(ctx, "/list_kec", map[string]string{
		"thn": y,
		"pro": fetchPro,
		"kab": fetchKab,
	})
	if err == nil {
		cachePro := resolvedPro
		if strings.TrimSpace(cachePro) == "" {
			cachePro = fetchPro
		}
		cacheKab := resolvedKab
		if strings.TrimSpace(cacheKab) == "" {
			cacheKab = fetchKab
		}
		s.upsertWilayahCache(wilayahLevelDistrict, y, cachePro, cacheKab, items, "third_party")
		return items, nil
	}

	// Fallback for legacy name-based params (e.g. "NTB", "Kota Mataram").
	resolvedPro = pro
	if !isNumericCode(pro) || isWilayahSoftFail(err) {
		if code, resolveErr := s.resolveProvinceCode(ctx, y, pro); resolveErr == nil && code != "" {
			resolvedPro = code
		}
	}

	resolvedKab = kab
	if resolvedPro != "" && (!isNumericCode(kab) || isWilayahSoftFail(err)) {
		if code, resolveErr := s.resolveKabupatenCode(ctx, y, resolvedPro, kab); resolveErr == nil && code != "" {
			resolvedKab = code
		}
	}

	if resolvedPro == "" || resolvedKab == "" {
		return []WilayahItem{}, nil
	}
	if resolvedPro == pro && resolvedKab == kab {
		if isWilayahSoftFail(err) {
			return []WilayahItem{}, nil
		}
		return nil, err
	}

	items, retryErr := s.fetchWilayah(ctx, "/list_kec", map[string]string{
		"thn": y,
		"pro": resolvedPro,
		"kab": resolvedKab,
	})
	if retryErr == nil {
		s.upsertWilayahCache(wilayahLevelDistrict, y, resolvedPro, resolvedKab, items, "third_party")
		return items, nil
	}

	// For upstream instability / unresolved payload edge-cases, return empty list instead of 502.
	if isWilayahSoftFail(retryErr) {
		return []WilayahItem{}, nil
	}
	return nil, retryErr
}

// normalizeYear returns a 4-digit year string; defaults to current year when empty/invalid.
func normalizeYear(year string) string {
	y := strings.TrimSpace(year)
	if y == "" {
		return strconv.Itoa(time.Now().Year())
	}
	if _, err := strconv.Atoi(y); err != nil {
		return strconv.Itoa(time.Now().Year())
	}
	if len(y) == 2 {
		// interpret "26" as "2026"
		return "20" + y
	}
	return y
}

func (s *WilayahService) fetchWilayah(ctx context.Context, endpoint string, query map[string]string) ([]WilayahItem, error) {
	resp, err := s.client.R().
		SetContext(ctx).
		SetQueryParams(query).
		Get(endpoint)
	if err != nil {
		return nil, err
	}
	if resp.IsError() {
		return nil, sipedasHTTPStatusError{StatusCode: resp.StatusCode()}
	}
	return parseWilayah(resp.Body())
}

func (s *WilayahService) getProvinceCache(year string) ([]WilayahItem, bool) {
	key := strings.TrimSpace(year)
	if key == "" {
		return nil, false
	}

	s.mu.RLock()
	entry, ok := s.provinceCache[key]
	s.mu.RUnlock()
	if !ok || len(entry.Items) == 0 {
		return nil, false
	}

	items := make([]WilayahItem, len(entry.Items))
	copy(items, entry.Items)
	return items, true
}

func (s *WilayahService) setProvinceCache(year string, items []WilayahItem) {
	key := strings.TrimSpace(year)
	if key == "" || len(items) == 0 {
		return
	}

	copied := make([]WilayahItem, len(items))
	copy(copied, items)
	entry := cachedWilayahItems{
		Items:    copied,
		CachedAt: time.Now(),
	}

	s.mu.Lock()
	s.provinceCache[key] = entry
	// Fallback bucket for latest known good list regardless of year.
	s.provinceCache["*"] = entry
	s.mu.Unlock()
}

func (s *WilayahService) ensureSchema() {
	if s.db == nil {
		return
	}
	s.schemaOnce.Do(func() {
		s.schemaErr = s.db.AutoMigrate(
			&MasterProvince{},
			&MasterRegency{},
			&MasterDistrict{},
		)
	})
}

func (s *WilayahService) getWilayahCache(level, year, provinceCode, regencyCode string) ([]WilayahItem, error) {
	if s.db == nil {
		return nil, nil
	}
	s.ensureSchema()
	if s.schemaErr != nil {
		return nil, nil
	}
	_ = year

	cleanLevel := strings.TrimSpace(level)
	if cleanLevel == "" {
		return nil, nil
	}
	cleanProvince := strings.TrimSpace(provinceCode)
	cleanRegency := strings.TrimSpace(regencyCode)

	items := make([]WilayahItem, 0)
	switch cleanLevel {
	case wilayahLevelProvince:
		var rows []MasterProvince
		if err := s.db.
			Model(&MasterProvince{}).
			Order("code ASC").
			Find(&rows).Error; err != nil {
			return nil, err
		}
		items = make([]WilayahItem, 0, len(rows))
		for _, row := range rows {
			code := strings.TrimSpace(row.Code)
			name := strings.TrimSpace(row.Name)
			if code == "" || name == "" {
				continue
			}
			items = append(items, WilayahItem{Code: code, Name: name})
		}
	case wilayahLevelRegency:
		var rows []MasterRegency
		query := s.db.Model(&MasterRegency{})
		if cleanProvince != "" {
			query = query.Where("province_code = ?", cleanProvince)
		}
		if err := query.Order("code ASC").Find(&rows).Error; err != nil {
			return nil, err
		}
		items = make([]WilayahItem, 0, len(rows))
		for _, row := range rows {
			code := strings.TrimSpace(row.Code)
			name := strings.TrimSpace(row.Name)
			if code == "" || name == "" {
				continue
			}
			items = append(items, WilayahItem{Code: code, Name: name})
		}
	case wilayahLevelDistrict:
		var rows []MasterDistrict
		query := s.db.Model(&MasterDistrict{})
		if cleanProvince != "" {
			query = query.Where("province_code = ?", cleanProvince)
		}
		if cleanRegency != "" {
			query = query.Where("regency_code = ?", cleanRegency)
		}
		if err := query.Order("code ASC").Find(&rows).Error; err != nil {
			return nil, err
		}
		items = make([]WilayahItem, 0, len(rows))
		for _, row := range rows {
			code := strings.TrimSpace(row.Code)
			name := strings.TrimSpace(row.Name)
			if code == "" || name == "" {
				continue
			}
			items = append(items, WilayahItem{Code: code, Name: name})
		}
	default:
		return []WilayahItem{}, nil
	}
	return items, nil
}

func (s *WilayahService) upsertWilayahCache(level, year, provinceCode, regencyCode string, items []WilayahItem, source string) {
	if s.db == nil || len(items) == 0 {
		return
	}
	s.ensureSchema()
	if s.schemaErr != nil {
		return
	}
	_ = year

	cleanLevel := strings.TrimSpace(level)
	if cleanLevel == "" {
		return
	}
	cleanProvince := strings.TrimSpace(provinceCode)
	cleanRegency := strings.TrimSpace(regencyCode)
	cleanSource := strings.TrimSpace(source)
	if cleanSource == "" {
		cleanSource = "third_party"
	}

	switch cleanLevel {
	case wilayahLevelProvince:
		rows := make([]MasterProvince, 0, len(items))
		for _, item := range items {
			code := strings.TrimSpace(item.Code)
			name := strings.TrimSpace(item.Name)
			if code == "" || name == "" {
				continue
			}
			rows = append(rows, MasterProvince{
				Code:   code,
				Name:   name,
				Source: cleanSource,
			})
		}
		if len(rows) == 0 {
			return
		}
		_ = s.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "code"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"name":       gorm.Expr("EXCLUDED.name"),
				"source":     gorm.Expr("EXCLUDED.source"),
				"deleted_at": nil,
				"updated_at": gorm.Expr("NOW()"),
			}),
		}).Create(&rows).Error
	case wilayahLevelRegency:
		rows := make([]MasterRegency, 0, len(items))
		for _, item := range items {
			code := strings.TrimSpace(item.Code)
			name := strings.TrimSpace(item.Name)
			if code == "" || name == "" {
				continue
			}
			rows = append(rows, MasterRegency{
				ProvinceCode: cleanProvince,
				Code:         code,
				Name:         name,
				Source:       cleanSource,
			})
		}
		if len(rows) == 0 {
			return
		}
		_ = s.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "province_code"},
				{Name: "code"},
			},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"province_code": gorm.Expr("EXCLUDED.province_code"),
				"name":          gorm.Expr("EXCLUDED.name"),
				"source":        gorm.Expr("EXCLUDED.source"),
				"deleted_at":    nil,
				"updated_at":    gorm.Expr("NOW()"),
			}),
		}).Create(&rows).Error
	case wilayahLevelDistrict:
		rows := make([]MasterDistrict, 0, len(items))
		for _, item := range items {
			code := strings.TrimSpace(item.Code)
			name := strings.TrimSpace(item.Name)
			if code == "" || name == "" {
				continue
			}
			rows = append(rows, MasterDistrict{
				ProvinceCode: cleanProvince,
				RegencyCode:  cleanRegency,
				Code:         code,
				Name:         name,
				Source:       cleanSource,
			})
		}
		if len(rows) == 0 {
			return
		}
		_ = s.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "province_code"},
				{Name: "regency_code"},
				{Name: "code"},
			},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"province_code": gorm.Expr("EXCLUDED.province_code"),
				"regency_code":  gorm.Expr("EXCLUDED.regency_code"),
				"name":          gorm.Expr("EXCLUDED.name"),
				"source":        gorm.Expr("EXCLUDED.source"),
				"deleted_at":    nil,
				"updated_at":    gorm.Expr("NOW()"),
			}),
		}).Create(&rows).Error
	}
}

func isWilayahSoftFail(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, errParseSipedasResponse) || errors.Is(err, errEmptySipedasResponse) {
		return true
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}
	var statusErr sipedasHTTPStatusError
	if errors.As(err, &statusErr) {
		return true
	}
	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	if strings.Contains(msg, "no such host") ||
		strings.Contains(msg, "connection refused") ||
		strings.Contains(msg, "tls handshake timeout") ||
		strings.Contains(msg, "context deadline exceeded") {
		return true
	}
	return false
}

var knownProvinceCodes = map[string]string{
	"aceh":                      "11",
	"sumatera utara":            "12",
	"sumut":                     "12",
	"sumatera barat":            "13",
	"sumbar":                    "13",
	"riau":                      "14",
	"jambi":                     "15",
	"sumatera selatan":          "16",
	"sumsel":                    "16",
	"bengkulu":                  "17",
	"lampung":                   "18",
	"kepulauan bangka belitung": "19",
	"bangka belitung":           "19",
	"babel":                     "19",
	"kepulauan riau":            "21",
	"kepri":                     "21",
	"dki jakarta":               "31",
	"jakarta":                   "31",
	"jawa barat":                "32",
	"jabar":                     "32",
	"jawa tengah":               "33",
	"jateng":                    "33",
	"di yogyakarta":             "34",
	"yogyakarta":                "34",
	"diy":                       "34",
	"jawa timur":                "35",
	"jatim":                     "35",
	"banten":                    "36",
	"bali":                      "51",
	"nusa tenggara barat":       "52",
	"ntb":                       "52",
	"nusa tenggara timur":       "53",
	"ntt":                       "53",
	"kalimantan barat":          "61",
	"kalbar":                    "61",
	"kalimantan tengah":         "62",
	"kalteng":                   "62",
	"kalimantan selatan":        "63",
	"kalsel":                    "63",
	"kalimantan timur":          "64",
	"kaltim":                    "64",
	"kalimantan utara":          "65",
	"kalut":                     "65",
	"sulawesi utara":            "71",
	"sulut":                     "71",
	"sulawesi tengah":           "72",
	"sulteng":                   "72",
	"sulawesi selatan":          "73",
	"sulsel":                    "73",
	"sulawesi tenggara":         "74",
	"sultra":                    "74",
	"gorontalo":                 "75",
	"sulawesi barat":            "76",
	"sulbar":                    "76",
	"maluku":                    "81",
	"maluku utara":              "82",
	"malut":                     "82",
	"papua barat":               "91",
	"papua barat daya":          "92",
	"papua":                     "94",
	"papua selatan":             "95",
	"papua tengah":              "96",
	"papua pegunungan":          "97",
}

func provinceCodeFromKnownName(value string) string {
	normalized := normalizeWilayahName(value)
	if normalized == "" {
		return ""
	}
	if code, ok := knownProvinceCodes[normalized]; ok {
		return code
	}
	return ""
}

func (s *WilayahService) resolveProvinceCode(ctx context.Context, year, province string) (string, error) {
	needle := strings.TrimSpace(province)
	if needle == "" {
		return "", nil
	}
	if isNumericCode(needle) {
		return needle, nil
	}

	if code := provinceCodeFromKnownName(needle); code != "" {
		return code, nil
	}
	normalizedYear := normalizeYear(year)
	if cached, err := s.getWilayahCache(wilayahLevelProvince, normalizedYear, "", ""); err == nil && len(cached) > 0 {
		if code := findWilayahCode(cached, needle); code != "" {
			s.setProvinceCache(normalizedYear, cached)
			return code, nil
		}
	}
	if cached, ok := s.getProvinceCache(normalizedYear); ok {
		if code := findWilayahCode(cached, needle); code != "" {
			return code, nil
		}
	}
	if cached, ok := s.getProvinceCache("*"); ok {
		if code := findWilayahCode(cached, needle); code != "" {
			return code, nil
		}
	}

	items, err := s.fetchWilayah(ctx, "/list_pro", map[string]string{"thn": normalizedYear})
	if err != nil {
		return "", err
	}
	s.upsertWilayahCache(wilayahLevelProvince, normalizedYear, "", "", items, "third_party")
	s.setProvinceCache(normalizedYear, items)
	return findWilayahCode(items, needle), nil
}

func (s *WilayahService) resolveKabupatenCode(ctx context.Context, year, provCode, kabupaten string) (string, error) {
	needle := strings.TrimSpace(kabupaten)
	if needle == "" {
		return "", nil
	}
	if isNumericCode(needle) {
		return needle, nil
	}
	resolvedProv := strings.TrimSpace(provCode)
	if resolvedProv == "" {
		return "", nil
	}
	if !isNumericCode(resolvedProv) {
		if code, err := s.resolveProvinceCode(ctx, year, resolvedProv); err == nil && code != "" {
			resolvedProv = code
		}
	}
	normalizedYear := normalizeYear(year)
	if cached, err := s.getWilayahCache(wilayahLevelRegency, normalizedYear, resolvedProv, ""); err == nil && len(cached) > 0 {
		if code := findWilayahCode(cached, needle); code != "" {
			return code, nil
		}
	}

	items, err := s.fetchWilayah(ctx, "/list_kab", map[string]string{
		"thn": normalizedYear,
		"pro": strings.TrimSpace(resolvedProv),
	})
	if err != nil {
		return "", err
	}
	s.upsertWilayahCache(wilayahLevelRegency, normalizedYear, strings.TrimSpace(resolvedProv), "", items, "third_party")
	return findWilayahCode(items, needle), nil
}

func findWilayahCode(items []WilayahItem, input string) string {
	raw := strings.TrimSpace(input)
	if raw == "" {
		return ""
	}

	// Allow passing the code directly even if response is cached as list.
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(item.Code), raw) {
			return strings.TrimSpace(item.Code)
		}
	}

	target := normalizeWilayahName(raw)
	if target == "" {
		return ""
	}

	for _, item := range items {
		if normalizeWilayahName(item.Name) == target {
			return strings.TrimSpace(item.Code)
		}
	}

	// Match well-known abbreviations/acronyms (e.g. "NTB" -> "Nusa Tenggara Barat").
	if len(target) >= 2 && len(target) <= 6 {
		for _, item := range items {
			if acronym(normalizeWilayahName(item.Name)) == target {
				return strings.TrimSpace(item.Code)
			}
		}
	}

	for _, item := range items {
		name := normalizeWilayahName(item.Name)
		if name == "" {
			continue
		}
		if strings.Contains(name, target) || strings.Contains(target, name) {
			return strings.TrimSpace(item.Code)
		}
	}
	return ""
}

func normalizeWilayahName(value string) string {
	s := strings.ToLower(strings.TrimSpace(value))
	if s == "" {
		return ""
	}

	replacer := strings.NewReplacer(
		".", " ",
		",", " ",
		"/", " ",
		"-", " ",
		"(", " ",
		")", " ",
		"_", " ",
	)
	s = replacer.Replace(s)
	s = strings.Join(strings.Fields(s), " ")

	trimPrefixes := []string{
		"provinsi ",
		"prov ",
		"kabupaten ",
		"kab ",
		"kota ",
		"kecamatan ",
		"kec ",
		"daerah khusus ibukota ",
		"daerah istimewa ",
		"dki ",
		"di ",
	}
	for _, prefix := range trimPrefixes {
		if strings.HasPrefix(s, prefix) {
			s = strings.TrimSpace(strings.TrimPrefix(s, prefix))
		}
	}
	return s
}

func isNumericCode(value string) bool {
	v := strings.TrimSpace(value)
	if v == "" {
		return false
	}
	for _, r := range v {
		if !unicode.IsDigit(r) {
			return false
		}
	}
	return true
}

func parseWilayah(body []byte) ([]WilayahItem, error) {
	if len(body) == 0 {
		return nil, errEmptySipedasResponse
	}

	// Common shape: {"11":"ACEH", ...}
	var mapData map[string]string
	if err := json.Unmarshal(body, &mapData); err == nil && len(mapData) > 0 {
		return mapToItems(mapData), nil
	}

	// Fallback for map[string]interface{} where values aren't strings.
	var mapAny map[string]interface{}
	if err := json.Unmarshal(body, &mapAny); err == nil && len(mapAny) > 0 {
		tmp := make(map[string]string, len(mapAny))
		for k, v := range mapAny {
			tmp[k] = fmt.Sprint(v)
		}
		return mapToItems(tmp), nil
	}

	// Fallback for array payloads: [{"code":"11","name":"Aceh"}, ...]
	var arr []map[string]interface{}
	if err := json.Unmarshal(body, &arr); err == nil && len(arr) > 0 {
		items := make([]WilayahItem, 0, len(arr))
		for _, m := range arr {
			code := firstString(m, "code", "kode", "kd", "id", "value")
			name := firstString(m, "name", "nama", "label", "text")
			if code == "" || name == "" {
				continue
			}
			items = append(items, WilayahItem{
				Code: strings.TrimSpace(code),
				Name: strings.TrimSpace(name),
			})
		}
		if len(items) > 0 {
			sort.Slice(items, func(i, j int) bool {
				return lessCode(items[i].Code, items[j].Code)
			})
			return items, nil
		}
	}

	return nil, fmt.Errorf("%w (body=%s)", errParseSipedasResponse, compactBody(body, 220))
}

func mapToItems(m map[string]string) []WilayahItem {
	items := make([]WilayahItem, 0, len(m))
	for k, v := range m {
		items = append(items, WilayahItem{
			Code: strings.TrimSpace(k),
			Name: strings.TrimSpace(v),
		})
	}
	sort.Slice(items, func(i, j int) bool {
		return lessCode(items[i].Code, items[j].Code)
	})
	return items
}

func firstString(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			switch t := v.(type) {
			case string:
				return t
			case fmt.Stringer:
				return t.String()
			case json.Number:
				return t.String()
			case float64:
				return strconv.Itoa(int(t))
			case int:
				return strconv.Itoa(t)
			case int64:
				return strconv.FormatInt(t, 10)
			}
		}
	}
	return ""
}

// lessCode sorts numerically when possible, otherwise lexicographically.
func lessCode(a, b string) bool {
	if ai, errA := strconv.Atoi(a); errA == nil {
		if bi, errB := strconv.Atoi(b); errB == nil {
			return ai < bi
		}
	}
	return a < b
}

func compactBody(body []byte, limit int) string {
	if limit <= 0 {
		limit = 120
	}
	s := strings.Join(strings.Fields(string(body)), " ")
	if len(s) <= limit {
		return s
	}
	return s[:limit] + "..."
}

func acronym(value string) string {
	tokens := strings.Fields(value)
	if len(tokens) == 0 {
		return ""
	}
	var b strings.Builder
	for _, token := range tokens {
		if token == "" {
			continue
		}
		r, _ := utf8.DecodeRuneInString(token)
		if r == utf8.RuneError {
			continue
		}
		b.WriteRune(unicode.ToLower(r))
	}
	return b.String()
}
