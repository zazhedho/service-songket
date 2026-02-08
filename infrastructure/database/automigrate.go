package database

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"starter-kit/internal/domain/master/provinsi"
	"strconv"
	"strings"

	domainauth "starter-kit/internal/domain/auth"
	domainmenu "starter-kit/internal/domain/menu"
	domainpermission "starter-kit/internal/domain/permission"
	domainrole "starter-kit/internal/domain/role"
	domainuser "starter-kit/internal/domain/user"
	"starter-kit/internal/songket"
	"starter-kit/pkg/logger"
	"starter-kit/utils"

	"github.com/go-resty/resty/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// AutoMigrate runs gorm automigrate for all core and SONGKET tables.
func AutoMigrate(db *gorm.DB) error {
	logger.WriteLog(logger.LogLevelInfo, "Running GORM AutoMigrate...")

	// Ensure pgcrypto exists for gen_random_uuid()
	if err := db.Exec(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).Error; err != nil {
		return err
	}

	// Migrate core auth/RBAC + SONGKET domain tables.
	models := []interface{}{
		// Auth & RBAC
		&domainauth.Blacklist{},
		&domainuser.Users{},
		&domainrole.Role{},
		&domainpermission.Permission{},
		&domainpermission.UserPermission{},
		&domainmenu.MenuItem{},
		&domainrole.RolePermission{},
		&domainrole.RoleMenu{},

		// SONGKET domain
		&songket.Dealer{},
		&songket.FinanceCompany{},
		&songket.MotorType{},
		&songket.Job{},
		&songket.JobNetIncome{},
		&songket.Order{},
		&songket.OrderFinanceAttempt{},
		&songket.CreditCapability{},
		&songket.QuadrantResult{},
		&songket.Commodity{},
		&songket.CommodityPrice{},
		&songket.NewsSource{},
		&songket.NewsItem{},
		&songket.ScrapeSource{},
		&songket.ScrapeJob{},
		&songket.ScrapeResult{},
		//&provinsi.Provinsi{},
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
	roleIDs, err := seedRoles(db)
	if err != nil {
		return err
	}

	permIDs, err := seedPermissions(db)
	if err != nil {
		return err
	}

	menuIDs, err := seedMenus(db)
	if err != nil {
		return err
	}

	if err := seedRolePermissions(db, roleIDs, permIDs); err != nil {
		return err
	}
	if err := seedRoleMenus(db, roleIDs, menuIDs); err != nil {
		return err
	}
	if err := cleanupLegacyJobNetIncome(db); err != nil {
		return err
	}

	// Finance companies placeholder
	fcs := []songket.FinanceCompany{
		{Id: utils.CreateUUID(), Name: "FIF"},
		{Id: utils.CreateUUID(), Name: "Adira"},
		{Id: utils.CreateUUID(), Name: "BCA Finance"},
	}
	for _, fc := range fcs {
		var existing songket.FinanceCompany
		err := db.Unscoped().Where("name = ?", fc.Name).First(&existing).Error
		if err == nil {
			existing.DeletedAt = gorm.DeletedAt{}
			if err := db.Save(&existing).Error; err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoNothing: true,
		}).Create(&fc).Error; err != nil {
			return err
		}
	}

	// Jobs
	jobs := []songket.Job{
		{Id: utils.CreateUUID(), Name: "PNS"},
		{Id: utils.CreateUUID(), Name: "Petani"},
		{Id: utils.CreateUUID(), Name: "Wiraswasta"},
	}
	for _, j := range jobs {
		var existing songket.Job
		err := db.Unscoped().Where("name = ?", j.Name).First(&existing).Error
		if err == nil {
			existing.DeletedAt = gorm.DeletedAt{}
			if err := db.Save(&existing).Error; err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoNothing: true,
		}).Create(&j).Error; err != nil {
			return err
		}
	}

	// Commodities baseline
	comms := []songket.Commodity{
		{Id: utils.CreateUUID(), Name: "Beras", Unit: "kg"},
		{Id: utils.CreateUUID(), Name: "Cabai", Unit: "kg"},
		{Id: utils.CreateUUID(), Name: "Bawang Merah", Unit: "kg"},
	}
	for _, c := range comms {
		var existing songket.Commodity
		err := db.Unscoped().Where("name = ?", c.Name).First(&existing).Error
		if err == nil {
			existing.Unit = c.Unit
			existing.DeletedAt = gorm.DeletedAt{}
			if err := db.Save(&existing).Error; err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"unit", "deleted_at"}),
		}).Create(&c).Error; err != nil {
			return err
		}
	}

	// Motor types placeholder with OTR
	motors := []songket.MotorType{
		{Id: utils.CreateUUID(), Name: "Scoopy", OTR: 23000000},
		{Id: utils.CreateUUID(), Name: "Beat", OTR: 19000000},
		{Id: utils.CreateUUID(), Name: "Vario 160", OTR: 29000000},
	}
	for _, m := range motors {
		var existing songket.MotorType
		err := db.Unscoped().Where("name = ?", m.Name).First(&existing).Error
		if err == nil {
			existing.OTR = m.OTR
			existing.DeletedAt = gorm.DeletedAt{}
			if err := db.Save(&existing).Error; err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"otr", "deleted_at"}),
		}).Create(&m).Error; err != nil {
			return err
		}
	}

	// Dealers sample with coordinates (NTB area)
	dealers := []songket.Dealer{
		{Id: utils.CreateUUID(), Name: "Dealer Mataram", Regency: "Kota Mataram", Province: "NTB", Latitude: -8.5833, Longitude: 116.1167, Address: "Jl. Pejanggik"},
		{Id: utils.CreateUUID(), Name: "Dealer Lombok Barat", Regency: "Lombok Barat", Province: "NTB", Latitude: -8.652, Longitude: 116.105, Address: "Jl. Raya Gerung"},
		{Id: utils.CreateUUID(), Name: "Dealer Bima", Regency: "Bima", Province: "NTB", Latitude: -8.460, Longitude: 118.726, Address: "Jl. Soekarno Hatta"},
	}
	for _, d := range dealers {
		var existing songket.Dealer
		err := db.Unscoped().Where("name = ?", d.Name).First(&existing).Error
		if err == nil {
			existing.Regency = d.Regency
			existing.Province = d.Province
			existing.Address = d.Address
			existing.Latitude = d.Latitude
			existing.Longitude = d.Longitude
			existing.DeletedAt = gorm.DeletedAt{}
			if err := db.Save(&existing).Error; err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"regency", "province", "address", "lat", "lng", "deleted_at"}),
		}).Create(&d).Error; err != nil {
			return err
		}
	}

	//if err := seedProvinsiFromAPI(context.Background(), db, "2024"); err != nil {
	//	return err
	//}

	return nil
}

