package servicelocation

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

	domainlocation "service-songket/internal/domain/location"
	interfacelocation "service-songket/internal/interfaces/location"
	"service-songket/utils"

	"github.com/go-resty/resty/v2"
)

const defaultSipedasBaseURL = "https://sipedas.pertanian.go.id/api/wilayah"

const (
	locationLevelProvince = "province"
	locationLevelCity     = "city"
	locationLevelDistrict = "district"
)

var (
	errEmptySipedasResponse = errors.New("empty response from sipedas")
	errParseSipedasResponse = errors.New("unable to parse sipedas response")
)

type cachedLocationItems struct {
	Items    []domainlocation.LocationItem
	CachedAt time.Time
}

type sipedasHTTPStatusError struct {
	StatusCode int
}

func (e sipedasHTTPStatusError) Error() string {
	return fmt.Sprintf("sipedas returned %d", e.StatusCode)
}

type Service struct {
	repo          interfacelocation.RepoLocationInterface
	client        *resty.Client
	mu            sync.RWMutex
	provinceCache map[string]cachedLocationItems
}

func NewLocationService(repo interfacelocation.RepoLocationInterface) interfacelocation.ServiceLocationInterface {
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

	svc := &Service{
		repo:          repo,
		client:        client,
		provinceCache: map[string]cachedLocationItems{},
	}
	_ = repo.EnsureSchema()
	return svc
}

func (s *Service) GetProvince(ctx context.Context, year string) ([]domainlocation.LocationItem, error) {
	y := normalizeYear(year)
	if cached, err := s.getLocationCache(locationLevelProvince, y, "", ""); err == nil && len(cached) > 0 {
		s.setProvinceCache(y, cached)
		return cached, nil
	}
	items, err := s.fetchLocation(ctx, "/list_pro", map[string]string{"thn": y})
	if err == nil {
		_ = s.repo.UpsertProvinceCache(items, "third_party")
		s.setProvinceCache(y, items)
		return items, nil
	}
	if cached, ok := s.getProvinceCache(y); ok {
		return cached, nil
	}
	if cached, ok := s.getProvinceCache("*"); ok {
		return cached, nil
	}
	if isLocationSoftFail(err) {
		return []domainlocation.LocationItem{}, nil
	}
	return nil, err
}

func (s *Service) GetCity(ctx context.Context, year, provinceCode string) ([]domainlocation.LocationItem, error) {
	if strings.TrimSpace(provinceCode) == "" {
		return nil, errors.New("province_code is required")
	}

	y := normalizeYear(year)
	province := strings.TrimSpace(provinceCode)
	resolvedProvince := province
	if !isNumericCode(resolvedProvince) {
		if code, resolveErr := s.resolveProvinceCode(ctx, y, resolvedProvince); resolveErr == nil && code != "" {
			resolvedProvince = code
		}
	}
	if cached, err := s.getLocationCache(locationLevelCity, y, resolvedProvince, ""); err == nil && len(cached) > 0 {
		return cached, nil
	}

	fetchProvince := resolvedProvince
	if strings.TrimSpace(fetchProvince) == "" {
		fetchProvince = province
	}

	items, err := s.fetchLocation(ctx, "/list_kab", map[string]string{"thn": y, "pro": fetchProvince})
	if err == nil {
		cacheProvince := resolvedProvince
		if strings.TrimSpace(cacheProvince) == "" {
			cacheProvince = fetchProvince
		}
		_ = s.repo.UpsertCityCache(cacheProvince, items, "third_party")
		return items, nil
	}

	if !isNumericCode(province) {
		resolved, resolveErr := s.resolveProvinceCode(ctx, y, province)
		if resolveErr == nil && resolved != "" && resolved != province {
			retryItems, retryErr := s.fetchLocation(ctx, "/list_kab", map[string]string{"thn": y, "pro": resolved})
			if retryErr == nil {
				_ = s.repo.UpsertCityCache(resolved, retryItems, "third_party")
				return retryItems, nil
			}
			err = retryErr
		}
	}
	if isLocationSoftFail(err) {
		return []domainlocation.LocationItem{}, nil
	}
	return nil, err
}

