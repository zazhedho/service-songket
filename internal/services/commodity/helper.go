package servicecommodity

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

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