func cleanupLegacyJobNetIncome(db *gorm.DB) error {
	legacyPerms := []string{
		"list_job_net_income",
		"view_job_net_income",
		"create_job_net_income",
		"update_job_net_income",
		"delete_job_net_income",
	}

	if err := db.Where(
		"permission_id IN (?)",
		db.Model(&domainpermission.Permission{}).Select("id").Where("name IN ?", legacyPerms),
	).Delete(&domainrole.RolePermission{}).Error; err != nil {
		return err
	}

	if err := db.Where(
		"menu_item_id IN (?)",
		db.Model(&domainmenu.MenuItem{}).Select("id").Where("name = ?", "job_net_income"),
	).Delete(&domainrole.RoleMenu{}).Error; err != nil {
		return err
	}

	if err := db.Where("name = ?", "job_net_income").Delete(&domainmenu.MenuItem{}).Error; err != nil {
		return err
	}
	if err := db.Where("name IN ?", legacyPerms).Delete(&domainpermission.Permission{}).Error; err != nil {
		return err
	}

	return nil
}

func seedRoles(db *gorm.DB) (map[string]string, error) {
	roles := []domainrole.Role{
		{Id: utils.CreateUUID(), Name: utils.RoleSuperAdmin, DisplayName: "Superadmin", IsSystem: true},
		//{Id: utils.CreateUUID(), Name: utils.RoleAdmin, DisplayName: "Admin", IsSystem: true},
		//{Id: utils.CreateUUID(), Name: utils.RoleStaff, DisplayName: "Staff", IsSystem: true},
		//{Id: utils.CreateUUID(), Name: utils.RoleViewer, DisplayName: "Viewer", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleMainDealer, DisplayName: "Main Dealer", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleDealer, DisplayName: "Dealer", IsSystem: true},
		//{Id: utils.CreateUUID(), Name: utils.RoleMember, DisplayName: "Member", IsSystem: false},
	}

	result := make(map[string]string)
	for _, r := range roles {
		// Idempotent upsert by name; if exists, refresh fields and reactivate soft-deleted rows.
		var existing domainrole.Role
		err := db.Unscoped().Where("name = ?", r.Name).First(&existing).Error
		if err == nil {
			existing.DisplayName = r.DisplayName
			existing.Description = r.Description
			existing.IsSystem = r.IsSystem
			existing.DeletedAt = gorm.DeletedAt{}
			if err := db.Save(&existing).Error; err != nil {
				return nil, err
			}
			result[r.Name] = existing.Id
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "description", "is_system", "deleted_at"}),
		}).Create(&r).Error; err != nil {
			return nil, err
		}
		// re-fetch to get actual ID when conflict happened
		if err := db.Where("name = ?", r.Name).First(&existing).Error; err != nil {
			return nil, err
		}
		result[r.Name] = existing.Id
	}
	return result, nil
}

