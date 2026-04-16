package router

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"service-songket/infrastructure/database"
	handlercommodity "service-songket/internal/handlers/http/commodity"
	handlercredit "service-songket/internal/handlers/http/credit"
	handlerdealer "service-songket/internal/handlers/http/dealer"
	handlerfinance "service-songket/internal/handlers/http/finance"
	handlerfinancecompany "service-songket/internal/handlers/http/financecompany"
	handlerinstallment "service-songket/internal/handlers/http/installment"
	handlerjob "service-songket/internal/handlers/http/job"
	handlerlookup "service-songket/internal/handlers/http/lookup"
	handlermastersetting "service-songket/internal/handlers/http/mastersetting"
	menuHandler "service-songket/internal/handlers/http/menu"
	handlermotor "service-songket/internal/handlers/http/motor"
	handlernetincome "service-songket/internal/handlers/http/netincome"
	handlernews "service-songket/internal/handlers/http/news"
	handlerorder "service-songket/internal/handlers/http/order"
	permissionHandler "service-songket/internal/handlers/http/permission"
	handlerquadrant "service-songket/internal/handlers/http/quadrant"
	roleHandler "service-songket/internal/handlers/http/role"
	handlerscrapesource "service-songket/internal/handlers/http/scrapesource"
	sessionHandler "service-songket/internal/handlers/http/session"
	userHandler "service-songket/internal/handlers/http/user"
	"service-songket/internal/master"
	authRepo "service-songket/internal/repositories/auth"
	repositorycommodity "service-songket/internal/repositories/commodity"
	repositorycredit "service-songket/internal/repositories/credit"
	repositorydealer "service-songket/internal/repositories/dealer"
	repositoryfinancecompany "service-songket/internal/repositories/financecompany"
	repositoryinstallment "service-songket/internal/repositories/installment"
	repositoryjob "service-songket/internal/repositories/job"
	repositorylookup "service-songket/internal/repositories/lookup"
	repositorymastersetting "service-songket/internal/repositories/mastersetting"
	menuRepo "service-songket/internal/repositories/menu"
	repositorymotor "service-songket/internal/repositories/motor"
	repositorynetincome "service-songket/internal/repositories/netincome"
	repositorynews "service-songket/internal/repositories/news"
	repositoryorder "service-songket/internal/repositories/order"
	permissionRepo "service-songket/internal/repositories/permission"
	repositoryquadrant "service-songket/internal/repositories/quadrant"
	roleRepo "service-songket/internal/repositories/role"
	repositoryscrapesource "service-songket/internal/repositories/scrapesource"
	sessionRepo "service-songket/internal/repositories/session"
	userRepo "service-songket/internal/repositories/user"
	servicecommodity "service-songket/internal/services/commodity"
	servicecredit "service-songket/internal/services/credit"
	servicedealer "service-songket/internal/services/dealer"
	servicefinance "service-songket/internal/services/finance"
	servicefinancecompany "service-songket/internal/services/financecompany"
	serviceinstallment "service-songket/internal/services/installment"
	servicejob "service-songket/internal/services/job"
	servicelookup "service-songket/internal/services/lookup"
	servicemastersetting "service-songket/internal/services/mastersetting"
	menuSvc "service-songket/internal/services/menu"
	servicemotor "service-songket/internal/services/motor"
	servicenetincome "service-songket/internal/services/netincome"
	servicenews "service-songket/internal/services/news"
	serviceorder "service-songket/internal/services/order"
	permissionSvc "service-songket/internal/services/permission"
	servicequadrant "service-songket/internal/services/quadrant"
	roleSvc "service-songket/internal/services/role"
	servicescrapesource "service-songket/internal/services/scrapesource"
	sessionSvc "service-songket/internal/services/session"
	userSvc "service-songket/internal/services/user"
	"service-songket/middlewares"
	"service-songket/pkg/logger"
	"service-songket/pkg/security"
	"service-songket/utils"
)

