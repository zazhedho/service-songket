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
	handlerlocation "service-songket/internal/handlers/http/location"
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
	authRepo "service-songket/internal/repositories/auth"
	repositorycommodity "service-songket/internal/repositories/commodity"
	repositorycredit "service-songket/internal/repositories/credit"
	repositorydealer "service-songket/internal/repositories/dealer"
	repositoryfinance "service-songket/internal/repositories/finance"
	repositoryfinancecompany "service-songket/internal/repositories/financecompany"
	repositoryinstallment "service-songket/internal/repositories/installment"
	repositoryjob "service-songket/internal/repositories/job"
	repositorylocation "service-songket/internal/repositories/location"
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
	servicelocation "service-songket/internal/services/location"
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
			userPriv.PUT("/:id", mdw.PermissionMiddleware("users", "assign_role"), h.UpdateUserById)
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

		// Permission assignment
		role.POST("/:id/permissions", mdw.PermissionMiddleware("roles", "assign_permissions"), h.AssignPermissions)
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
	r.App.GET("/api/user/:id/permissions", mdw.AuthMiddleware(), mdw.PermissionMiddleware("users", "view_permissions"), h.GetUserPermissionsByAdmin)
	r.App.POST("/api/user/:id/permissions", mdw.AuthMiddleware(), mdw.PermissionMiddleware("users", "assign_permissions"), h.SetUserPermissions)

	// CRUD endpoints
	permission := r.App.Group("/api/permission").Use(mdw.AuthMiddleware())
	{
		permission.POST("", mdw.PermissionMiddleware("permissions", "create"), h.Create)
		permission.GET("/:id", mdw.PermissionMiddleware("permissions", "view"), h.GetByID)
		permission.PUT("/:id", mdw.PermissionMiddleware("permissions", "update"), h.Update)
		permission.DELETE("/:id", mdw.PermissionMiddleware("permissions", "delete"), h.Delete)
	}
}

// LocationRoutes serves location data from Sipedas-backed cache.
func (r *Routes) LocationRoutes() {
	repo := repositorylocation.NewLocationRepo(r.DB)
	svc := servicelocation.NewLocationService(repo)
	h := handlerlocation.NewLocationHandler(svc)

	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	pRepo := permissionRepo.NewPermissionRepo(r.DB)
	mdw := middlewares.NewMiddleware(blacklistRepo, pRepo)

	location := r.App.Group("/api/location").Use(mdw.AuthMiddleware())
	{
		location.GET("/province", h.GetProvince)
		location.GET("/city", h.GetCity)
		location.GET("/district", h.GetDistrict)
	}
}