func seedPermissions(db *gorm.DB) (map[string]string, error) {
	perms := []domainpermission.Permission{
		// Dashboard
		{Name: "view_dashboard", DisplayName: "View Dashboard", Resource: "dashboard", Action: "view"},

		// Users
		{Name: "list_users", DisplayName: "List Users", Resource: "users", Action: "list"},
		{Name: "view_users", DisplayName: "View User Detail", Resource: "users", Action: "view"},
		{Name: "create_users", DisplayName: "Create Users", Resource: "users", Action: "create"},
		{Name: "update_users", DisplayName: "Update Users", Resource: "users", Action: "update"},
		{Name: "update_password_users", DisplayName: "Update Password Users", Resource: "users", Action: "update_password"},
		{Name: "delete_users", DisplayName: "Delete Users", Resource: "users", Action: "delete"},

		// Roles
		{Name: "list_roles", DisplayName: "List Roles", Resource: "roles", Action: "list"},
		{Name: "view_roles", DisplayName: "View Role Detail", Resource: "roles", Action: "view"},
		{Name: "create_roles", DisplayName: "Create Roles", Resource: "roles", Action: "create"},
		{Name: "update_roles", DisplayName: "Update Roles", Resource: "roles", Action: "update"},
		{Name: "delete_roles", DisplayName: "Delete Roles", Resource: "roles", Action: "delete"},
		{Name: "assign_permissions", DisplayName: "Assign Permissions", Resource: "roles", Action: "assign_permissions"},
		{Name: "assign_menus", DisplayName: "Assign Menus", Resource: "roles", Action: "assign_menus"},

		// Menus
		{Name: "list_menus", DisplayName: "List Menus", Resource: "menus", Action: "list"},
		{Name: "view_menu", DisplayName: "View Menu Detail", Resource: "menus", Action: "view"},
		{Name: "create_menu", DisplayName: "Create Menu", Resource: "menus", Action: "create"},
		{Name: "update_menu", DisplayName: "Update Menu", Resource: "menus", Action: "update"},
		{Name: "delete_menu", DisplayName: "Delete Menu", Resource: "menus", Action: "delete"},

		// Permissions management
		{Name: "list_permissions", DisplayName: "List Permissions", Resource: "permissions", Action: "list"},
		{Name: "view_permissions", DisplayName: "View Permission Detail", Resource: "permissions", Action: "view"},
		{Name: "create_permissions", DisplayName: "Create Permissions", Resource: "permissions", Action: "create"},
		{Name: "update_permissions", DisplayName: "Update Permissions", Resource: "permissions", Action: "update"},
		{Name: "delete_permissions", DisplayName: "Delete Permissions", Resource: "permissions", Action: "delete"},

		// Profile
		{Name: "view_profile", DisplayName: "View Profile", Resource: "profile", Action: "view"},
		{Name: "update_profile", DisplayName: "Update Profile", Resource: "profile", Action: "update"},
		{Name: "update_password_profile", DisplayName: "Update Password Profile", Resource: "profile", Action: "update_password"},
		{Name: "delete_profile", DisplayName: "Delete Profile", Resource: "profile", Action: "delete"},

		// Orders
		{Name: "list_orders", DisplayName: "List Orders", Resource: "orders", Action: "list"},
		{Name: "view_orders", DisplayName: "View Order Detail", Resource: "orders", Action: "view"},
		{Name: "create_orders", DisplayName: "Create Orders", Resource: "orders", Action: "create"},
		{Name: "update_orders", DisplayName: "Update Orders", Resource: "orders", Action: "update"},
		{Name: "delete_orders", DisplayName: "Delete Orders", Resource: "orders", Action: "delete"},

		// Finance
		{Name: "list_finance_dealers", DisplayName: "List Finance Dealers", Resource: "finance", Action: "list_dealers"},
		{Name: "view_finance_metrics", DisplayName: "View Finance Metrics", Resource: "finance", Action: "view_metrics"},

		// Jobs master (Nama Pekerjaan)
		{Name: "list_jobs", DisplayName: "List Jobs", Resource: "jobs", Action: "list"},
		{Name: "view_jobs", DisplayName: "View Jobs", Resource: "jobs", Action: "view"},
		{Name: "create_jobs", DisplayName: "Create Jobs", Resource: "jobs", Action: "create"},
		{Name: "update_jobs", DisplayName: "Update Jobs", Resource: "jobs", Action: "update"},
		{Name: "delete_jobs", DisplayName: "Delete Jobs", Resource: "jobs", Action: "delete"},

		// Net income per job
		{Name: "list_net_income", DisplayName: "List Net Income", Resource: "net_income", Action: "list"},
		{Name: "view_net_income", DisplayName: "View Net Income", Resource: "net_income", Action: "view"},
		{Name: "create_net_income", DisplayName: "Create Net Income", Resource: "net_income", Action: "create"},
		{Name: "update_net_income", DisplayName: "Update Net Income", Resource: "net_income", Action: "update"},
		{Name: "delete_net_income", DisplayName: "Delete Net Income", Resource: "net_income", Action: "delete"},

		// Credit & Quadrants
		{Name: "list_credit", DisplayName: "List Credit Capability", Resource: "credit", Action: "list"},
		{Name: "upsert_credit", DisplayName: "Upsert Credit Capability", Resource: "credit", Action: "upsert"},
		{Name: "list_quadrants", DisplayName: "List Quadrants", Resource: "quadrants", Action: "list"},
		{Name: "recompute_quadrants", DisplayName: "Recompute Quadrants", Resource: "quadrants", Action: "recompute"},

		// News
		{Name: "view_news", DisplayName: "View Latest News", Resource: "news", Action: "view"},
		{Name: "upsert_news_source", DisplayName: "Upsert News Source", Resource: "news", Action: "upsert_source"},
		{Name: "scrape_news", DisplayName: "Scrape News", Resource: "news", Action: "scrape"},

		// Commodities & Prices
		{Name: "upsert_commodities", DisplayName: "Upsert Commodities", Resource: "commodities", Action: "upsert"},
		{Name: "add_commodity_price", DisplayName: "Add Commodity Price", Resource: "commodities", Action: "add_price"},
		{Name: "list_prices", DisplayName: "List Latest Prices", Resource: "commodities", Action: "list_prices"},
		{Name: "scrape_prices", DisplayName: "Scrape Prices", Resource: "commodities", Action: "scrape_prices"},

		// Scrape sources
		{Name: "list_scrape_sources", DisplayName: "List Scrape Sources", Resource: "scrape_sources", Action: "list"},
		{Name: "create_scrape_source", DisplayName: "Create Scrape Source", Resource: "scrape_sources", Action: "create"},
		{Name: "update_scrape_source", DisplayName: "Update Scrape Source", Resource: "scrape_sources", Action: "update"},
		{Name: "delete_scrape_source", DisplayName: "Delete Scrape Source", Resource: "scrape_sources", Action: "delete"},
	}

	result := make(map[string]string)
	for _, p := range perms {
		var existing domainpermission.Permission
		err := db.Unscoped().Where("name = ?", p.Name).First(&existing).Error
		if err == nil {
			existing.DisplayName = p.DisplayName
			existing.Resource = p.Resource
			existing.Action = p.Action
			existing.DeletedAt = gorm.DeletedAt{}
			if err := db.Save(&existing).Error; err != nil {
				return nil, err
			}
			result[p.Name] = existing.Id
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "resource", "action", "deleted_at"}),
		}).Create(&p).Error; err != nil {
			return nil, err
		}
		if err := db.Where("name = ?", p.Name).First(&existing).Error; err != nil {
			return nil, err
		}
		result[p.Name] = existing.Id
	}
	return result, nil
}