type Routes struct {
	App *gin.Engine
	DB  *gorm.DB
}

func NewRoutes() *Routes {
	gin.SetMode(gin.ReleaseMode)
	app := gin.Default()

	app.Use(middlewares.CORS())
	app.Use(gin.CustomRecovery(middlewares.ErrorHandler))
	app.Use(middlewares.SetContextId())
	app.Use(middlewares.RequestLogger())

	app.GET("/healthcheck", func(ctx *gin.Context) {
		logger.WriteLogWithContext(ctx, logger.LogLevelDebug, "ClientIP: "+ctx.ClientIP())
		ctx.JSON(http.StatusOK, gin.H{
			"message": "OK!!",
		})
	})

	// Swagger (serves existing docs/swagger.yaml and a lightweight UI)
	app.StaticFile("/swagger.yaml", "docs/swagger.yaml")
	app.GET("/swagger", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, swaggerHTML)
	})

	return &Routes{
		App: app,
	}
}

func (r *Routes) UserRoutes() {
	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	repo := userRepo.NewUserRepo(r.DB)
	rRepo := roleRepo.NewRoleRepo(r.DB)
	pRepo := permissionRepo.NewPermissionRepo(r.DB)
	uc := userSvc.NewUserService(repo, blacklistRepo, rRepo, pRepo)

	// Setup login limiter if Redis is available
	redisClient := database.GetRedisClient()
	var loginLimiter security.LoginLimiter
	if redisClient != nil {
		loginLimiter = security.NewRedisLoginLimiter(
			redisClient,
			utils.GetEnv("LOGIN_ATTEMPT_LIMIT", 5).(int),
			time.Duration(utils.GetEnv("LOGIN_ATTEMPT_WINDOW_SECONDS", 60).(int))*time.Second,
			time.Duration(utils.GetEnv("LOGIN_BLOCK_DURATION_SECONDS", 300).(int))*time.Second,
		)
	}

	h := userHandler.NewUserHandler(uc, loginLimiter)
	mdw := middlewares.NewMiddleware(blacklistRepo, pRepo)

	// Setup register rate limiter
	registerLimit := utils.GetEnv("REGISTER_RATE_LIMIT", 5).(int)
	registerWindowSeconds := utils.GetEnv("REGISTER_RATE_WINDOW_SECONDS", 60).(int)
	if registerWindowSeconds <= 0 {
		registerWindowSeconds = 60
	}
	registerLimiter := middlewares.IPRateLimitMiddleware(
		redisClient,
		"user_register",
		registerLimit,
		time.Duration(registerWindowSeconds)*time.Second,
	)

	user := r.App.Group("/api/user")
	{
		user.POST("/register", registerLimiter, h.Register)
		user.POST("/login", h.Login)
		user.POST("/forgot-password", h.ForgotPassword)
		user.POST("/reset-password", h.ResetPassword)

		userPriv := user.Group("").Use(mdw.AuthMiddleware())
		{
			userPriv.POST("/logout", h.Logout)
			userPriv.GET("", h.GetUserByAuth)
			userPriv.GET("/:id", mdw.PermissionMiddleware("users", "view"), h.GetUserById)
			userPriv.PUT("", h.Update)
			userPriv.PUT("/:id", mdw.PermissionMiddleware("users", "update"), h.UpdateUserById)
			userPriv.PUT("/change/password", h.ChangePassword)
			userPriv.DELETE("", h.Delete)
			userPriv.DELETE("/:id", mdw.PermissionMiddleware("users", "delete"), h.DeleteUserById)

			// Admin create user endpoint (with role selection)
			userPriv.POST("", mdw.PermissionMiddleware("users", "create"), h.AdminCreateUser)
		}
	}

	r.App.GET("/api/users", mdw.AuthMiddleware(), mdw.PermissionMiddleware("users", "list"), h.GetAllUsers)
}

