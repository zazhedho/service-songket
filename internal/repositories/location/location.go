package repositorylocation

import (
	"strings"
	"sync"

	domainlocation "service-songket/internal/domain/location"
	interfacelocation "service-songket/internal/interfaces/location"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	locationLevelProvince = "province"
	locationLevelCity     = "city"
	locationLevelDistrict = "district"
)

type repo struct {
	db         *gorm.DB
	schemaOnce sync.Once
	schemaErr  error
}

func NewLocationRepo(db *gorm.DB) interfacelocation.RepoLocationInterface {
	return &repo{db: db}
}

func (r *repo) EnsureSchema() error {
	if r.db == nil {
		return nil
	}
	r.schemaOnce.Do(func() {
		r.schemaErr = r.db.AutoMigrate(
			&domainlocation.MasterProvince{},
			&domainlocation.MasterRegency{},
			&domainlocation.MasterDistrict{},
		)
	})
	return r.schemaErr
}

func (r *repo) ListProvinceCache() ([]domainlocation.LocationItem, error) {
	if err := r.EnsureSchema(); err != nil || r.db == nil {
		return nil, err
	}
	var rows []domainlocation.MasterProvince
	if err := r.db.Model(&domainlocation.MasterProvince{}).Order("code ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]domainlocation.LocationItem, 0, len(rows))
	for _, row := range rows {
		code := strings.TrimSpace(row.Code)
		name := strings.TrimSpace(row.Name)
		if code == "" || name == "" {
			continue
		}
		items = append(items, domainlocation.LocationItem{Code: code, Name: name})
	}
	return items, nil
}

func (r *repo) ListCityCache(provinceCode string) ([]domainlocation.LocationItem, error) {
	if err := r.EnsureSchema(); err != nil || r.db == nil {
		return nil, err
	}
	var rows []domainlocation.MasterRegency
	query := r.db.Model(&domainlocation.MasterRegency{})
	if trimmed := strings.TrimSpace(provinceCode); trimmed != "" {
		query = query.Where("province_code = ?", trimmed)
	}
	if err := query.Order("code ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]domainlocation.LocationItem, 0, len(rows))
	for _, row := range rows {
		code := strings.TrimSpace(row.Code)
		name := strings.TrimSpace(row.Name)
		if code == "" || name == "" {
			continue
		}
		items = append(items, domainlocation.LocationItem{Code: code, Name: name})
	}
	return items, nil
}

func (r *repo) ListDistrictCache(provinceCode, cityCode string) ([]domainlocation.LocationItem, error) {
	if err := r.EnsureSchema(); err != nil || r.db == nil {
		return nil, err
	}
	var rows []domainlocation.MasterDistrict
	query := r.db.Model(&domainlocation.MasterDistrict{})
	if trimmed := strings.TrimSpace(provinceCode); trimmed != "" {
		query = query.Where("province_code = ?", trimmed)
	}
	if trimmed := strings.TrimSpace(cityCode); trimmed != "" {
		query = query.Where("regency_code = ?", trimmed)
	}
	if err := query.Order("code ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]domainlocation.LocationItem, 0, len(rows))
	for _, row := range rows {
		code := strings.TrimSpace(row.Code)
		name := strings.TrimSpace(row.Name)
		if code == "" || name == "" {
			continue
		}
		items = append(items, domainlocation.LocationItem{Code: code, Name: name})
	}
	return items, nil
}

func (r *repo) UpsertProvinceCache(items []domainlocation.LocationItem, source string) error {
	return r.upsertCache(locationLevelProvince, "", "", items, source)
}

func (r *repo) UpsertCityCache(provinceCode string, items []domainlocation.LocationItem, source string) error {
	return r.upsertCache(locationLevelCity, provinceCode, "", items, source)
}

func (r *repo) UpsertDistrictCache(provinceCode, cityCode string, items []domainlocation.LocationItem, source string) error {
	return r.upsertCache(locationLevelDistrict, provinceCode, cityCode, items, source)
}

func (r *repo) upsertCache(level, provinceCode, cityCode string, items []domainlocation.LocationItem, source string) error {
	if err := r.EnsureSchema(); err != nil || r.db == nil || len(items) == 0 {
		return err
	}

	cleanProvince := strings.TrimSpace(provinceCode)
	cleanCity := strings.TrimSpace(cityCode)
	cleanSource := strings.TrimSpace(source)
	if cleanSource == "" {
		cleanSource = "third_party"
	}

	switch strings.TrimSpace(level) {
	case locationLevelProvince:
		rows := make([]domainlocation.MasterProvince, 0, len(items))
		for _, item := range items {
			code := strings.TrimSpace(item.Code)
			name := strings.TrimSpace(item.Name)
			if code == "" || name == "" {
				continue
			}
			rows = append(rows, domainlocation.MasterProvince{Code: code, Name: name, Source: cleanSource})
		}
		if len(rows) == 0 {
			return nil
		}
		return r.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "code"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"name":       gorm.Expr("EXCLUDED.name"),
				"source":     gorm.Expr("EXCLUDED.source"),
				"deleted_at": nil,
				"updated_at": gorm.Expr("NOW()"),
			}),
		}).Create(&rows).Error
	case locationLevelCity:
		rows := make([]domainlocation.MasterRegency, 0, len(items))
		for _, item := range items {
			code := strings.TrimSpace(item.Code)
			name := strings.TrimSpace(item.Name)
			if code == "" || name == "" {
				continue
			}
			rows = append(rows, domainlocation.MasterRegency{
				ProvinceCode: cleanProvince,
				Code:         code,
				Name:         name,
				Source:       cleanSource,
			})
		}
		if len(rows) == 0 {
			return nil
		}
		return r.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "province_code"}, {Name: "code"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"province_code": gorm.Expr("EXCLUDED.province_code"),
				"name":          gorm.Expr("EXCLUDED.name"),
				"source":        gorm.Expr("EXCLUDED.source"),
				"deleted_at":    nil,
				"updated_at":    gorm.Expr("NOW()"),
			}),
		}).Create(&rows).Error
	case locationLevelDistrict:
		rows := make([]domainlocation.MasterDistrict, 0, len(items))
		for _, item := range items {
			code := strings.TrimSpace(item.Code)
			name := strings.TrimSpace(item.Name)
			if code == "" || name == "" {
				continue
			}
			rows = append(rows, domainlocation.MasterDistrict{
				ProvinceCode: cleanProvince,
				RegencyCode:  cleanCity,
				Code:         code,
				Name:         name,
				Source:       cleanSource,
			})
		}
		if len(rows) == 0 {
			return nil
		}
		return r.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "province_code"}, {Name: "regency_code"}, {Name: "code"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"province_code": gorm.Expr("EXCLUDED.province_code"),
				"regency_code":  gorm.Expr("EXCLUDED.regency_code"),
				"name":          gorm.Expr("EXCLUDED.name"),
				"source":        gorm.Expr("EXCLUDED.source"),
				"deleted_at":    nil,
				"updated_at":    gorm.Expr("NOW()"),
			}),
		}).Create(&rows).Error
	default:
		return nil
	}
}