func seedMenus(db *gorm.DB) (map[string]string, error) {
	menus := []domainmenu.MenuItem{
		{Name: "dashboard", DisplayName: "Dashboard", Path: "/dashboard", Icon: "bi-speedometer2", OrderIndex: 1},
		{Name: "orders", DisplayName: "Form Order In", Path: "/orders", Icon: "bi-journal-text", OrderIndex: 2},
		{Name: "finance", DisplayName: "Peta & Finance", Path: "/finance", Icon: "bi-geo-alt", OrderIndex: 3},
		{Name: "credit", DisplayName: "Credit Capability", Path: "/credit", Icon: "bi-credit-card", OrderIndex: 4},
		{Name: "quadrants", DisplayName: "Kuadran", Path: "/quadrants", Icon: "bi-grid", OrderIndex: 5},
		{Name: "prices", DisplayName: "Harga Pangan", Path: "/prices", Icon: "bi-cash-stack", OrderIndex: 6},
		{Name: "news", DisplayName: "Portal Berita", Path: "/news", Icon: "bi-newspaper", OrderIndex: 7},
		{Name: "jobs", DisplayName: "Nama Pekerjaan", Path: "/jobs", Icon: "bi-briefcase", OrderIndex: 8},
		{Name: "net_income", DisplayName: "Net Income", Path: "/net-income", Icon: "bi-cash-coin", OrderIndex: 9},
		{Name: "users", DisplayName: "Users", Path: "/users", Icon: "bi-people", OrderIndex: 90},
		{Name: "roles", DisplayName: "Roles & Access", Path: "/roles", Icon: "bi-shield-lock", OrderIndex: 91},
		{Name: "role_menu_access", DisplayName: "Roles Menu Access", Path: "/role-menu-access", Icon: "bi-diagram-3", OrderIndex: 92},
		{Name: "menus", DisplayName: "Menus", Path: "/menus", Icon: "bi-list-ul", OrderIndex: 93},
		{Name: "scrape_sources", DisplayName: "Scrape URL", Path: "/scrape-sources", Icon: "bi-link-45deg", OrderIndex: 94},
	}

	result := make(map[string]string)
	for _, m := range menus {
		var existing domainmenu.MenuItem
		err := db.Unscoped().Where("name = ?", m.Name).First(&existing).Error
		if err == nil {
			existing.DisplayName = m.DisplayName
			existing.Path = m.Path
			existing.Icon = m.Icon
			existing.OrderIndex = m.OrderIndex
			existing.ParentId = m.ParentId
			existing.DeletedAt = gorm.DeletedAt{}
			if err := db.Save(&existing).Error; err != nil {
				return nil, err
			}
			result[m.Name] = existing.Id
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "path", "icon", "order_index", "parent_id", "deleted_at"}),
		}).Create(&m).Error; err != nil {
			return nil, err
		}
		if err := db.Where("name = ?", m.Name).First(&existing).Error; err != nil {
			return nil, err
		}
		result[m.Name] = existing.Id
	}
	return result, nil
}

