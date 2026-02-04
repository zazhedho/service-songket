package database

import (
	"strings"

	domainauth "starter-kit/internal/domain/auth"
	domainmenu "starter-kit/internal/domain/menu"
	domainpermission "starter-kit/internal/domain/permission"
	domainrole "starter-kit/internal/domain/role"
	domainuser "starter-kit/internal/domain/user"
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

	// Migrate core auth/RBAC + SONGKET domain tables.
	models := []interface{}{
		// Auth & RBAC
		&domainauth.Blacklist{},
		&domainuser.Users{},
		&domainrole.Role{},
		&domainpermission.Permission{},
		&domainmenu.MenuItem{},
		&domainrole.RolePermission{},
		&domainrole.RoleMenu{},

		// SONGKET domain
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
		&songket.ScrapeSource{},
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

func seedRoles(db *gorm.DB) (map[string]string, error) {
	roles := []domainrole.Role{
		{Id: utils.CreateUUID(), Name: utils.RoleSuperAdmin, DisplayName: "Superadmin", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleAdmin, DisplayName: "Admin", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleStaff, DisplayName: "Staff", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleViewer, DisplayName: "Viewer", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleMainDealer, DisplayName: "Main Dealer", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleDealer, DisplayName: "Dealer", IsSystem: true},
		{Id: utils.CreateUUID(), Name: utils.RoleMember, DisplayName: "Member", IsSystem: false},
	}

	result := make(map[string]string)
	for _, r := range roles {
		if err := db.Where("name = ?", r.Name).FirstOrCreate(&r).Error; err != nil {
			return nil, err
		}
		result[r.Name] = r.Id
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
	}

	result := make(map[string]string)
	for _, p := range perms {
		if err := db.Where("name = ?", p.Name).FirstOrCreate(&p).Error; err != nil {
			return nil, err
		}
		result[p.Name] = p.Id
	}
	return result, nil
}

func seedMenus(db *gorm.DB) (map[string]string, error) {
	menus := []domainmenu.MenuItem{
		{Name: "dashboard", DisplayName: "Dashboard", Path: "/dashboard", Icon: "bi-speedometer2", OrderIndex: 1},
		{Name: "profile", DisplayName: "Profile", Path: "/profile", Icon: "bi-person-circle", OrderIndex: 2},
		{Name: "users", DisplayName: "Users", Path: "/users", Icon: "bi-people", OrderIndex: 900},
		{Name: "roles", DisplayName: "Roles", Path: "/roles", Icon: "bi-shield-lock", OrderIndex: 901},
		{Name: "menus", DisplayName: "Menus", Path: "/menus", Icon: "bi-list-ul", OrderIndex: 902},
	}

	result := make(map[string]string)
	for _, m := range menus {
		if err := db.Where("name = ?", m.Name).FirstOrCreate(&m).Error; err != nil {
			return nil, err
		}
		result[m.Name] = m.Id
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
			if err := db.Where("role_id = ? AND permission_id = ?", roleId, pid).FirstOrCreate(&rp).Error; err != nil {
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
		if strings.HasPrefix(name, "users") || strings.HasPrefix(name, "roles") || strings.HasPrefix(name, "permissions") {
			return false
		}
		return strings.HasPrefix(name, "list_") || strings.HasPrefix(name, "view_")
	})
	return assign(utils.RoleViewer, viewerPerms)
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
			if err := db.Where("role_id = ? AND menu_item_id = ?", roleId, mid).FirstOrCreate(&rm).Error; err != nil {
				return err
			}
		}
		return nil
	}

	allMenus := keysFromMap(menuIDs)
	if err := assign(utils.RoleSuperAdmin, allMenus); err != nil {
		return err
	}
	if err := assign(utils.RoleAdmin, allMenus); err != nil {
		return err
	}

	staffMenus := excludeMenus(allMenus, []string{"users", "roles", "menus"})
	if err := assign(utils.RoleStaff, staffMenus); err != nil {
		return err
	}

	viewerMenus := excludeMenus(allMenus, []string{"users", "roles", "menus"})
	return assign(utils.RoleViewer, viewerMenus)
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
