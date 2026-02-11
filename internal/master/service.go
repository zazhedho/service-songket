package master

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/go-resty/resty/v2"

	"starter-kit/utils"
)

const (
	defaultSipedasBaseURL = "https://sipedas.pertanian.go.id/api/wilayah"
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

// WilayahService fetches wilayah master data from Sipedas.
type WilayahService struct {
	client *resty.Client
}

func NewWilayahService() *WilayahService {
	baseURL := strings.TrimRight(utils.GetEnv("SIPEDAS_BASE_URL", defaultSipedasBaseURL).(string), "/")

	timeoutSec := utils.GetEnv("SIPEDAS_TIMEOUT_SECONDS", 10).(int)
	if timeoutSec <= 0 {
		timeoutSec = 10
	}

	client := resty.New().
		SetBaseURL(baseURL).
		SetTimeout(time.Duration(timeoutSec) * time.Second)

	return &WilayahService{
		client: client,
	}
}

// GetProvinsi returns province list for a given year (defaults to current year).
func (s *WilayahService) GetProvinsi(ctx context.Context, year string) ([]WilayahItem, error) {
	y := normalizeYear(year)
	return s.fetchWilayah(ctx, "/list_pro", map[string]string{"thn": y})
}

// GetKabupaten returns regencies/cities for the given province code.
func (s *WilayahService) GetKabupaten(ctx context.Context, year, provCode string) ([]WilayahItem, error) {
	if strings.TrimSpace(provCode) == "" {
		return nil, errors.New("parameter 'pro' is required")
	}

	y := normalizeYear(year)
	pro := strings.TrimSpace(provCode)

	items, err := s.fetchWilayah(ctx, "/list_kab", map[string]string{
		"thn": y,
		"pro": pro,
	})
	if err == nil {
		return items, nil
	}

	// Backward compatibility for legacy callers that still send province name.
	if !isNumericCode(pro) {
		resolved, resolveErr := s.resolveProvinceCode(ctx, y, pro)
		if resolveErr == nil && resolved != "" && resolved != pro {
			return s.fetchWilayah(ctx, "/list_kab", map[string]string{
				"thn": y,
				"pro": resolved,
			})
		}
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

	// First attempt: as-is (fast path for code-based calls).
	items, err := s.fetchWilayah(ctx, "/list_kec", map[string]string{
		"thn": y,
		"pro": pro,
		"kab": kab,
	})
	if err == nil {
		return items, nil
	}

	// Fallback for legacy name-based params (e.g. "NTB", "Kota Mataram").
	resolvedPro := pro
	if !isNumericCode(pro) || errors.Is(err, errParseSipedasResponse) || errors.Is(err, errEmptySipedasResponse) {
		if code, resolveErr := s.resolveProvinceCode(ctx, y, pro); resolveErr == nil && code != "" {
			resolvedPro = code
		}
	}

	resolvedKab := kab
	if resolvedPro != "" && (!isNumericCode(kab) || errors.Is(err, errParseSipedasResponse) || errors.Is(err, errEmptySipedasResponse)) {
		if code, resolveErr := s.resolveKabupatenCode(ctx, y, resolvedPro, kab); resolveErr == nil && code != "" {
			resolvedKab = code
		}
	}

	if resolvedPro == "" || resolvedKab == "" {
		return []WilayahItem{}, nil
	}
	if resolvedPro == pro && resolvedKab == kab {
		return nil, err
	}

	items, retryErr := s.fetchWilayah(ctx, "/list_kec", map[string]string{
		"thn": y,
		"pro": resolvedPro,
		"kab": resolvedKab,
	})
	if retryErr == nil {
		return items, nil
	}

	// For unresolved external payload edge-cases, return empty list instead of 502.
	if errors.Is(retryErr, errParseSipedasResponse) || errors.Is(retryErr, errEmptySipedasResponse) {
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
		return nil, fmt.Errorf("sipedas returned %d", resp.StatusCode())
	}
	return parseWilayah(resp.Body())
}

func (s *WilayahService) resolveProvinceCode(ctx context.Context, year, province string) (string, error) {
	needle := strings.TrimSpace(province)
	if needle == "" {
		return "", nil
	}
	if isNumericCode(needle) {
		return needle, nil
	}

	items, err := s.fetchWilayah(ctx, "/list_pro", map[string]string{"thn": normalizeYear(year)})
	if err != nil {
		return "", err
	}
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
	if strings.TrimSpace(provCode) == "" {
		return "", nil
	}

	items, err := s.fetchWilayah(ctx, "/list_kab", map[string]string{
		"thn": normalizeYear(year),
		"pro": strings.TrimSpace(provCode),
	})
	if err != nil {
		return "", err
	}
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