func seedRolePermissions(db *gorm.DB, roleIDs, permIDs map[string]string) error {
	assign := func(roleName string, permNames []string) error {
		roleId, ok := roleIDs[roleName]
		if !ok {
			return nil
		}
		for _, pn := range permNames {
			pid, ok := permIDs[pn]
			if !ok {
				continue
			}
			rp := domainrole.RolePermission{
				Id:           utils.CreateUUID(),
				RoleId:       roleId,
				PermissionId: pid,
			}
			if err := db.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "role_id"}, {Name: "permission_id"}},
				DoNothing: true,
			}).Create(&rp).Error; err != nil {
				return err
			}
		}
		return nil
	}

	// superadmin & admin: all permissions
	if err := assign(utils.RoleSuperAdmin, keysFromMap(permIDs)); err != nil {
		return err
	}
	if err := assign(utils.RoleAdmin, keysFromMap(permIDs)); err != nil {
		return err
	}

	// staff: list/view/create/update on non-admin resources + profile/dashboard
	staffPerms := filterPerms(permIDs, func(name string) bool {
		switch name {
		case "view_profile", "update_profile", "view_dashboard":
			return true
		}
		if strings.Contains(name, "_jobs") || strings.Contains(name, "_net_income") {
			return false
		}
		if strings.HasPrefix(name, "users") || strings.HasPrefix(name, "roles") || strings.HasPrefix(name, "permissions") {
			return false
		}
		if strings.HasPrefix(name, "list_") || strings.HasPrefix(name, "view_") || strings.HasPrefix(name, "create_") || strings.HasPrefix(name, "update_") {
			return !strings.Contains(name, "update_password")
		}
		return false
	})
	if err := assign(utils.RoleStaff, staffPerms); err != nil {
		return err
	}

	// viewer: list/view on non-admin resources + profile/dashboard
	viewerPerms := filterPerms(permIDs, func(name string) bool {
		switch name {
		case "view_profile", "view_dashboard":
			return true
		}
		if strings.Contains(name, "_jobs") || strings.Contains(name, "_net_income") {
			return false
		}
		if strings.HasPrefix(name, "users") || strings.HasPrefix(name, "roles") || strings.HasPrefix(name, "permissions") {
			return false
		}
		return strings.HasPrefix(name, "list_") || strings.HasPrefix(name, "view_")
	})
	if err := assign(utils.RoleViewer, viewerPerms); err != nil {
		return err
	}

	// main dealer: order, finance, credit/quadrants, prices, news, dashboard
	mainDealerPerms := []string{
		"view_dashboard",
		"list_orders", "view_orders", "create_orders", "update_orders",
		"list_finance_dealers", "view_finance_metrics",
		"list_jobs", "view_jobs", "create_jobs", "update_jobs", "delete_jobs",
		"list_net_income", "view_net_income", "create_net_income", "update_net_income", "delete_net_income",
		"list_credit", "list_quadrants",
		"list_prices", "view_news",
	}
	if err := assign(utils.RoleMainDealer, mainDealerPerms); err != nil {
		return err
	}

	// dealer: orders list/create/update/view, view prices/news
	dealerPerms := []string{
		"view_dashboard",
		"list_orders", "view_orders", "create_orders", "update_orders",
		"list_prices", "view_news",
	}
	return assign(utils.RoleDealer, dealerPerms)
}

