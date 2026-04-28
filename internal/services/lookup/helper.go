package servicelookup

import "strings"

func isNumericAreaCode(value string) bool {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return false
	}
	for _, ch := range trimmed {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return true
}
