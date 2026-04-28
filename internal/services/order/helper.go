package serviceorder

import (
	"fmt"
	domainorder "service-songket/internal/domain/order"
	"strings"
	"time"
)

func hasAttempt(atts []domainorder.OrderFinanceAttempt, num int) bool {
	for _, a := range atts {
		if a.AttemptNo == num {
			return true
		}
	}
	return false
}

func findAttempt(atts []domainorder.OrderFinanceAttempt, num int) (domainorder.OrderFinanceAttempt, bool) {
	for _, att := range atts {
		if att.AttemptNo == num {
			return att, true
		}
	}
	return domainorder.OrderFinanceAttempt{}, false
}

func deriveCloneResult(primaryStatus, primaryNotes, secondStatus, secondNotes string) (string, string) {
	status := strings.ToLower(strings.TrimSpace(secondStatus))
	if status == "" {
		status = strings.ToLower(strings.TrimSpace(primaryStatus))
	}
	notes := strings.TrimSpace(secondNotes)
	if notes == "" {
		notes = strings.TrimSpace(primaryNotes)
	}
	return status, notes
}

func parseTime(val *string) (time.Time, error) {
	if val == nil || strings.TrimSpace(*val) == "" {
		return time.Time{}, nil
	}
	return time.Parse(time.RFC3339, *val)
}

func parseTimeRequired(val string) (time.Time, error) {
	t, err := time.Parse(time.RFC3339, val)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid time format, use RFC3339: %w", err)
	}
	return t, nil
}