func (s *Service) GetDistrict(ctx context.Context, year, provinceCode, cityCode string) ([]domainlocation.LocationItem, error) {
	if strings.TrimSpace(provinceCode) == "" || strings.TrimSpace(cityCode) == "" {
		return nil, errors.New("province_code and city_code are required")
	}

	y := normalizeYear(year)
	province := strings.TrimSpace(provinceCode)
	city := strings.TrimSpace(cityCode)
	resolvedProvince := province
	if !isNumericCode(resolvedProvince) {
		if code, resolveErr := s.resolveProvinceCode(ctx, y, resolvedProvince); resolveErr == nil && code != "" {
			resolvedProvince = code
		}
	}
	resolvedCity := city
	if resolvedProvince != "" && !isNumericCode(resolvedCity) {
		if code, resolveErr := s.resolveCityCode(ctx, y, resolvedProvince, resolvedCity); resolveErr == nil && code != "" {
			resolvedCity = code
		}
	}
	if cached, err := s.getLocationCache(locationLevelDistrict, y, resolvedProvince, resolvedCity); err == nil && len(cached) > 0 {
		return cached, nil
	}

	fetchProvince := resolvedProvince
	if strings.TrimSpace(fetchProvince) == "" {
		fetchProvince = province
	}
	fetchCity := resolvedCity
	if strings.TrimSpace(fetchCity) == "" {
		fetchCity = city
	}

	items, err := s.fetchLocation(ctx, "/list_kec", map[string]string{"thn": y, "pro": fetchProvince, "kab": fetchCity})
	if err == nil {
		cacheProvince := resolvedProvince
		if strings.TrimSpace(cacheProvince) == "" {
			cacheProvince = fetchProvince
		}
		cacheCity := resolvedCity
		if strings.TrimSpace(cacheCity) == "" {
			cacheCity = fetchCity
		}
		_ = s.repo.UpsertDistrictCache(cacheProvince, cacheCity, items, "third_party")
		return items, nil
	}

	resolvedProvince = province
	if !isNumericCode(province) || isLocationSoftFail(err) {
		if code, resolveErr := s.resolveProvinceCode(ctx, y, province); resolveErr == nil && code != "" {
			resolvedProvince = code
		}
	}
	resolvedCity = city
	if resolvedProvince != "" && (!isNumericCode(city) || isLocationSoftFail(err)) {
		if code, resolveErr := s.resolveCityCode(ctx, y, resolvedProvince, city); resolveErr == nil && code != "" {
			resolvedCity = code
		}
	}
	if resolvedProvince == "" || resolvedCity == "" {
		return []domainlocation.LocationItem{}, nil
	}
	if resolvedProvince == province && resolvedCity == city {
		if isLocationSoftFail(err) {
			return []domainlocation.LocationItem{}, nil
		}
		return nil, err
	}

	items, retryErr := s.fetchLocation(ctx, "/list_kec", map[string]string{"thn": y, "pro": resolvedProvince, "kab": resolvedCity})
	if retryErr == nil {
		_ = s.repo.UpsertDistrictCache(resolvedProvince, resolvedCity, items, "third_party")
		return items, nil
	}
	if isLocationSoftFail(retryErr) {
		return []domainlocation.LocationItem{}, nil
	}
	return nil, retryErr
}

func normalizeYear(year string) string {
	y := strings.TrimSpace(year)
	if y == "" {
		return strconv.Itoa(time.Now().Year())
	}
	if _, err := strconv.Atoi(y); err != nil {
		return strconv.Itoa(time.Now().Year())
	}
	if len(y) == 2 {
		return "20" + y
	}
	return y
}