func (r *Routes) RoleRoutes() {
	repoRole := roleRepo.NewRoleRepo(r.DB)
	repoPermission := permissionRepo.NewPermissionRepo(r.DB)
	repoMenu := menuRepo.NewMenuRepo(r.DB)
	svc := roleSvc.NewRoleService(repoRole, repoPermission, repoMenu)
	h := roleHandler.NewRoleHandler(svc)
	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	mdw := middlewares.NewMiddleware(blacklistRepo, repoPermission)

	// List endpoints
	r.App.GET("/api/roles", mdw.AuthMiddleware(), mdw.PermissionMiddleware("roles", "list"), h.GetAll)

	// CRUD endpoints
	role := r.App.Group("/api/role").Use(mdw.AuthMiddleware())
	{
		role.POST("", mdw.PermissionMiddleware("roles", "create"), h.Create)
		role.GET("/:id", mdw.PermissionMiddleware("roles", "view"), h.GetByID)
		role.PUT("/:id", mdw.PermissionMiddleware("roles", "update"), h.Update)
		role.DELETE("/:id", mdw.PermissionMiddleware("roles", "delete"), h.Delete)

		// Permission and menu assignment
		role.POST("/:id/permissions", mdw.RoleMiddleware(utils.RoleSuperAdmin), mdw.PermissionMiddleware("roles", "assign_permissions"), h.AssignPermissions)
		role.POST("/:id/menus", mdw.RoleMiddleware(utils.RoleSuperAdmin), mdw.PermissionMiddleware("roles", "assign_menus"), h.AssignMenus)
	}
}

func (r *Routes) PermissionRoutes() {
	repo := permissionRepo.NewPermissionRepo(r.DB)
	svc := permissionSvc.NewPermissionService(repo)
	h := permissionHandler.NewPermissionHandler(svc)
	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	mdw := middlewares.NewMiddleware(blacklistRepo, repo)

	// List endpoints
	r.App.GET("/api/permissions", mdw.AuthMiddleware(), mdw.PermissionMiddleware("permissions", "list"), h.GetAll)

	// Get current user's permissions
	r.App.GET("/api/permissions/me", mdw.AuthMiddleware(), h.GetUserPermissions)
	// Manage user-specific permissions (superadmin only)
	r.App.GET("/api/user/:id/permissions", mdw.AuthMiddleware(), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.GetUserPermissionsByAdmin)
	r.App.POST("/api/user/:id/permissions", mdw.AuthMiddleware(), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.SetUserPermissions)

	// CRUD endpoints
	permission := r.App.Group("/api/permission").Use(mdw.AuthMiddleware(), mdw.RoleMiddleware(utils.RoleSuperAdmin))
	{
		permission.POST("", mdw.PermissionMiddleware("permissions", "create"), h.Create)
		permission.GET("/:id", mdw.PermissionMiddleware("permissions", "view"), h.GetByID)
		permission.PUT("/:id", mdw.PermissionMiddleware("permissions", "update"), h.Update)
		permission.DELETE("/:id", mdw.PermissionMiddleware("permissions", "delete"), h.Delete)
	}
}

// MasterRoutes serves master data (wilayah) from Sipedas.
func (r *Routes) MasterRoutes() {
	svc := master.NewWilayahService(r.DB)
	h := master.NewHandler(svc)

	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	pRepo := permissionRepo.NewPermissionRepo(r.DB)
	mdw := middlewares.NewMiddleware(blacklistRepo, pRepo)

	g := r.App.Group("/api/master").Use(mdw.AuthMiddleware())
	{
		g.GET("/provinsi", h.GetProvinsi)
		g.GET("/kabupaten", h.GetKabupaten)
		g.GET("/kecamatan", h.GetKecamatan)
	}
}