func (r *Routes) MenuRoutes() {
	repo := menuRepo.NewMenuRepo(r.DB)
	pRepo := permissionRepo.NewPermissionRepo(r.DB)
	svc := menuSvc.NewMenuService(repo, pRepo)
	h := menuHandler.NewMenuHandler(svc)
	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	mdw := middlewares.NewMiddleware(blacklistRepo, pRepo)

	// Public endpoints for authenticated users
	r.App.GET("/api/menus/active", mdw.AuthMiddleware(), h.GetActiveMenus)
	r.App.GET("/api/menus/me", mdw.AuthMiddleware(), h.GetUserMenus)

	// List endpoints
	r.App.GET("/api/menus", mdw.AuthMiddleware(), mdw.PermissionMiddleware("menus", "list"), h.GetAll)

	// CRUD endpoints
	menu := r.App.Group("/api/menu").Use(mdw.AuthMiddleware())
	{
		menu.GET("/:id", mdw.PermissionMiddleware("menus", "view"), h.GetByID)
		menu.PUT("/:id", mdw.PermissionMiddleware("menus", "update"), h.Update)
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

func (r *Routes) newProtectedMiddleware() *middlewares.Middleware {
	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	pRepo := permissionRepo.NewPermissionRepo(r.DB)
	return middlewares.NewMiddleware(blacklistRepo, pRepo)
}

func (r *Routes) OrderRoutes() {
	orderRepo := repositoryorder.NewOrderRepo(r.DB)
	dealerRepo := repositorydealer.NewDealerRepo(r.DB)
	locationRepo := repositorylocation.NewLocationRepo(r.DB)
	motorRepo := repositorymotor.NewMotorRepo(r.DB)
	orderHandler := handlerorder.NewOrderHandler(serviceorder.NewOrderService(orderRepo, dealerRepo, locationRepo, motorRepo))

	mdw := r.newProtectedMiddleware()

	r.App.GET("/api/orders", mdw.AuthMiddleware(), mdw.PermissionMiddleware("orders", "list"), orderHandler.GetAll)

	dashboard := r.App.Group("/api/dashboard").Use(mdw.AuthMiddleware(), mdw.PermissionMiddleware("dashboard", "view"))
	{
		dashboard.GET("/orders", orderHandler.DashboardOrders)
		dashboard.GET("/summary", orderHandler.DashboardSummary)
	}

	order := r.App.Group("/api/order").Use(mdw.AuthMiddleware())
	{
		order.POST("", mdw.PermissionMiddleware("orders", "create"), orderHandler.Create)
		order.POST("/export", mdw.PermissionMiddleware("orders", "list"), orderHandler.StartExport)
		order.GET("/export/:id/status", mdw.PermissionMiddleware("orders", "list"), orderHandler.GetExportStatus)
		order.GET("/export/:id/download", mdw.PermissionMiddleware("orders", "list"), orderHandler.DownloadExport)
		order.PUT("/:id", mdw.PermissionMiddleware("orders", "update"), orderHandler.Update)
		order.DELETE("/:id", mdw.PermissionMiddleware("orders", "delete"), orderHandler.Delete)
	}
}

func (r *Routes) MotorRoutes() {
	motorRepo := repositorymotor.NewMotorRepo(r.DB)
	motorHandler := handlermotor.NewMotorHandler(servicemotor.NewMotorService(motorRepo))

	mdw := r.newProtectedMiddleware()

	r.App.GET("/api/motor-types", mdw.AuthMiddleware(), mdw.PermissionMiddleware("motor_types", "list"), motorHandler.GetAll)

	motor := r.App.Group("/api/motor-type").Use(mdw.AuthMiddleware())
	{
		motor.GET("/:id", mdw.PermissionMiddleware("motor_types", "view"), motorHandler.GetByID)
		motor.POST("", mdw.PermissionMiddleware("motor_types", "create"), motorHandler.Create)
		motor.PUT("/:id", mdw.PermissionMiddleware("motor_types", "update"), motorHandler.Update)
		motor.DELETE("/:id", mdw.PermissionMiddleware("motor_types", "delete"), motorHandler.Delete)
	}
}

func (r *Routes) InstallmentRoutes() {
	installmentRepo := repositoryinstallment.NewInstallmentRepo(r.DB)
	motorRepo := repositorymotor.NewMotorRepo(r.DB)
	installmentHandler := handlerinstallment.NewInstallmentHandler(serviceinstallment.NewInstallmentService(installmentRepo, motorRepo))

	mdw := r.newProtectedMiddleware()

	r.App.GET("/api/installments", mdw.AuthMiddleware(), mdw.PermissionMiddleware("installments", "list"), installmentHandler.GetAll)

	installment := r.App.Group("/api/installment").Use(mdw.AuthMiddleware())
	{
		installment.GET("/:id", mdw.PermissionMiddleware("installments", "view"), installmentHandler.GetByID)
		installment.POST("", mdw.PermissionMiddleware("installments", "create"), installmentHandler.Create)
		installment.PUT("/:id", mdw.PermissionMiddleware("installments", "update"), installmentHandler.Update)
		installment.DELETE("/:id", mdw.PermissionMiddleware("installments", "delete"), installmentHandler.Delete)
	}
}

func (r *Routes) MasterSettingRoutes() {
	masterSettingRepo := repositorymastersetting.NewMasterSettingRepo(r.DB)
	masterSettingHandler := handlermastersetting.NewMasterSettingHandler(servicemastersetting.NewMasterSettingService(masterSettingRepo))

	mdw := r.newProtectedMiddleware()

	masterSetting := r.App.Group("/api/master-setting").Use(mdw.AuthMiddleware())
	{
		masterSetting.POST("/news-scrape-cron", mdw.PermissionMiddleware("master_settings", "create"), masterSettingHandler.CreateNewsScrapeCronSetting)
		masterSetting.GET("/news-scrape-cron", mdw.PermissionMiddleware("master_settings", "view"), masterSettingHandler.GetNewsScrapeCronSetting)
		masterSetting.GET("/news-scrape-cron/history", mdw.PermissionMiddleware("master_settings", "view"), masterSettingHandler.GetNewsScrapeCronSettingHistory)
		masterSetting.PUT("/news-scrape-cron", mdw.PermissionMiddleware("master_settings", "update"), masterSettingHandler.UpdateNewsScrapeCronSetting)
		masterSetting.DELETE("/news-scrape-cron", mdw.PermissionMiddleware("master_settings", "delete"), masterSettingHandler.DeleteNewsScrapeCronSetting)
		masterSetting.POST("/prices-scrape-cron", mdw.PermissionMiddleware("master_settings", "create"), masterSettingHandler.CreatePriceScrapeCronSetting)
		masterSetting.GET("/prices-scrape-cron", mdw.PermissionMiddleware("master_settings", "view"), masterSettingHandler.GetPriceScrapeCronSetting)
		masterSetting.GET("/prices-scrape-cron/history", mdw.PermissionMiddleware("master_settings", "view"), masterSettingHandler.GetPriceScrapeCronSettingHistory)
		masterSetting.PUT("/prices-scrape-cron", mdw.PermissionMiddleware("master_settings", "update"), masterSettingHandler.UpdatePriceScrapeCronSetting)
		masterSetting.DELETE("/prices-scrape-cron", mdw.PermissionMiddleware("master_settings", "delete"), masterSettingHandler.DeletePriceScrapeCronSetting)
	}
}

func (r *Routes) FinanceRoutes() {
	dealerRepo := repositorydealer.NewDealerRepo(r.DB)
	financeRepo := repositoryfinance.NewFinanceRepo(r.DB)
	financeCompanyRepo := repositoryfinancecompany.NewFinanceCompanyRepo(r.DB)
	dealerHandler := handlerdealer.NewDealerHandler(servicedealer.NewDealerService(dealerRepo))
	financeCompanyHandler := handlerfinancecompany.NewFinanceCompanyHandler(servicefinancecompany.NewFinanceCompanyService(financeCompanyRepo))
	financeHandler := handlerfinance.NewFinanceHandler(servicefinance.NewFinanceService(financeRepo))

	mdw := r.newProtectedMiddleware()

	finance := r.App.Group("/api/finance").Use(mdw.AuthMiddleware())
	{
		finance.GET("/dealers", mdw.PermissionMiddleware("business", "list"), dealerHandler.GetAll)
		finance.GET("/companies", mdw.PermissionMiddleware("business", "list"), financeCompanyHandler.GetAll)
		finance.GET("/report/migrations", mdw.PermissionMiddleware("business", "list"), financeHandler.FinanceMigrationReport)
		finance.GET("/report/migrations/:id/order-ins", mdw.PermissionMiddleware("business", "list"), financeHandler.FinanceMigrationOrderInDetail)
		finance.GET("/dealers/:id/metrics", mdw.PermissionMiddleware("business", "view_metrics"), financeHandler.DealerMetrics)
		finance.POST("/dealers", mdw.PermissionMiddleware("business", "create"), dealerHandler.Create)
		finance.PUT("/dealers/:id", mdw.PermissionMiddleware("business", "update"), dealerHandler.Update)
		finance.DELETE("/dealers/:id", mdw.PermissionMiddleware("business", "delete"), dealerHandler.Delete)
		finance.POST("/companies", mdw.PermissionMiddleware("business", "create"), financeCompanyHandler.Create)
		finance.PUT("/companies/:id", mdw.PermissionMiddleware("business", "update"), financeCompanyHandler.Update)
		finance.DELETE("/companies/:id", mdw.PermissionMiddleware("business", "delete"), financeCompanyHandler.Delete)
	}
}

func (r *Routes) JobRoutes() {
	jobRepo := repositoryjob.NewJobRepo(r.DB)
	jobHandler := handlerjob.NewJobHandler(servicejob.NewJobService(jobRepo))

	mdw := r.newProtectedMiddleware()

	r.App.GET("/api/jobs", mdw.AuthMiddleware(), mdw.PermissionMiddleware("jobs", "list"), jobHandler.GetAll)

	job := r.App.Group("/api/job").Use(mdw.AuthMiddleware())
	{
		job.GET("/:id", mdw.PermissionMiddleware("jobs", "view"), jobHandler.GetByID)
		job.POST("", mdw.PermissionMiddleware("jobs", "create"), jobHandler.Create)
		job.PUT("/:id", mdw.PermissionMiddleware("jobs", "update"), jobHandler.Update)
		job.DELETE("/:id", mdw.PermissionMiddleware("jobs", "delete"), jobHandler.Delete)
	}
}

func (r *Routes) NetIncomeRoutes() {
	netIncomeRepo := repositorynetincome.NewNetIncomeRepo(r.DB)
	jobRepo := repositoryjob.NewJobRepo(r.DB)
	netIncomeHandler := handlernetincome.NewNetIncomeHandler(servicenetincome.NewNetIncomeService(netIncomeRepo, jobRepo))

	mdw := r.newProtectedMiddleware()

	r.App.GET("/api/net-incomes", mdw.AuthMiddleware(), mdw.PermissionMiddleware("net_income", "list"), netIncomeHandler.GetAll)

	netIncome := r.App.Group("/api/net-income").Use(mdw.AuthMiddleware())
	{
		netIncome.GET("/:id", mdw.PermissionMiddleware("net_income", "view"), netIncomeHandler.GetByID)
		netIncome.POST("", mdw.PermissionMiddleware("net_income", "create"), netIncomeHandler.Create)
		netIncome.PUT("/:id", mdw.PermissionMiddleware("net_income", "update"), netIncomeHandler.Update)
		netIncome.DELETE("/:id", mdw.PermissionMiddleware("net_income", "delete"), netIncomeHandler.Delete)
	}
}

func (r *Routes) CreditRoutes() {
	creditRepo := repositorycredit.NewCreditRepo(r.DB)
	jobRepo := repositoryjob.NewJobRepo(r.DB)
	creditService := servicecredit.NewCreditService(creditRepo, jobRepo)
	creditHandler := handlercredit.NewCreditHandler(creditService)

	mdw := r.newProtectedMiddleware()

	r.App.GET("/api/credits", mdw.AuthMiddleware(), mdw.PermissionMiddleware("credit", "list"), creditHandler.GetAll)

	credit := r.App.Group("/api/credit").Use(mdw.AuthMiddleware())
	{
		credit.POST("", mdw.PermissionMiddleware("credit", "upsert"), creditHandler.Upsert)
		credit.GET("/worksheet", mdw.PermissionMiddleware("credit", "list"), creditHandler.Worksheet)
		credit.GET("/summary", mdw.PermissionMiddleware("credit", "list"), creditHandler.Summary)
	}
}

func (r *Routes) QuadrantRoutes() {
	quadrantRepo := repositoryquadrant.NewQuadrantRepo(r.DB)
	creditRepo := repositorycredit.NewCreditRepo(r.DB)
	jobRepo := repositoryjob.NewJobRepo(r.DB)
	creditService := servicecredit.NewCreditService(creditRepo, jobRepo)
	quadrantHandler := handlerquadrant.NewQuadrantHandler(servicequadrant.NewQuadrantService(quadrantRepo, creditService))

	mdw := r.newProtectedMiddleware()

	r.App.GET("/api/quadrants", mdw.AuthMiddleware(), mdw.PermissionMiddleware("quadrants", "list"), quadrantHandler.GetAll)

	quadrant := r.App.Group("/api/quadrant").Use(mdw.AuthMiddleware())
	{
		quadrant.POST("/recompute", mdw.PermissionMiddleware("quadrants", "recompute"), quadrantHandler.Recompute)
		quadrant.GET("/summary", mdw.PermissionMiddleware("quadrants", "list"), quadrantHandler.Summary)
	}
}

func (r *Routes) NewsRoutes() {
	newsRepo := repositorynews.NewNewsRepo(r.DB)
	newsHandler := handlernews.NewNewsHandler(servicenews.NewNewsService(newsRepo))

	mdw := r.newProtectedMiddleware()

	dashboard := r.App.Group("/api/dashboard").Use(mdw.AuthMiddleware(), mdw.PermissionMiddleware("dashboard", "view"))
	{
		dashboard.GET("/news-items", newsHandler.DashboardItems)
	}

	news := r.App.Group("/api/news").Use(mdw.AuthMiddleware())
	{
		news.POST("/sources", mdw.PermissionMiddleware("news", "upsert"), newsHandler.UpsertSource)
		news.GET("/sources", mdw.PermissionMiddleware("news", "list"), newsHandler.ListSources)
		news.POST("/scrape", mdw.PermissionMiddleware("news", "scrape"), newsHandler.Scrape)
		news.POST("/import", mdw.PermissionMiddleware("news", "scrape"), newsHandler.Import)
		news.GET("/latest", mdw.PermissionMiddleware("news", "list"), newsHandler.Latest)
		news.GET("/items", mdw.PermissionMiddleware("news", "list"), newsHandler.ListItems)
		news.DELETE("/items/:id", mdw.PermissionMiddleware("news", "delete"), newsHandler.DeleteItem)
	}
}

func (r *Routes) CommodityRoutes() {
	commodityRepo := repositorycommodity.NewCommodityRepo(r.DB)
	commodityHandler := handlercommodity.NewCommodityHandler(servicecommodity.NewCommodityService(commodityRepo))

	mdw := r.newProtectedMiddleware()

	dashboard := r.App.Group("/api/dashboard").Use(mdw.AuthMiddleware(), mdw.PermissionMiddleware("dashboard", "view"))
	{
		dashboard.GET("/prices", commodityHandler.DashboardPrices)
	}

	r.App.GET("/api/commodities", mdw.AuthMiddleware(), mdw.PermissionMiddleware("commodities", "list"), commodityHandler.ListCommodities)

	commodity := r.App.Group("/api/commodity").Use(mdw.AuthMiddleware())
	{
		commodity.POST("", mdw.PermissionMiddleware("commodities", "upsert"), commodityHandler.Upsert)
		commodity.POST("/price", mdw.PermissionMiddleware("commodities", "create"), commodityHandler.AddPrice)
		commodity.GET("/prices", mdw.PermissionMiddleware("commodities", "list"), commodityHandler.ListPrices)
		commodity.GET("/prices/latest", mdw.PermissionMiddleware("commodities", "list"), commodityHandler.LatestPrices)
		commodity.DELETE("/prices/:id", mdw.PermissionMiddleware("commodities", "delete"), commodityHandler.DeletePrice)
		commodity.POST("/prices/scrape", mdw.PermissionMiddleware("commodities", "scrape"), commodityHandler.ScrapePrices)
		commodity.POST("/prices/scrape-jobs", mdw.PermissionMiddleware("commodities", "scrape"), commodityHandler.CreateScrapeJob)
		commodity.GET("/prices/jobs", mdw.PermissionMiddleware("commodities", "list"), commodityHandler.ListScrapeJobs)
		commodity.GET("/prices/jobs/:id/results", mdw.PermissionMiddleware("commodities", "list"), commodityHandler.ListScrapeResults)
		commodity.POST("/prices/jobs/:id/commit", mdw.PermissionMiddleware("commodities", "create"), commodityHandler.CommitScrapeResults)
	}
}

func (r *Routes) LookupRoutes() {
	lookupRepo := repositorylookup.NewLookupRepo(r.DB)
	locationService := servicelocation.NewLocationService(repositorylocation.NewLocationRepo(r.DB))
	lookupHandler := handlerlookup.NewLookupHandler(servicelookup.NewLookupService(lookupRepo, locationService))

	mdw := r.newProtectedMiddleware()

	r.App.GET("/api/lookups", mdw.AuthMiddleware(), lookupHandler.GetAll)
}

func (r *Routes) ScrapeSourceRoutes() {
	scrapeSourceRepo := repositoryscrapesource.NewScrapeSourceRepo(r.DB)
	scrapeSourceHandler := handlerscrapesource.NewScrapeSourceHandler(servicescrapesource.NewScrapeSourceService(scrapeSourceRepo))

	mdw := r.newProtectedMiddleware()

	r.App.GET("/api/scrape-sources", mdw.AuthMiddleware(), mdw.PermissionMiddleware("scrape_sources", "list"), scrapeSourceHandler.GetAll)

	scrapeSource := r.App.Group("/api/scrape-source").Use(mdw.AuthMiddleware())
	{
		scrapeSource.POST("", mdw.PermissionMiddleware("scrape_sources", "create"), scrapeSourceHandler.Create)
		scrapeSource.PUT("/:id", mdw.PermissionMiddleware("scrape_sources", "update"), scrapeSourceHandler.Update)
		scrapeSource.DELETE("/:id", mdw.PermissionMiddleware("scrape_sources", "delete"), scrapeSourceHandler.Delete)
	}
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