func seedRoleMenus(db *gorm.DB, roleIDs, menuIDs map[string]string) error {
	assign := func(roleName string, menuNames []string) error {
		roleId, ok := roleIDs[roleName]
		if !ok {
			return nil
		}
		for _, mn := range menuNames {
			mid, ok := menuIDs[mn]
			if !ok {
				continue
			}
			rm := domainrole.RoleMenu{
				Id:         utils.CreateUUID(),
				RoleId:     roleId,
				MenuItemId: mid,
			}
			if err := db.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "role_id"}, {Name: "menu_item_id"}},
				DoNothing: true,
			}).Create(&rm).Error; err != nil {
				return err
			}
		}
		return nil
	}

	allMenus := keysFromMap(menuIDs)
	if err := assign(utils.RoleSuperAdmin, allMenus); err != nil {
		return err
	}
	// admin: semua kecuali role_menu_access (khusus superadmin)
	adminMenus := excludeMenus(allMenus, []string{"role_menu_access", "jobs", "net_income"})
	if err := assign(utils.RoleAdmin, adminMenus); err != nil {
		return err
	}

	// main dealer: dashboard, orders, finance, credit, quadrants, prices, news
	mainDealerMenus := []string{"dashboard", "orders", "finance", "credit", "quadrants", "prices", "news", "jobs", "net_income"}
	if err := assign(utils.RoleMainDealer, mainDealerMenus); err != nil {
		return err
	}

	// dealer: Form Order In saja (plus dashboard agar konsisten dengan perms view_dashboard)
	dealerMenus := []string{"dashboard", "orders"}
	if err := assign(utils.RoleDealer, dealerMenus); err != nil {
		return err
	}

	staffMenus := excludeMenus(allMenus, []string{"users", "roles", "menus", "role_menu_access", "jobs", "net_income"})
	if err := assign(utils.RoleStaff, staffMenus); err != nil {
		return err
	}

	viewerMenus := excludeMenus(allMenus, []string{"users", "roles", "menus", "role_menu_access", "jobs", "net_income"})
	return assign(utils.RoleViewer, viewerMenus)
}