func (r *Routes) MenuRoutes() {
	repo := menuRepo.NewMenuRepo(r.DB)
	svc := menuSvc.NewMenuService(repo)
	h := menuHandler.NewMenuHandler(svc)
	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	pRepo := permissionRepo.NewPermissionRepo(r.DB)
	mdw := middlewares.NewMiddleware(blacklistRepo, pRepo)

	// Public endpoints for authenticated users
	r.App.GET("/api/menus/active", mdw.AuthMiddleware(), h.GetActiveMenus)
	r.App.GET("/api/menus/me", mdw.AuthMiddleware(), h.GetUserMenus)

	// List endpoints
	r.App.GET("/api/menus", mdw.AuthMiddleware(), mdw.PermissionMiddleware("menus", "list"), h.GetAll)

	// CRUD endpoints
	menu := r.App.Group("/api/menu").Use(mdw.AuthMiddleware())
	{
		menu.POST("", mdw.PermissionMiddleware("menus", "create"), h.Create)
		menu.GET("/:id", mdw.PermissionMiddleware("menus", "view"), h.GetByID)
		menu.PUT("/:id", mdw.PermissionMiddleware("menus", "update"), h.Update)
		menu.DELETE("/:id", mdw.PermissionMiddleware("menus", "delete"), h.Delete)
	}
}

func (r *Routes) SessionRoutes() {
	redisClient := database.GetRedisClient()
	if redisClient == nil {
		logger.WriteLog(logger.LogLevelDebug, "Redis not available, session routes will not be registered")
		return
	}

	repo := sessionRepo.NewSessionRepository(redisClient)
	svc := sessionSvc.NewSessionService(repo)
	h := sessionHandler.NewSessionHandler(svc)
	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	pRepo := permissionRepo.NewPermissionRepo(r.DB)
	mdw := middlewares.NewMiddleware(blacklistRepo, pRepo)

	// Session management endpoints (authenticated users only)
	sessionGroup := r.App.Group("/api/user").Use(mdw.AuthMiddleware())
	{
		sessionGroup.GET("/sessions", h.GetActiveSessions)
		sessionGroup.DELETE("/session/:session_id", h.RevokeSession)
		sessionGroup.POST("/sessions/revoke-others", h.RevokeAllOtherSessions)
	}

	logger.WriteLog(logger.LogLevelInfo, "Session management routes registered")
}