func (s *Service) fetchLocation(ctx context.Context, endpoint string, query map[string]string) ([]domainlocation.LocationItem, error) {
	resp, err := s.client.R().SetContext(ctx).SetQueryParams(query).Get(endpoint)
	if err != nil {
		return nil, err
	}
	if resp.IsError() {
		return nil, sipedasHTTPStatusError{StatusCode: resp.StatusCode()}
	}
	return parseLocation(resp.Body())
}

func (s *Service) getProvinceCache(year string) ([]domainlocation.LocationItem, bool) {
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
	items := make([]domainlocation.LocationItem, len(entry.Items))
	copy(items, entry.Items)
	return items, true
}

func (s *Service) setProvinceCache(year string, items []domainlocation.LocationItem) {
	key := strings.TrimSpace(year)
	if key == "" || len(items) == 0 {
		return
	}
	copied := make([]domainlocation.LocationItem, len(items))
	copy(copied, items)
	entry := cachedLocationItems{Items: copied, CachedAt: time.Now()}
	s.mu.Lock()
	s.provinceCache[key] = entry
	s.provinceCache["*"] = entry
	s.mu.Unlock()
}

func (s *Service) getLocationCache(level, year, provinceCode, cityCode string) ([]domainlocation.LocationItem, error) {
	_ = year
	switch strings.TrimSpace(level) {
	case locationLevelProvince:
		return s.repo.ListProvinceCache()
	case locationLevelCity:
		return s.repo.ListCityCache(strings.TrimSpace(provinceCode))
	case locationLevelDistrict:
		return s.repo.ListDistrictCache(strings.TrimSpace(provinceCode), strings.TrimSpace(cityCode))
	default:
		return []domainlocation.LocationItem{}, nil
	}
}

func isLocationSoftFail(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, errParseSipedasResponse) || errors.Is(err, errEmptySipedasResponse) || errors.Is(err, context.DeadlineExceeded) {
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
	return strings.Contains(msg, "no such host") ||
		strings.Contains(msg, "connection refused") ||
		strings.Contains(msg, "tls handshake timeout") ||
		strings.Contains(msg, "context deadline exceeded")
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
	normalized := normalizeLocationName(value)
	if normalized == "" {
		return ""
	}
	return knownProvinceCodes[normalized]
}

func (s *Service) resolveProvinceCode(ctx context.Context, year, province string) (string, error) {
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
	if cached, err := s.getLocationCache(locationLevelProvince, normalizedYear, "", ""); err == nil && len(cached) > 0 {
		if code := findLocationCode(cached, needle); code != "" {
			s.setProvinceCache(normalizedYear, cached)
			return code, nil
		}
	}
	if cached, ok := s.getProvinceCache(normalizedYear); ok {
		if code := findLocationCode(cached, needle); code != "" {
			return code, nil
		}
	}
	if cached, ok := s.getProvinceCache("*"); ok {
		if code := findLocationCode(cached, needle); code != "" {
			return code, nil
		}
	}
	items, err := s.fetchLocation(ctx, "/list_pro", map[string]string{"thn": normalizedYear})
	if err != nil {
		return "", err
	}
	_ = s.repo.UpsertProvinceCache(items, "third_party")
	s.setProvinceCache(normalizedYear, items)
	return findLocationCode(items, needle), nil
}

func (s *Service) resolveCityCode(ctx context.Context, year, provinceCode, city string) (string, error) {
	needle := strings.TrimSpace(city)
	if needle == "" {
		return "", nil
	}
	if isNumericCode(needle) {
		return needle, nil
	}
	resolvedProvince := strings.TrimSpace(provinceCode)
	if resolvedProvince == "" {
		return "", nil
	}
	if !isNumericCode(resolvedProvince) {
		if code, err := s.resolveProvinceCode(ctx, year, resolvedProvince); err == nil && code != "" {
			resolvedProvince = code
		}
	}
	normalizedYear := normalizeYear(year)
	if cached, err := s.getLocationCache(locationLevelCity, normalizedYear, resolvedProvince, ""); err == nil && len(cached) > 0 {
		if code := findLocationCode(cached, needle); code != "" {
			return code, nil
		}
	}
	items, err := s.fetchLocation(ctx, "/list_kab", map[string]string{"thn": normalizedYear, "pro": strings.TrimSpace(resolvedProvince)})
	if err != nil {
		return "", err
	}
	_ = s.repo.UpsertCityCache(strings.TrimSpace(resolvedProvince), items, "third_party")
	return findLocationCode(items, needle), nil
}

