package servicemastersetting

import (
	"strings"

	"github.com/google/uuid"
)

func normalizeCronIntervalMinutes(value int) int {
	if value < minCronIntervalMinutes {
		return minCronIntervalMinutes
	}
	if value > maxCronIntervalMinutes {
		return maxCronIntervalMinutes
	}
	return value
}

func normalizeCronIntervalDays(value int) int {
	if value < minCronIntervalDays {
		return minCronIntervalDays
	}
	if value > maxCronIntervalDays {
		return maxCronIntervalDays
	}
	return value
}

func intervalMinutesToDays(value int) int {
	minutes := value
	if minutes <= 0 {
		minutes = minutesPerDay
	}
	days := minutes / minutesPerDay
	if minutes%minutesPerDay != 0 {
		days++
	}
	return normalizeCronIntervalDays(days)
}

func daysToIntervalMinutes(days int) int {
	return normalizeCronIntervalDays(days) * minutesPerDay
}

func normalizeHistoryActorUserID(actorUserID string) *string {
	trimmed := strings.TrimSpace(actorUserID)
	if trimmed == "" {
		return nil
	}
	if _, err := uuid.Parse(trimmed); err != nil {
		return nil
	}
	return &trimmed
}

func normalizeHistoryActorName(actorName string) string {
	trimmed := strings.TrimSpace(actorName)
	if trimmed == "" {
		return "-"
	}
	return trimmed
}