func fetchProvinsiFromSipedas(ctx context.Context, thn string) (map[string]string, error) {
	url := "https://sipedas.pertanian.go.id/api/wilayah/list_pro"
	client := resty.New()

	result := map[string]string{}
	resp, err := client.R().
		SetContext(ctx).
		SetQueryParam("thn", thn).
		SetResult(&result).
		Get(url)
	if err != nil {
		return nil, err
	}
	if resp.IsError() {
		return nil, fmt.Errorf("sipedas error: status=%d body=%s", resp.StatusCode(), string(resp.Body()))
	}
	return result, nil
}

func seedProvinsiFromAPI(ctx context.Context, db *gorm.DB, thn string) error {
	data, err := fetchProvinsiFromSipedas(ctx, thn)
	if err != nil {
		return err
	}

	// urutkan berdasarkan kode numerik: 11,12,13,...,97
	codes := make([]string, 0, len(data))
	for c := range data {
		codes = append(codes, c)
	}
	sort.Slice(codes, func(i, j int) bool {
		ai, _ := strconv.Atoi(codes[i])
		aj, _ := strconv.Atoi(codes[j])
		return ai < aj
	})

	rows := make([]provinsi.Provinsi, 0, len(codes))
	for idx, code := range codes {
		name := strings.TrimSpace(data[code])
		rows = append(rows, provinsi.Provinsi{
			// Id UUID akan keisi otomatis lewat default gen_random_uuid()/BeforeCreate
			Code:        code,
			Name:        name,
			DisplayName: toTitleID(name),
			Path:        "/provinsi/" + code,
			Icon:        "",
			ParentId:    nil,
			OrderIndex:  idx + 1,
			IsActive:    true,
		})
	}

	// Upsert by unique key: code
	return db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"name", "display_name", "path", "icon", "parent_id", "order_index", "is_active",
			}),
		}).
		CreateInBatches(rows, 200).
		Error
}

// Title Case sederhana (cukup untuk seed)
func toTitleID(s string) string {
	parts := strings.Fields(strings.ToLower(s))
	for i := range parts {
		if len(parts[i]) == 0 {
			continue
		}
		parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
	}
	return strings.Join(parts, " ")
}

func keysFromMap(m map[string]string) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}

func excludeMenus(all []string, blocked []string) []string {
	out := make([]string, 0, len(all))
	for _, name := range all {
		skip := false
		for _, b := range blocked {
			if name == b {
				skip = true
				break
			}
		}
		if !skip {
			out = append(out, name)
		}
	}
	return out
}

func filterPerms(permMap map[string]string, keep func(name string) bool) []string {
	out := make([]string, 0, len(permMap))
	for name := range permMap {
		if keep(name) {
			out = append(out, name)
		}
	}
	return out
}
