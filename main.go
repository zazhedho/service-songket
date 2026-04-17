package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"service-songket/infrastructure/database"
	repositorycommodity "service-songket/internal/repositories/commodity"
	repositorymastersetting "service-songket/internal/repositories/mastersetting"
	repositorynews "service-songket/internal/repositories/news"
	"service-songket/internal/router"
	"service-songket/internal/scheduler"
	servicecommodity "service-songket/internal/services/commodity"
	servicemastersetting "service-songket/internal/services/mastersetting"
	servicenews "service-songket/internal/services/news"
	"service-songket/pkg/config"
	"service-songket/pkg/logger"
	"service-songket/utils"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

func FailOnError(err error, msg string) {
	if err != nil {
		log.Fatalf("%s: %s", msg, err)
	}
}

func main() {
	var (
		err        error
		sqlDb      *sql.DB
		runMigrate bool
	)
	if timeZone, err := time.LoadLocation("Asia/Jakarta"); err != nil {
		logger.WriteLog(logger.LogLevelError, "time.LoadLocation - Error: "+err.Error())
	} else {
		time.Local = timeZone
	}

	if err = godotenv.Load(".env"); err != nil && os.Getenv("APP_ENV") == "" {
		log.Fatalf("Error app environment")
	}

	myAddr := "unknown"
	addrs, _ := net.InterfaceAddrs()
	for _, address := range addrs {
		if ipNet, ok := address.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				myAddr = ipNet.IP.String()
				break
			}
		}
	}

	myAddr += strings.Repeat(" ", 15-len(myAddr))
	os.Setenv("ServerIP", myAddr)
	logger.WriteLog(logger.LogLevelInfo, "Server IP: "+myAddr)

	var port, appName string
	flag.StringVar(&port, "port", os.Getenv("PORT"), "port of the service")
	flag.StringVar(&appName, "appname", os.Getenv("APP_NAME"), "service name")
	flag.BoolVar(&runMigrate, "migrate", utils.GetEnv("RUN_MIGRATION", true).(bool), "run database migration before starting server")
	flag.Parse()
	logger.WriteLog(logger.LogLevelInfo, "APP: "+appName+"; PORT: "+port)

	confID := config.GetAppConf("CONFIG_ID", "", nil)
	logger.WriteLog(logger.LogLevelDebug, fmt.Sprintf("ConfigID: %s", confID))

	if runMigrate {
		runMigration()
	}

	// Initialize Redis for session management (optional)
	redisClient, err := database.InitRedis()
	if err != nil {
		logger.WriteLog(logger.LogLevelDebug, "Redis not available, session management will be disabled")
	} else {
		defer func() {
			if closeErr := database.CloseRedis(); closeErr != nil {
				logger.WriteLog(logger.LogLevelError, "Failed to close redis connection: "+closeErr.Error())
			}
		}()
		logger.WriteLog(logger.LogLevelInfo, "Redis initialized, session management enabled")
	}

	routes := router.NewRoutes()

	routes.DB, sqlDb, err = database.ConnDb()
	FailOnError(err, "Failed to open db")
	defer sqlDb.Close()

	masterSettingService := servicemastersetting.NewMasterSettingService(repositorymastersetting.NewMasterSettingRepo(routes.DB))
	newsService := servicenews.NewNewsService(repositorynews.NewNewsRepo(routes.DB))
	commodityService := servicecommodity.NewCommodityService(repositorycommodity.NewCommodityRepo(routes.DB))

	newsCronScheduler := scheduler.NewNewsScrapeCronScheduler(masterSettingService, newsService)
	newsCronScheduler.Start(context.Background())
	priceCronScheduler := scheduler.NewPriceScrapeCronScheduler(masterSettingService, commodityService)
	priceCronScheduler.Start(context.Background())

	routes.UserRoutes()
	routes.RoleRoutes()
	routes.PermissionRoutes()
	routes.MenuRoutes()
	routes.LocationRoutes()
	routes.OrderRoutes()
	routes.MotorRoutes()
	routes.InstallmentRoutes()
	routes.MasterSettingRoutes()
	routes.FinanceRoutes()
	routes.JobRoutes()
	routes.NetIncomeRoutes()
	routes.CreditRoutes()
	routes.QuadrantRoutes()
	routes.NewsRoutes()
	routes.CommodityRoutes()
	routes.LookupRoutes()
	routes.ScrapeSourceRoutes()

	// Register session routes if Redis is available
	if redisClient != nil {
		routes.SessionRoutes()
	}

	logger.WriteLog(logger.LogLevelInfo, "All routes registered successfully")

	err = routes.App.Run(fmt.Sprintf(":%s", port))
	FailOnError(err, "Failed run service")
}

func runMigration() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
			utils.GetEnv("DB_USERNAME", "").(string),
			utils.GetEnv("DB_PASS", "").(string),
			utils.GetEnv("DB_HOST", "").(string),
			utils.GetEnv("DB_PORT", "").(string),
			utils.GetEnv("DB_NAME", "").(string),
			utils.GetEnv("DB_SSLMODE", "disable").(string))
	}

	m, err := migrate.New(utils.GetEnv("PATH_MIGRATE", "file://migrations").(string), dsn)
	if err != nil {
		log.Fatal(err)
	}

	if err := m.Up(); err != nil && err.Error() != "no change" {
		log.Fatal(err)
	}
	logger.WriteLog(logger.LogLevelInfo, "Migration Success")
}