// SongketRoutes registers business endpoints for SONGKET.
func (r *Routes) SongketRoutes() {
	dealerRepo := repositorydealer.NewDealerRepo(r.DB)
	financeCompanyRepo := repositoryfinancecompany.NewFinanceCompanyRepo(r.DB)
	motorRepo := repositorymotor.NewMotorRepo(r.DB)
	installmentRepo := repositoryinstallment.NewInstallmentRepo(r.DB)
	jobRepo := repositoryjob.NewJobRepo(r.DB)
	netIncomeRepo := repositorynetincome.NewNetIncomeRepo(r.DB)
	orderRepo := repositoryorder.NewOrderRepo(r.DB)
	newsRepo := repositorynews.NewNewsRepo(r.DB)
	commodityRepo := repositorycommodity.NewCommodityRepo(r.DB)
	masterSettingRepo := repositorymastersetting.NewMasterSettingRepo(r.DB)
	creditRepo := repositorycredit.NewCreditRepo(r.DB)
	quadrantRepo := repositoryquadrant.NewQuadrantRepo(r.DB)
	lookupRepo := repositorylookup.NewLookupRepo(r.DB)
	scrapeSourceRepo := repositoryscrapesource.NewScrapeSourceRepo(r.DB)
	orderHandler := handlerorder.NewOrderHandler(serviceorder.NewOrderService(orderRepo, dealerRepo, motorRepo, r.DB))
	dealerHandler := handlerdealer.NewDealerHandler(servicedealer.NewDealerService(dealerRepo))
	financeCompanyHandler := handlerfinancecompany.NewFinanceCompanyHandler(servicefinancecompany.NewFinanceCompanyService(financeCompanyRepo))
	financeHandler := handlerfinance.NewFinanceHandler(servicefinance.NewFinanceService(r.DB))
	motorHandler := handlermotor.NewMotorHandler(servicemotor.NewMotorService(motorRepo))
	installmentHandler := handlerinstallment.NewInstallmentHandler(serviceinstallment.NewInstallmentService(installmentRepo, motorRepo))
	jobHandler := handlerjob.NewJobHandler(servicejob.NewJobService(jobRepo))
	lookupHandler := handlerlookup.NewLookupHandler(servicelookup.NewLookupService(lookupRepo, r.DB))
	netIncomeHandler := handlernetincome.NewNetIncomeHandler(servicenetincome.NewNetIncomeService(netIncomeRepo, jobRepo))
	newsHandler := handlernews.NewNewsHandler(servicenews.NewNewsService(newsRepo))
	commodityHandler := handlercommodity.NewCommodityHandler(servicecommodity.NewCommodityService(commodityRepo))
	masterSettingHandler := handlermastersetting.NewMasterSettingHandler(servicemastersetting.NewMasterSettingService(masterSettingRepo))
	creditService := servicecredit.NewCreditService(creditRepo, jobRepo)
	creditHandler := handlercredit.NewCreditHandler(creditService)
	quadrantHandler := handlerquadrant.NewQuadrantHandler(servicequadrant.NewQuadrantService(quadrantRepo, creditService))
	scrapeSourceHandler := handlerscrapesource.NewScrapeSourceHandler(servicescrapesource.NewScrapeSourceService(scrapeSourceRepo))

	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	pRepo := permissionRepo.NewPermissionRepo(r.DB)
	mRepo := menuRepo.NewMenuRepo(r.DB)
	mdw := middlewares.NewMiddleware(blacklistRepo, pRepo, mRepo)
	menuAccess := func(paths ...string) gin.HandlerFunc {
		return mdw.MenuAccessMiddleware(paths...)
	}

	g := r.App.Group("/api/songket").Use(mdw.AuthMiddleware())

	// Orders
	g.GET("/dashboard/orders", orderHandler.DashboardOrders)
	g.GET("/dashboard/summary", orderHandler.DashboardSummary)
	g.POST("/orders", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "create"), orderHandler.Create)
	g.GET("/orders", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "list"), orderHandler.GetAll)
	g.POST("/orders/export", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "list"), orderHandler.StartExport)
	g.GET("/orders/export/:id/status", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "list"), orderHandler.GetExportStatus)
	g.GET("/orders/export/:id/download", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "list"), orderHandler.DownloadExport)
	g.PUT("/orders/:id", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "update"), orderHandler.Update)
	g.DELETE("/orders/:id", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "delete"), orderHandler.Delete)

	// Motor types
	g.GET("/motor-types", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "list"), motorHandler.GetAll)
	g.GET("/motor-types/:id", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "view"), motorHandler.GetByID)
	g.POST("/motor-types", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "create"), motorHandler.Create)
	g.PUT("/motor-types/:id", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "update"), motorHandler.Update)
	g.DELETE("/motor-types/:id", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "delete"), motorHandler.Delete)

	// Installments
	g.GET("/installments", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "list"), installmentHandler.GetAll)
	g.GET("/installments/:id", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "view"), installmentHandler.GetByID)
	g.POST("/installments", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "create"), installmentHandler.Create)
	g.PUT("/installments/:id", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "update"), installmentHandler.Update)
	g.DELETE("/installments/:id", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "delete"), installmentHandler.Delete)

	// Master settings (superadmin only)
	g.POST("/master-settings/news-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.CreateNewsScrapeCronSetting)
	g.GET("/master-settings/news-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.GetNewsScrapeCronSetting)
	g.GET("/master-settings/news-scrape-cron/history", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.GetNewsScrapeCronSettingHistory)
	g.PUT("/master-settings/news-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.UpdateNewsScrapeCronSetting)
	g.DELETE("/master-settings/news-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.DeleteNewsScrapeCronSetting)
	g.POST("/master-settings/prices-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.CreatePriceScrapeCronSetting)
	g.GET("/master-settings/prices-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.GetPriceScrapeCronSetting)
	g.GET("/master-settings/prices-scrape-cron/history", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.GetPriceScrapeCronSettingHistory)
	g.PUT("/master-settings/prices-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.UpdatePriceScrapeCronSetting)
	g.DELETE("/master-settings/prices-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), masterSettingHandler.DeletePriceScrapeCronSetting)

	// Finance performance
	g.GET("/finance/dealers", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), dealerHandler.GetAll)
	g.GET("/finance/companies", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), financeCompanyHandler.GetAll)
	g.GET("/finance/report/migrations", menuAccess("/business", "/finance", "/dealer", "/finance-report"), mdw.PermissionMiddleware("finance", "list_dealers"), financeHandler.FinanceMigrationReport)
	g.GET("/finance/report/migrations/:id/order-ins", menuAccess("/business", "/finance", "/dealer", "/finance-report"), mdw.PermissionMiddleware("finance", "list_dealers"), financeHandler.FinanceMigrationOrderInDetail)
	g.GET("/finance/dealers/:id/metrics", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "view_metrics"), financeHandler.DealerMetrics)
	g.POST("/finance/dealers", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), dealerHandler.Create)
	g.PUT("/finance/dealers/:id", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), dealerHandler.Update)
	g.DELETE("/finance/dealers/:id", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), dealerHandler.Delete)
	g.POST("/finance/companies", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), financeCompanyHandler.Create)
	g.PUT("/finance/companies/:id", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), financeCompanyHandler.Update)
	g.DELETE("/finance/companies/:id", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), financeCompanyHandler.Delete)

	// Jobs + Net Income
	g.GET("/jobs", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "list"), jobHandler.GetAll)
	g.GET("/jobs/:id", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "view"), jobHandler.GetByID)
	g.POST("/jobs", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "create"), jobHandler.Create)
	g.PUT("/jobs/:id", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "update"), jobHandler.Update)
	g.DELETE("/jobs/:id", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "delete"), jobHandler.Delete)

	g.GET("/net-income", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "list"), netIncomeHandler.GetAll)
	g.GET("/net-income/:id", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "view"), netIncomeHandler.GetByID)
	g.POST("/net-income", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "create"), netIncomeHandler.Create)
	g.PUT("/net-income/:id", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "update"), netIncomeHandler.Update)
	g.DELETE("/net-income/:id", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "delete"), netIncomeHandler.Delete)

	// Credit capability & quadrants
	g.POST("/credit", menuAccess("/credit"), mdw.PermissionMiddleware("credit", "upsert"), creditHandler.Upsert)
	g.GET("/credit", menuAccess("/credit"), mdw.PermissionMiddleware("credit", "list"), creditHandler.GetAll)
	g.GET("/credit/worksheet", menuAccess("/credit"), mdw.PermissionMiddleware("credit", "list"), creditHandler.Worksheet)
	g.GET("/credit/summary", menuAccess("/credit"), mdw.PermissionMiddleware("credit", "list"), creditHandler.Summary)
	g.POST("/quadrants/recompute", menuAccess("/quadrants"), mdw.PermissionMiddleware("quadrants", "recompute"), quadrantHandler.Recompute)
	g.GET("/quadrants", menuAccess("/quadrants"), mdw.PermissionMiddleware("quadrants", "list"), quadrantHandler.GetAll)
	g.GET("/quadrants/summary", menuAccess("/quadrants"), mdw.PermissionMiddleware("quadrants", "list"), quadrantHandler.Summary)

	// News
	g.GET("/dashboard/news-items", newsHandler.DashboardItems)
	g.POST("/news/sources", menuAccess("/news"), mdw.PermissionMiddleware("news", "upsert_source"), newsHandler.UpsertSource)
	g.GET("/news/sources", menuAccess("/news"), mdw.PermissionMiddleware("news", "upsert_source"), newsHandler.ListSources)
	g.POST("/news/scrape", menuAccess("/news"), mdw.PermissionMiddleware("news", "scrape"), newsHandler.Scrape)
	g.POST("/news/import", menuAccess("/news"), mdw.PermissionMiddleware("news", "scrape"), newsHandler.Import)
	g.GET("/news/latest", menuAccess("/news"), mdw.PermissionMiddleware("news", "view"), newsHandler.Latest)
	g.GET("/news/items", menuAccess("/news"), mdw.PermissionMiddleware("news", "view"), newsHandler.ListItems)
	g.DELETE("/news/items/:id", menuAccess("/news"), mdw.PermissionMiddleware("news", "scrape"), newsHandler.DeleteItem)

	// Commodity prices
	g.GET("/dashboard/prices", commodityHandler.DashboardPrices)
	g.POST("/commodities", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "upsert"), commodityHandler.Upsert)
	g.POST("/commodities/price", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "add_price"), commodityHandler.AddPrice)
	g.GET("/commodities/prices/latest", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "list_prices"), commodityHandler.LatestPrices)
	g.GET("/commodities", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "list_prices"), commodityHandler.ListCommodities)
	g.GET("/commodities/prices", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "list_prices"), commodityHandler.ListPrices)
	g.DELETE("/commodities/prices/:id", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), commodityHandler.DeletePrice)
	g.POST("/commodities/prices/scrape", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), commodityHandler.ScrapePrices)
	g.POST("/commodities/prices/scrape-jobs", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), commodityHandler.CreateScrapeJob)
	g.GET("/commodities/prices/jobs", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), commodityHandler.ListScrapeJobs)
	g.GET("/commodities/prices/jobs/:id/results", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), commodityHandler.ListScrapeResults)
	g.POST("/commodities/prices/jobs/:id/commit", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "add_price"), commodityHandler.CommitScrapeResults)
	g.GET("/lookups", menuAccess("/orders", "/business", "/finance", "/dealer", "/credit", "/quadrants", "/prices", "/news", "/jobs", "/net-income", "/scrape-sources", "/motor-types", "/installments", "/master-settings"), lookupHandler.GetAll)
	g.GET("/scrape-sources", menuAccess("/scrape-sources"), mdw.PermissionMiddleware("scrape_sources", "list"), scrapeSourceHandler.GetAll)
	g.POST("/scrape-sources", menuAccess("/scrape-sources"), mdw.PermissionMiddleware("scrape_sources", "create"), scrapeSourceHandler.Create)
	g.PUT("/scrape-sources/:id", menuAccess("/scrape-sources"), mdw.PermissionMiddleware("scrape_sources", "update"), scrapeSourceHandler.Update)
	g.DELETE("/scrape-sources/:id", menuAccess("/scrape-sources"), mdw.PermissionMiddleware("scrape_sources", "delete"), scrapeSourceHandler.Delete)

	logger.WriteLog(logger.LogLevelInfo, "Songket routes registered")
}

// Minimal Swagger UI that pulls swagger.yaml from the same server.
const swaggerHTML = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SONGKET API Docs</title>
  <style>
    body { margin:0; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    #fallback { padding:16px; display:none; }
  </style>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" onerror="document.getElementById('fallback').style.display='block'">
</head>
<body>
  <div id="swagger-ui"></div>
  <div id="fallback">
    <h3>Swagger UI gagal dimuat</h3>
    <p>CDN <code>unpkg.com</code> diblok/putus. Ambil spesifikasi mentah di <a href="/swagger.yaml">/swagger.yaml</a> atau jalankan swagger-ui lokal.</p>
  </div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" onerror="document.getElementById('fallback').style.display='block'"></script>
  <script>
    window.onload = () => {
      try {
        SwaggerUIBundle({
          url: '/swagger.yaml',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis],
        });
      } catch(e) {
        document.getElementById('fallback').style.display='block';
      }
    };
  </script>
</body>
</html>`