func findLocationCode(items []domainlocation.LocationItem, input string) string {
	raw := strings.TrimSpace(input)
	if raw == "" {
		return ""
	}
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(item.Code), raw) {
			return strings.TrimSpace(item.Code)
		}
	}
	target := normalizeLocationName(raw)
	if target == "" {
		return ""
	}
	for _, item := range items {
		if normalizeLocationName(item.Name) == target {
			return strings.TrimSpace(item.Code)
		}
	}
	if len(target) >= 2 && len(target) <= 6 {
		for _, item := range items {
			if acronym(normalizeLocationName(item.Name)) == target {
				return strings.TrimSpace(item.Code)
			}
		}
	}
	for _, item := range items {
		name := normalizeLocationName(item.Name)
		if name == "" {
			continue
		}
		if strings.Contains(name, target) || strings.Contains(target, name) {
			return strings.TrimSpace(item.Code)
		}
	}
	return ""
}

func normalizeLocationName(value string) string {
	s := strings.ToLower(strings.TrimSpace(value))
	if s == "" {
		return ""
	}
	replacer := strings.NewReplacer(".", " ", ",", " ", "/", " ", "-", " ", "(", " ", ")", " ", "_", " ")
	s = replacer.Replace(s)
	s = strings.Join(strings.Fields(s), " ")
	trimPrefixes := []string{"provinsi ", "prov ", "kabupaten ", "kab ", "kota ", "kecamatan ", "kec ", "daerah khusus ibukota ", "daerah istimewa ", "dki ", "di "}
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

func parseLocation(body []byte) ([]domainlocation.LocationItem, error) {
	if len(body) == 0 {
		return nil, errEmptySipedasResponse
	}
	var mapData map[string]string
	if err := json.Unmarshal(body, &mapData); err == nil && len(mapData) > 0 {
		return mapToItems(mapData), nil
	}
	var mapAny map[string]interface{}
	if err := json.Unmarshal(body, &mapAny); err == nil && len(mapAny) > 0 {
		tmp := make(map[string]string, len(mapAny))
		for k, v := range mapAny {
			tmp[k] = fmt.Sprint(v)
		}
		return mapToItems(tmp), nil
	}
	var arr []map[string]interface{}
	if err := json.Unmarshal(body, &arr); err == nil && len(arr) > 0 {
		items := make([]domainlocation.LocationItem, 0, len(arr))
		for _, m := range arr {
			code := firstString(m, "code", "kode", "kd", "id", "value")
			name := firstString(m, "name", "nama", "label", "text")
			if code == "" || name == "" {
				continue
			}
			items = append(items, domainlocation.LocationItem{Code: strings.TrimSpace(code), Name: strings.TrimSpace(name)})
		}
		if len(items) > 0 {
			sort.Slice(items, func(i, j int) bool { return lessCode(items[i].Code, items[j].Code) })
			return items, nil
		}
	}
	return nil, fmt.Errorf("%w (body=%s)", errParseSipedasResponse, compactBody(body, 220))
}

func mapToItems(m map[string]string) []domainlocation.LocationItem {
	items := make([]domainlocation.LocationItem, 0, len(m))
	for k, v := range m {
		items = append(items, domainlocation.LocationItem{Code: strings.TrimSpace(k), Name: strings.TrimSpace(v)})
	}
	sort.Slice(items, func(i, j int) bool { return lessCode(items[i].Code, items[j].Code) })
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
