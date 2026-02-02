package database

import (
	domainrole "starter-kit/internal/domain/role"
	"starter-kit/internal/songket"
	"starter-kit/pkg/logger"
	"starter-kit/utils"

	"gorm.io/gorm"
)

// AutoMigrate runs gorm automigrate for all core and SONGKET tables.
func AutoMigrate(db *gorm.DB) error {
	logger.WriteLog(logger.LogLevelInfo, "Running GORM AutoMigrate...")

	// Ensure pgcrypto exists for gen_random_uuid()
	if err := db.Exec(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).Error; err != nil {
		return err
	}

	// Only migrate SONGKET-specific tables to avoid touching existing RBAC/user schema.
	models := []interface{}{
		&songket.Dealer{},
		&songket.FinanceCompany{},
		&songket.MotorType{},
		&songket.Job{},
		&songket.Order{},
		&songket.OrderFinanceAttempt{},
		&songket.CreditCapability{},
		&songket.QuadrantResult{},
		&songket.Commodity{},
		&songket.CommodityPrice{},
		&songket.NewsSource{},
		&songket.NewsItem{},
	}

	if err := db.AutoMigrate(models...); err != nil {
		return err
	}

	logger.WriteLog(logger.LogLevelInfo, "AutoMigrate done")
	if err := seedDefaults(db); err != nil {
		return err
	}
	return nil
}

func seedDefaults(db *gorm.DB) error {
	// Roles
	defaultRoles := []domainrole.Role{
		{Id: utils.CreateUUID(), Name: utils.RoleSuperAdmin, DisplayName: "Superadmin", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleMainDealer, DisplayName: "Main Dealer", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleDealer, DisplayName: "Dealer", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleAdmin, DisplayName: "Admin", IsSystem: true},
	}
	for _, r := range defaultRoles {
		_ = db.Where("name = ?", r.Name).FirstOrCreate(&r).Error
	}

	// Finance companies placeholder
	fcs := []songket.FinanceCompany{
		{Id: utils.CreateUUID(), Name: "FIF"},
		{Id: utils.CreateUUID(), Name: "Adira"},
		{Id: utils.CreateUUID(), Name: "BCA Finance"},
	}
	for _, fc := range fcs {
		_ = db.Where("name = ?", fc.Name).FirstOrCreate(&fc).Error
	}

	// Jobs
	jobs := []songket.Job{
		{Id: utils.CreateUUID(), Name: "PNS"},
		{Id: utils.CreateUUID(), Name: "Petani"},
		{Id: utils.CreateUUID(), Name: "Wiraswasta"},
	}
	for _, j := range jobs {
		_ = db.Where("name = ?", j.Name).FirstOrCreate(&j).Error
	}

	// Commodities baseline
	comms := []songket.Commodity{
		{Id: utils.CreateUUID(), Name: "Beras", Unit: "kg"},
		{Id: utils.CreateUUID(), Name: "Cabai", Unit: "kg"},
		{Id: utils.CreateUUID(), Name: "Bawang Merah", Unit: "kg"},
	}
	for _, c := range comms {
		_ = db.Where("name = ?", c.Name).FirstOrCreate(&c).Error
	}

	// Motor types placeholder with OTR
	motors := []songket.MotorType{
		{Id: utils.CreateUUID(), Name: "Scoopy", OTR: 23000000},
		{Id: utils.CreateUUID(), Name: "Beat", OTR: 19000000},
		{Id: utils.CreateUUID(), Name: "Vario 160", OTR: 29000000},
	}
	for _, m := range motors {
		_ = db.Where("name = ?", m.Name).FirstOrCreate(&m).Error
	}

	// Dealers sample with coordinates (NTB area)
	dealers := []songket.Dealer{
		{Id: utils.CreateUUID(), Name: "Dealer Mataram", Regency: "Kota Mataram", Province: "NTB", Latitude: -8.5833, Longitude: 116.1167, Address: "Jl. Pejanggik"},
		{Id: utils.CreateUUID(), Name: "Dealer Lombok Barat", Regency: "Lombok Barat", Province: "NTB", Latitude: -8.652, Longitude: 116.105, Address: "Jl. Raya Gerung"},
		{Id: utils.CreateUUID(), Name: "Dealer Bima", Regency: "Bima", Province: "NTB", Latitude: -8.460, Longitude: 118.726, Address: "Jl. Soekarno Hatta"},
	}
	for _, d := range dealers {
		_ = db.Where("name = ?", d.Name).FirstOrCreate(&d).Error
	}

	return nil
}
