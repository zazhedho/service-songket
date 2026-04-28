package servicenews

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	domainnews "service-songket/internal/domain/news"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

func buildNewsImagesJSON(images domainnews.NewsScrapedImages) (datatypes.JSON, bool) {
	main := strings.TrimSpace(images.Main)
	seen := map[string]struct{}{}
	list := make([]string, 0, len(images.List))
	for _, raw := range images.List {
		image := strings.TrimSpace(raw)
		if image == "" {
			continue
		}
		if _, exists := seen[image]; exists {
			continue
		}
		seen[image] = struct{}{}
		list = append(list, image)
	}
	if main == "" && len(list) > 0 {
		main = list[0]
	}
	if main != "" {
		if _, exists := seen[main]; !exists {
			list = append([]string{main}, list...)
		}
	}

	payload := map[string]interface{}{
		"foto_utama":   main,
		"dalam_berita": list,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return datatypes.JSON([]byte(`{"foto_utama":"","dalam_berita":[]}`)), false
	}
	return datatypes.JSON(raw), main != "" || len(list) > 0
}

func parsePythonNewsArticles(output []byte) ([]domainnews.NewsScrapedArticle, error) {
	var rows []map[string]interface{}
	if err := json.Unmarshal(output, &rows); err != nil {
		return nil, err
	}

	out := make([]domainnews.NewsScrapedArticle, 0, len(rows))
	for _, row := range rows {
		item := domainnews.NewsScrapedArticle{
			Title:     strings.TrimSpace(firstString(row, "judul", "title")),
			Content:   sanitizeNewsContent(firstString(row, "isi", "content", "body")),
			CreatedAt: strings.TrimSpace(firstString(row, "created_at", "published_at", "date")),
			Source:    strings.TrimSpace(firstString(row, "sumber", "source")),
			URL:       strings.TrimSpace(firstString(row, "url", "link")),
			Category:  strings.TrimSpace(firstString(row, "category", "kategori")),
		}
		if v, ok := row["images"].(map[string]interface{}); ok {
			item.Images = domainnews.NewsScrapedImages{
				Main: strings.TrimSpace(firstString(v, "foto_utama", "main", "thumbnail")),
				List: parseStringSlice(v["dalam_berita"]),
			}
		}
		if item.Images.Main == "" && len(item.Images.List) > 0 {
			item.Images.Main = item.Images.List[0]
		}
		if item.Title == "" || item.URL == "" {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

func sanitizeNewsContent(raw string) string {
	text := strings.TrimSpace(raw)
	if text == "" {
		return ""
	}
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	lines := strings.Split(text, "\n")

	normalized := make([]string, 0, len(lines))
	lastEmpty := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			if !lastEmpty && len(normalized) > 0 {
				normalized = append(normalized, "")
				lastEmpty = true
			}
			continue
		}
		normalized = append(normalized, trimmed)
		lastEmpty = false
	}

	for i := 0; i < 3 && len(normalized) > 0; i++ {
		if !looksLikeNewsBreadcrumbLine(normalized[0]) {
			break
		}
		normalized = normalized[1:]
	}

	return strings.TrimSpace(strings.Join(normalized, "\n"))
}

func looksLikeNewsBreadcrumbLine(line string) bool {
	line = strings.TrimSpace(strings.ToLower(line))
	if line == "" {
		return false
	}
	replacer := strings.NewReplacer(">", "/", "|", "/", "»", "/", "\\", "/", "•", "/", " - ", "/", ":", "/")
	line = replacer.Replace(line)
	partsRaw := strings.Split(line, "/")
	parts := make([]string, 0, len(partsRaw))
	for _, part := range partsRaw {
		part = strings.TrimSpace(strings.Trim(part, ".,-"))
		if part == "" {
			continue
		}
		parts = append(parts, part)
	}
	if len(parts) == 0 {
		return false
	}
	if parts[0] != "beranda" && parts[0] != "home" {
		return false
	}
	if len(parts) > 8 {
		return false
	}
	for _, part := range parts {
		if len([]rune(part)) > 40 {
			return false
		}
	}
	return true
}

func parseNewsTime(raw string) (time.Time, bool) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05-0700",
		"2006-01-02 15:04:05",
		time.RFC1123Z,
		time.RFC1123,
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

func normalizeNewsURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return strings.TrimRight(strings.ToLower(raw), "/")
	}
	parsed.Scheme = strings.ToLower(parsed.Scheme)
	parsed.Host = strings.ToLower(parsed.Host)
	parsed.Fragment = ""
	parsed.RawQuery = ""
	parsed.Path = strings.TrimRight(parsed.Path, "/")
	if parsed.Path == "" {
		parsed.Path = "/"
	}
	return parsed.String()
}

func baseSiteURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil || strings.TrimSpace(parsed.Host) == "" {
		return raw
	}
	scheme := strings.ToLower(strings.TrimSpace(parsed.Scheme))
	if scheme == "" {
		scheme = "https"
	}
	return scheme + "://" + strings.ToLower(strings.TrimSpace(parsed.Host)) + "/"
}

func hostFromURL(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(parsed.Host))
}

func parseStringSlice(value interface{}) []string {
	switch typed := value.(type) {
	case []interface{}:
		out := make([]string, 0, len(typed))
		for _, raw := range typed {
			if str, ok := raw.(string); ok {
				str = strings.TrimSpace(str)
				if str != "" {
					out = append(out, str)
				}
			}
		}
		return out
	case []string:
		out := make([]string, 0, len(typed))
		for _, str := range typed {
			str = strings.TrimSpace(str)
			if str != "" {
				out = append(out, str)
			}
		}
		return out
	default:
		return nil
	}
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

func validUUIDOrEmpty(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if _, err := uuid.Parse(raw); err != nil {
		return ""
	}
	return raw
}

func stringPtr(value string) *string {
	v := value
	return &v
}

func isExecNotFound(err error) bool {
	var execErr *exec.Error
	if errors.As(err, &execErr) {
		return errors.Is(execErr.Err, exec.ErrNotFound)
	}
	var pathErr *os.PathError
	if errors.As(err, &pathErr) {
		return errors.Is(pathErr.Err, os.ErrNotExist)
	}
	return false
}
