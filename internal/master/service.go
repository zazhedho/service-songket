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

	"github.com/go-resty/resty/v2"

	"starter-kit/utils"
)

const (
	defaultSipedasBaseURL = "https://sipedas.pertanian.go.id/api/wilayah"
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
	resp, err := s.client.R().
		SetContext(ctx).
		SetQueryParam("thn", y).
		Get("/list_pro")
	if err != nil {
		return nil, err
	}
	if resp.IsError() {
		return nil, fmt.Errorf("sipedas returned %d", resp.StatusCode())
	}
	return parseWilayah(resp.Body())
}

// GetKabupaten returns regencies/cities for the given province code.
func (s *WilayahService) GetKabupaten(ctx context.Context, year, provCode string) ([]WilayahItem, error) {
	if strings.TrimSpace(provCode) == "" {
		return nil, errors.New("parameter 'pro' is required")
	}

	y := normalizeYear(year)
	resp, err := s.client.R().
		SetContext(ctx).
		SetQueryParams(map[string]string{
			"thn": y,
			"pro": provCode,
		}).
		Get("/list_kab")
	if err != nil {
		return nil, err
	}
	if resp.IsError() {
		return nil, fmt.Errorf("sipedas returned %d", resp.StatusCode())
	}
	return parseWilayah(resp.Body())
}

// GetKecamatan returns districts for the given province + regency codes.
func (s *WilayahService) GetKecamatan(ctx context.Context, year, provCode, kabCode string) ([]WilayahItem, error) {
	if strings.TrimSpace(provCode) == "" || strings.TrimSpace(kabCode) == "" {
		return nil, errors.New("parameters 'pro' and 'kab' are required")
	}

	y := normalizeYear(year)
	resp, err := s.client.R().
		SetContext(ctx).
		SetQueryParams(map[string]string{
			"thn": y,
			"pro": provCode,
			"kab": kabCode,
		}).
		Get("/list_kec")
	if err != nil {
		return nil, err
	}
	if resp.IsError() {
		return nil, fmt.Errorf("sipedas returned %d", resp.StatusCode())
	}
	return parseWilayah(resp.Body())
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

func parseWilayah(body []byte) ([]WilayahItem, error) {
	if len(body) == 0 {
		return nil, errors.New("empty response from sipedas")
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

	return nil, errors.New("unable to parse sipedas response")
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
