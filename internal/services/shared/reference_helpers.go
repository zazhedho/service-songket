package shared

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"service-songket/internal/dto"
	"service-songket/internal/master"
	legacysongket "service-songket/internal/songket"
)

func NormalizeRequiredUUID(raw, fieldName string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", fmt.Errorf("%s is required", fieldName)
	}
	if _, err := uuid.Parse(trimmed); err != nil {
		return "", fmt.Errorf("%s must be a valid UUID", fieldName)
	}
	return trimmed, nil
}

func NormalizeOptionalUUID(raw *string, fieldName string) (*string, error) {
	if raw == nil {
		return nil, nil
	}

	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil, nil
	}

	if _, err := uuid.Parse(trimmed); err != nil {
		return nil, fmt.Errorf("%s must be a valid UUID", fieldName)
	}

	return &trimmed, nil
}

func IsUniqueViolationError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "violates unique") ||
		strings.Contains(msg, "unique constraint")
}

func ApplyStringAliasesFilter(query *gorm.DB, column string, aliases []string) *gorm.DB {
	cleaned := make([]string, 0, len(aliases))
	seen := map[string]struct{}{}
	for _, alias := range aliases {
		normalized := strings.ToLower(strings.TrimSpace(alias))
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		cleaned = append(cleaned, normalized)
	}

	if len(cleaned) == 0 {
		return query
	}
	if len(cleaned) == 1 {
		return query.Where(fmt.Sprintf("LOWER(TRIM(%s)) = ?", column), cleaned[0])
	}
	return query.Where(fmt.Sprintf("LOWER(TRIM(%s)) IN ?", column), cleaned)
}

func ResolveProvinceAliases(db *gorm.DB, raw interface{}) []string {
	base := strings.TrimSpace(fmt.Sprint(raw))
	if base == "" {
		return nil
	}

	aliases := []string{base}
	var provinces []master.MasterProvince
	if err := db.
		Model(&master.MasterProvince{}).
		Select("code", "name").
		Where("LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)", base, base).
		Find(&provinces).Error; err != nil {
		return aliases
	}

	for _, province := range provinces {
		if code := strings.TrimSpace(province.Code); code != "" {
			aliases = append(aliases, code)
		}
		if name := strings.TrimSpace(province.Name); name != "" {
			aliases = append(aliases, name)
		}
	}

	return aliases
}

func NormalizeAreaNetIncome(areas []dto.NetIncomeAreaRequest) []legacysongket.NetIncomeAreaItem {
	if len(areas) == 0 {
		return []legacysongket.NetIncomeAreaItem{}
	}

	normalized := make([]legacysongket.NetIncomeAreaItem, 0, len(areas))
	for _, area := range areas {
		normalized = append(normalized, legacysongket.NetIncomeAreaItem{
			ProvinceCode: strings.TrimSpace(area.ProvinceCode),
			ProvinceName: strings.TrimSpace(area.ProvinceName),
			RegencyCode:  strings.TrimSpace(area.RegencyCode),
			RegencyName:  strings.TrimSpace(area.RegencyName),
		})
	}
	return NormalizeAreaNetIncomeItems(normalized)
}

func NormalizeAreaNetIncomeItems(areas []legacysongket.NetIncomeAreaItem) []legacysongket.NetIncomeAreaItem {
	if len(areas) == 0 {
		return []legacysongket.NetIncomeAreaItem{}
	}

	seen := make(map[string]struct{}, len(areas))
	out := make([]legacysongket.NetIncomeAreaItem, 0, len(areas))
	for _, area := range areas {
		item := legacysongket.NetIncomeAreaItem{
			ProvinceCode: strings.TrimSpace(area.ProvinceCode),
			ProvinceName: strings.TrimSpace(area.ProvinceName),
			RegencyCode:  strings.TrimSpace(area.RegencyCode),
			RegencyName:  strings.TrimSpace(area.RegencyName),
		}
		if item.ProvinceCode == "" && item.ProvinceName == "" && item.RegencyCode == "" && item.RegencyName == "" {
			continue
		}
		if item.ProvinceName == "" {
			item.ProvinceName = item.ProvinceCode
		}
		if item.RegencyName == "" {
			item.RegencyName = item.RegencyCode
		}
		if item.ProvinceCode == "" || item.RegencyCode == "" {
			if item.RegencyName == "" {
				continue
			}
		}

		key := strings.ToLower(strings.Join([]string{
			item.ProvinceCode,
			item.ProvinceName,
			item.RegencyCode,
			item.RegencyName,
		}, "|"))
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, item)
	}
	return out
}

func EncodeAreaNetIncome(areas []legacysongket.NetIncomeAreaItem) datatypes.JSON {
	clean := NormalizeAreaNetIncomeItems(areas)
	if len(clean) == 0 {
		return datatypes.JSON([]byte("[]"))
	}

	b, err := json.Marshal(clean)
	if err != nil {
		return datatypes.JSON([]byte("[]"))
	}
	return datatypes.JSON(b)
}

func DecodeAreaNetIncome(raw datatypes.JSON) []legacysongket.NetIncomeAreaItem {
	if len(raw) == 0 {
		return []legacysongket.NetIncomeAreaItem{}
	}

	var areas []legacysongket.NetIncomeAreaItem
	if err := json.Unmarshal(raw, &areas); err == nil {
		return NormalizeAreaNetIncomeItems(areas)
	}

	var legacy []string
	if err := json.Unmarshal(raw, &legacy); err == nil {
		mapped := make([]legacysongket.NetIncomeAreaItem, 0, len(legacy))
		for _, item := range legacy {
			val := strings.TrimSpace(item)
			if val == "" {
				continue
			}
			mapped = append(mapped, legacysongket.NetIncomeAreaItem{
				ProvinceCode: "",
				ProvinceName: "",
				RegencyCode:  val,
				RegencyName:  val,
			})
		}
		return NormalizeAreaNetIncomeItems(mapped)
	}

	return []legacysongket.NetIncomeAreaItem{}
}

func ErrRecordNotFound() error {
	return gorm.ErrRecordNotFound
}

func ValidateMotorTypeArea(motor legacysongket.MotorType, provinceCode, regencyCode string) error {
	motorProvince := strings.TrimSpace(motor.ProvinceCode)
	motorRegency := strings.TrimSpace(motor.RegencyCode)
	orderProvince := strings.TrimSpace(provinceCode)
	orderRegency := strings.TrimSpace(regencyCode)

	if motorProvince == "" && motorRegency == "" {
		return nil
	}
	if motorProvince != "" && orderProvince != "" && motorProvince != orderProvince {
		return fmt.Errorf("motor type is not available for selected province")
	}
	if motorRegency != "" && orderRegency != "" && motorRegency != orderRegency {
		return fmt.Errorf("motor type is not available for selected regency")
	}
	return nil
}
