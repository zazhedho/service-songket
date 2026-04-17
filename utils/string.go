package utils

import (
	"strings"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

func TitleCase(s string) string {
	titleCaser := cases.Title(language.English)
	return titleCaser.String(s)
}

// ValueOrDefault returns v if not nil, otherwise def.
func ValueOrDefault[T any](v *T, def T) T {
	if v == nil {
		return def
	}
	return *v
}

func SanitizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}
