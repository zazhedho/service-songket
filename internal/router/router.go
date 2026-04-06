package router

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"starter-kit/infrastructure/database"
	menuHandler "starter-kit/internal/handlers/http/menu"
	permissionHandler "starter-kit/internal/handlers/http/permission"
	roleHandler "starter-kit/internal/handlers/http/role"
	sessionHandler "starter-kit/internal/handlers/http/session"
	userHandler "starter-kit/internal/handlers/http/user"
	"starter-kit/internal/master"
	authRepo "starter-kit/internal/repositories/auth"
	menuRepo "starter-kit/internal/repositories/menu"
	permissionRepo "starter-kit/internal/repositories/permission"
	roleRepo "starter-kit/internal/repositories/role"
	sessionRepo "starter-kit/internal/repositories/session"
	userRepo "starter-kit/internal/repositories/user"
	menuSvc "starter-kit/internal/services/menu"
	permissionSvc "starter-kit/internal/services/permission"
	roleSvc "starter-kit/internal/services/role"
	sessionSvc "starter-kit/internal/services/session"
	userSvc "starter-kit/internal/services/user"
	"starter-kit/internal/songket"
	"starter-kit/middlewares"
	"starter-kit/pkg/logger"
	"starter-kit/pkg/security"
	"starter-kit/utils"
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
	svc := songket.NewService(r.DB)
	h := songket.NewHandler(svc)

	blacklistRepo := authRepo.NewBlacklistRepo(r.DB)
	pRepo := permissionRepo.NewPermissionRepo(r.DB)
	mRepo := menuRepo.NewMenuRepo(r.DB)
	mdw := middlewares.NewMiddleware(blacklistRepo, pRepo, mRepo)
	menuAccess := func(paths ...string) gin.HandlerFunc {
		return mdw.MenuAccessMiddleware(paths...)
	}

	g := r.App.Group("/api/songket").Use(mdw.AuthMiddleware())

	// Orders
	g.GET("/dashboard/orders", h.DashboardOrders)
	g.GET("/dashboard/summary", h.DashboardSummary)
	g.POST("/orders", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "create"), h.CreateOrder)
	g.GET("/orders", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "list"), h.ListOrders)
	g.PUT("/orders/:id", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "update"), h.UpdateOrder)
	g.DELETE("/orders/:id", menuAccess("/orders"), mdw.PermissionMiddleware("orders", "delete"), h.DeleteOrder)

	// Motor types
	g.GET("/motor-types", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "list"), h.ListMotorTypes)
	g.GET("/motor-types/:id", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "view"), h.GetMotorTypeByID)
	g.POST("/motor-types", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "create"), h.CreateMotorType)
	g.PUT("/motor-types/:id", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "update"), h.UpdateMotorType)
	g.DELETE("/motor-types/:id", menuAccess("/motor-types", "/installments"), mdw.PermissionMiddleware("motor_types", "delete"), h.DeleteMotorType)

	// Installments
	g.GET("/installments", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "list"), h.ListInstallments)
	g.GET("/installments/:id", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "view"), h.GetInstallmentByID)
	g.POST("/installments", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "create"), h.CreateInstallment)
	g.PUT("/installments/:id", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "update"), h.UpdateInstallment)
	g.DELETE("/installments/:id", menuAccess("/installments"), mdw.PermissionMiddleware("installments", "delete"), h.DeleteInstallment)

	// Master settings (superadmin only)
	g.POST("/master-settings/news-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.CreateNewsScrapeCronSetting)
	g.GET("/master-settings/news-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.GetNewsScrapeCronSetting)
	g.GET("/master-settings/news-scrape-cron/history", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.GetNewsScrapeCronSettingHistory)
	g.PUT("/master-settings/news-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.UpdateNewsScrapeCronSetting)
	g.DELETE("/master-settings/news-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.DeleteNewsScrapeCronSetting)
	g.POST("/master-settings/prices-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.CreatePriceScrapeCronSetting)
	g.GET("/master-settings/prices-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.GetPriceScrapeCronSetting)
	g.GET("/master-settings/prices-scrape-cron/history", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.GetPriceScrapeCronSettingHistory)
	g.PUT("/master-settings/prices-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.UpdatePriceScrapeCronSetting)
	g.DELETE("/master-settings/prices-scrape-cron", menuAccess("/master-settings"), mdw.RoleMiddleware(utils.RoleSuperAdmin), h.DeletePriceScrapeCronSetting)

	// Finance performance
	g.GET("/finance/dealers", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), h.Dealers)
	g.GET("/finance/companies", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), h.FinanceCompanies)
	g.GET("/finance/report/migrations", menuAccess("/business", "/finance", "/dealer", "/finance-report"), mdw.PermissionMiddleware("finance", "list_dealers"), h.FinanceMigrationReport)
	g.GET("/finance/report/migrations/:id/order-ins", menuAccess("/business", "/finance", "/dealer", "/finance-report"), mdw.PermissionMiddleware("finance", "list_dealers"), h.FinanceMigrationOrderInDetail)
	g.GET("/finance/dealers/:id/metrics", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "view_metrics"), h.DealerMetrics)
	g.POST("/finance/dealers", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), h.CreateDealer)
	g.PUT("/finance/dealers/:id", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), h.UpdateDealer)
	g.DELETE("/finance/dealers/:id", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), h.DeleteDealer)
	g.POST("/finance/companies", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), h.CreateFinanceCompany)
	g.PUT("/finance/companies/:id", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), h.UpdateFinanceCompany)
	g.DELETE("/finance/companies/:id", menuAccess("/business", "/finance", "/dealer"), mdw.PermissionMiddleware("finance", "list_dealers"), h.DeleteFinanceCompany)

	// Jobs + Net Income
	g.GET("/jobs", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "list"), h.ListJobs)
	g.GET("/jobs/:id", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "view"), h.GetJobByID)
	g.POST("/jobs", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "create"), h.CreateJob)
	g.PUT("/jobs/:id", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "update"), h.UpdateJob)
	g.DELETE("/jobs/:id", menuAccess("/jobs"), mdw.PermissionMiddleware("jobs", "delete"), h.DeleteJob)

	g.GET("/net-income", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "list"), h.ListNetIncomes)
	g.GET("/net-income/:id", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "view"), h.GetNetIncomeByID)
	g.POST("/net-income", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "create"), h.CreateNetIncome)
	g.PUT("/net-income/:id", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "update"), h.UpdateNetIncome)
	g.DELETE("/net-income/:id", menuAccess("/net-income", "/jobs"), mdw.PermissionMiddleware("net_income", "delete"), h.DeleteNetIncome)

	// Credit capability & quadrants
	g.POST("/credit", menuAccess("/credit"), mdw.PermissionMiddleware("credit", "upsert"), h.UpsertCredit)
	g.GET("/credit", menuAccess("/credit"), mdw.PermissionMiddleware("credit", "list"), h.ListCredit)
	g.GET("/credit/worksheet", menuAccess("/credit"), mdw.PermissionMiddleware("credit", "list"), h.CreditWorksheet)
	g.GET("/credit/summary", menuAccess("/credit"), mdw.PermissionMiddleware("credit", "list"), h.CreditSummary)
	g.POST("/quadrants/recompute", menuAccess("/quadrants"), mdw.PermissionMiddleware("quadrants", "recompute"), h.RecomputeQuadrants)
	g.GET("/quadrants", menuAccess("/quadrants"), mdw.PermissionMiddleware("quadrants", "list"), h.ListQuadrants)
	g.GET("/quadrants/summary", menuAccess("/quadrants"), mdw.PermissionMiddleware("quadrants", "list"), h.QuadrantSummary)

	// News
	g.GET("/dashboard/news-items", h.DashboardNewsItems)
	g.POST("/news/sources", menuAccess("/news"), mdw.PermissionMiddleware("news", "upsert_source"), h.UpsertNewsSource)
	g.GET("/news/sources", menuAccess("/news"), mdw.PermissionMiddleware("news", "upsert_source"), h.ListNewsSources)
	g.POST("/news/scrape", menuAccess("/news"), mdw.PermissionMiddleware("news", "scrape"), h.ScrapeNews)
	g.POST("/news/import", menuAccess("/news"), mdw.PermissionMiddleware("news", "scrape"), h.ImportNews)
	g.GET("/news/latest", menuAccess("/news"), mdw.PermissionMiddleware("news", "view"), h.LatestNews)
	g.GET("/news/items", menuAccess("/news"), mdw.PermissionMiddleware("news", "view"), h.ListNewsItems)
	g.DELETE("/news/items/:id", menuAccess("/news"), mdw.PermissionMiddleware("news", "scrape"), h.DeleteNewsItem)

	// Commodity prices
	g.GET("/dashboard/prices", h.DashboardPrices)
	g.POST("/commodities", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "upsert"), h.UpsertCommodity)
	g.POST("/commodities/price", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "add_price"), h.AddPrice)
	g.GET("/commodities/prices/latest", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "list_prices"), h.LatestPrices)
	g.GET("/commodities", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "list_prices"), h.ListCommodities)
	g.GET("/commodities/prices", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "list_prices"), h.ListPrices)
	g.DELETE("/commodities/prices/:id", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), h.DeletePrice)
	g.POST("/commodities/prices/scrape", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), h.ScrapePrices)
	g.POST("/commodities/prices/scrape-jobs", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), h.CreateScrapeJob)
	g.GET("/commodities/prices/jobs", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), h.ListScrapeJobs)
	g.GET("/commodities/prices/jobs/:id/results", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "scrape_prices"), h.ListScrapeResults)
	g.POST("/commodities/prices/jobs/:id/commit", menuAccess("/prices"), mdw.PermissionMiddleware("commodities", "add_price"), h.CommitScrapeResults)
	g.GET("/lookups", menuAccess("/orders", "/business", "/finance", "/dealer", "/credit", "/quadrants", "/prices", "/news", "/jobs", "/net-income", "/scrape-sources", "/motor-types", "/installments", "/master-settings"), h.Lookups)
	g.GET("/scrape-sources", menuAccess("/scrape-sources"), mdw.PermissionMiddleware("scrape_sources", "list"), h.ListScrapeSources)
	g.POST("/scrape-sources", menuAccess("/scrape-sources"), mdw.PermissionMiddleware("scrape_sources", "create"), h.CreateScrapeSource)
	g.PUT("/scrape-sources/:id", menuAccess("/scrape-sources"), mdw.PermissionMiddleware("scrape_sources", "update"), h.UpdateScrapeSource)
	g.DELETE("/scrape-sources/:id", menuAccess("/scrape-sources"), mdw.PermissionMiddleware("scrape_sources", "delete"), h.DeleteScrapeSource)

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
