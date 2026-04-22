package scheduler

import (
	"context"
	"fmt"
	"time"

	interfacecommodity "service-songket/internal/interfaces/commodity"
	interfacemastersetting "service-songket/internal/interfaces/mastersetting"
	interfacenews "service-songket/internal/interfaces/news"
	"service-songket/pkg/logger"
	"service-songket/utils"
)

type NewsScrapeCronScheduler struct {
	masterSettingService interfacemastersetting.ServiceMasterSettingInterface
	newsService          interfacenews.ServiceNewsInterface
	pollInterval         time.Duration
	runTimeout           time.Duration
}

type PriceScrapeCronScheduler struct {
	masterSettingService interfacemastersetting.ServiceMasterSettingInterface
	commodityService     interfacecommodity.ServiceCommodityInterface
	pollInterval         time.Duration
	runTimeout           time.Duration
}

func NewNewsScrapeCronScheduler(
	masterSettingService interfacemastersetting.ServiceMasterSettingInterface,
	newsService interfacenews.ServiceNewsInterface,
) *NewsScrapeCronScheduler {
	pollSeconds := utils.GetEnv("NEWS_SCRAPE_CRON_POLL_SECONDS", 15).(int)
	if pollSeconds <= 0 {
		pollSeconds = 15
	}

	timeoutMinutes := utils.GetEnv("NEWS_SCRAPE_CRON_TIMEOUT_MINUTES", 4).(int)
	if timeoutMinutes <= 0 {
		timeoutMinutes = 4
	}

	return &NewsScrapeCronScheduler{
		masterSettingService: masterSettingService,
		newsService:          newsService,
		pollInterval:         time.Duration(pollSeconds) * time.Second,
		runTimeout:           time.Duration(timeoutMinutes) * time.Minute,
	}
}

func NewPriceScrapeCronScheduler(
	masterSettingService interfacemastersetting.ServiceMasterSettingInterface,
	commodityService interfacecommodity.ServiceCommodityInterface,
) *PriceScrapeCronScheduler {
	pollSeconds := utils.GetEnv("PRICE_SCRAPE_CRON_POLL_SECONDS", 15).(int)
	if pollSeconds <= 0 {
		pollSeconds = 15
	}

	timeoutMinutes := utils.GetEnv("PRICE_SCRAPE_CRON_TIMEOUT_MINUTES", 6).(int)
	if timeoutMinutes <= 0 {
		timeoutMinutes = 6
	}

	return &PriceScrapeCronScheduler{
		masterSettingService: masterSettingService,
		commodityService:     commodityService,
		pollInterval:         time.Duration(pollSeconds) * time.Second,
		runTimeout:           time.Duration(timeoutMinutes) * time.Minute,
	}
}

func (c *NewsScrapeCronScheduler) Start(ctx context.Context) {
	if c == nil || c.masterSettingService == nil || c.newsService == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[news-cron] scheduler started (poll=%s timeout=%s)", c.pollInterval, c.runTimeout))
	go c.loop(ctx)
}

func (c *PriceScrapeCronScheduler) Start(ctx context.Context) {
	if c == nil || c.masterSettingService == nil || c.commodityService == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[price-cron] scheduler started (poll=%s timeout=%s)", c.pollInterval, c.runTimeout))
	go c.loop(ctx)
}

func (c *NewsScrapeCronScheduler) loop(ctx context.Context) {
	ticker := time.NewTicker(c.pollInterval)
	defer ticker.Stop()

	var (
		lastRunAt time.Time
		lastOn    bool
		lastEvery int
		hasConfig bool
		running   bool
	)

	runCycle := func() {
		if running {
			return
		}

		config, err := c.masterSettingService.GetNewsScrapeCronSetting(ctx)
		if err != nil {
			logger.WriteLog(logger.LogLevelError, fmt.Sprintf("[news-cron] failed to read setting: %v", err))
			return
		}

		if !hasConfig || config.IsActive != lastOn || config.IntervalMinutes != lastEvery {
			logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[news-cron] config updated enabled=%t interval=%d minutes", config.IsActive, config.IntervalMinutes))
			lastOn = config.IsActive
			lastEvery = config.IntervalMinutes
			hasConfig = true
		}

		if !config.IsActive {
			return
		}

		interval := time.Duration(config.IntervalMinutes) * time.Minute
		if !lastRunAt.IsZero() && time.Since(lastRunAt) < interval {
			return
		}

		running = true
		lastRunAt = time.Now()

		runCtx, cancel := context.WithTimeout(ctx, c.runTimeout)
		imported, skipped, runErr := c.newsService.AutoImport(runCtx)
		cancel()
		running = false

		if runErr != nil {
			logger.WriteLog(logger.LogLevelError, fmt.Sprintf("[news-cron] scrape run failed: %v", runErr))
			return
		}

		logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[news-cron] scrape run finished imported=%d skipped=%d", imported, skipped))
	}

	runCycle()

	for {
		select {
		case <-ctx.Done():
			logger.WriteLog(logger.LogLevelInfo, "[news-cron] scheduler stopped")
			return
		case <-ticker.C:
			runCycle()
		}
	}
}

func (c *PriceScrapeCronScheduler) loop(ctx context.Context) {
	ticker := time.NewTicker(c.pollInterval)
	defer ticker.Stop()

	var (
		lastRunAt time.Time
		lastOn    bool
		lastEvery int
		hasConfig bool
		running   bool
	)

	runCycle := func() {
		if running {
			return
		}

		config, err := c.masterSettingService.GetPriceScrapeCronSetting(ctx)
		if err != nil {
			logger.WriteLog(logger.LogLevelError, fmt.Sprintf("[price-cron] failed to read setting: %v", err))
			return
		}

		intervalDays := config.IntervalMinutes / (24 * 60)
		if config.IntervalMinutes%(24*60) != 0 {
			intervalDays++
		}
		if intervalDays <= 0 {
			intervalDays = 1
		}

		if !hasConfig || config.IsActive != lastOn || intervalDays != lastEvery {
			logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[price-cron] config updated enabled=%t interval=%d days", config.IsActive, intervalDays))
			lastOn = config.IsActive
			lastEvery = intervalDays
			hasConfig = true
		}

		if !config.IsActive {
			return
		}

		interval := time.Duration(intervalDays) * 24 * time.Hour
		if !lastRunAt.IsZero() && time.Since(lastRunAt) < interval {
			return
		}

		running = true
		lastRunAt = time.Now()

		runCtx, cancel := context.WithTimeout(ctx, c.runTimeout)
		imported, runErr := c.commodityService.AutoImport(runCtx)
		cancel()
		running = false

		if runErr != nil {
			logger.WriteLog(logger.LogLevelError, fmt.Sprintf("[price-cron] scrape run failed: %v", runErr))
			return
		}

		logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[price-cron] scrape run finished imported=%d", imported))
	}

	runCycle()

	for {
		select {
		case <-ctx.Done():
			logger.WriteLog(logger.LogLevelInfo, "[price-cron] scheduler stopped")
			return
		case <-ticker.C:
			runCycle()
		}
	}
}
