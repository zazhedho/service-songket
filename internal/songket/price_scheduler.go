package songket

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"service-songket/pkg/logger"
	"service-songket/utils"

	"gorm.io/gorm"
)

type PriceScrapeCronSetting struct {
	Enabled      bool
	IntervalDays int
}

const (
	minCronIntervalDays = 1
	maxCronIntervalDays = 31
	minutesPerDay       = 24 * 60
)

func defaultPriceScrapeMasterSetting() MasterSetting {
	return MasterSetting{
		Id:              utils.CreateUUID(),
		Key:             MasterSettingKeyPriceScrapeCron,
		IsActive:        true,
		IntervalMinutes: minutesPerDay,
		Description:     "Auto scrape harga pangan",
	}
}

func normalizeCronIntervalDays(value int) int {
	if value < minCronIntervalDays {
		return minCronIntervalDays
	}
	if value > maxCronIntervalDays {
		return maxCronIntervalDays
	}
	return value
}

func intervalMinutesToDays(value int) int {
	minutes := value
	if minutes <= 0 {
		minutes = minutesPerDay
	}
	days := minutes / minutesPerDay
	if minutes%minutesPerDay != 0 {
		days++
	}
	return normalizeCronIntervalDays(days)
}

func daysToIntervalMinutes(days int) int {
	return normalizeCronIntervalDays(days) * minutesPerDay
}

func (s *Service) GetPriceScrapeCronMasterSetting() (MasterSetting, error) {
	if s == nil || s.db == nil {
		return MasterSetting{}, fmt.Errorf("service is not initialized")
	}

	var setting MasterSetting
	err := s.db.Where("key = ?", MasterSettingKeyPriceScrapeCron).First(&setting).Error
	if err == nil {
		setting.IntervalMinutes = daysToIntervalMinutes(intervalMinutesToDays(setting.IntervalMinutes))
		if strings.TrimSpace(setting.Description) == "" {
			setting.Description = "Auto scrape harga pangan"
		}
		return setting, nil
	}
	return MasterSetting{}, err
}

func (s *Service) CreatePriceScrapeCronMasterSetting(req PriceScrapeCronSettingRequest, actorUserID string, actorName string) (MasterSetting, error) {
	if s == nil || s.db == nil {
		return MasterSetting{}, fmt.Errorf("service is not initialized")
	}

	var existing MasterSetting
	err := s.db.Where("key = ?", MasterSettingKeyPriceScrapeCron).First(&existing).Error
	if err == nil {
		return MasterSetting{}, fmt.Errorf("commodity price scrape cron setting already exists")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return MasterSetting{}, err
	}

	nextDays := req.IntervalDays
	nextIsActive := req.IsActive
	if nextDays <= 0 {
		nextDays = minCronIntervalDays
		nextIsActive = false
	}
	intervalDays := normalizeCronIntervalDays(nextDays)
	intervalMinutes := daysToIntervalMinutes(intervalDays)

	setting := MasterSetting{
		Id:              utils.CreateUUID(),
		Key:             MasterSettingKeyPriceScrapeCron,
		IsActive:        nextIsActive,
		IntervalMinutes: intervalMinutes,
		Description:     "Auto scrape harga pangan",
	}

	history := MasterSettingHistory{
		Id:                      utils.CreateUUID(),
		SettingID:               setting.Id,
		Key:                     setting.Key,
		PreviousIsActive:        false,
		PreviousIntervalMinutes: daysToIntervalMinutes(minCronIntervalDays),
		NewIsActive:             setting.IsActive,
		NewIntervalMinutes:      setting.IntervalMinutes,
		ChangedByUserID:         normalizeHistoryActorUserID(actorUserID),
		ChangedByName:           normalizeHistoryActorName(actorName),
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&setting).Error; err != nil {
			return err
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return MasterSetting{}, err
	}
	return setting, nil
}

func (s *Service) GetPriceScrapeCronSetting() (PriceScrapeCronSetting, error) {
	if s == nil || s.db == nil {
		return PriceScrapeCronSetting{}, fmt.Errorf("service is not initialized")
	}

	setting, err := s.GetPriceScrapeCronMasterSetting()
	if err != nil {
		return PriceScrapeCronSetting{}, err
	}

	return PriceScrapeCronSetting{
		Enabled:      setting.IsActive,
		IntervalDays: intervalMinutesToDays(setting.IntervalMinutes),
	}, nil
}

func (s *Service) UpdatePriceScrapeCronMasterSetting(req PriceScrapeCronSettingRequest, actorUserID string, actorName string) (MasterSetting, error) {
	if s == nil || s.db == nil {
		return MasterSetting{}, fmt.Errorf("service is not initialized")
	}

	nextDays := req.IntervalDays
	nextIsActive := req.IsActive
	if nextDays <= 0 {
		nextDays = minCronIntervalDays
		nextIsActive = false
	}
	intervalDays := normalizeCronIntervalDays(nextDays)
	intervalMinutes := daysToIntervalMinutes(intervalDays)

	setting, err := s.GetPriceScrapeCronMasterSetting()
	if err != nil {
		return MasterSetting{}, err
	}

	previousActive := setting.IsActive
	previousMinutes := daysToIntervalMinutes(intervalMinutesToDays(setting.IntervalMinutes))

	setting.IsActive = nextIsActive
	setting.IntervalMinutes = intervalMinutes
	if strings.TrimSpace(setting.Description) == "" {
		setting.Description = "Auto scrape harga pangan"
	}

	history := MasterSettingHistory{
		Id:                      utils.CreateUUID(),
		SettingID:               setting.Id,
		Key:                     setting.Key,
		PreviousIsActive:        previousActive,
		PreviousIntervalMinutes: previousMinutes,
		NewIsActive:             setting.IsActive,
		NewIntervalMinutes:      setting.IntervalMinutes,
		ChangedByUserID:         normalizeHistoryActorUserID(actorUserID),
		ChangedByName:           normalizeHistoryActorName(actorName),
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&setting).Error; err != nil {
			return err
		}
		if previousActive != setting.IsActive || previousMinutes != setting.IntervalMinutes {
			if err := tx.Create(&history).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return MasterSetting{}, err
	}

	return setting, nil
}

func (s *Service) ListPriceScrapeCronSettingHistory(limit int) ([]MasterSettingHistory, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("service is not initialized")
	}
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}

	histories := make([]MasterSettingHistory, 0, limit)
	if err := s.db.
		Where("key = ?", MasterSettingKeyPriceScrapeCron).
		Order("created_at DESC").
		Limit(limit).
		Find(&histories).Error; err != nil {
		return nil, err
	}
	return histories, nil
}

func (s *Service) DeletePriceScrapeCronMasterSetting(actorUserID string, actorName string) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("service is not initialized")
	}

	var setting MasterSetting
	if err := s.db.Where("key = ?", MasterSettingKeyPriceScrapeCron).First(&setting).Error; err != nil {
		return err
	}

	history := MasterSettingHistory{
		Id:                      utils.CreateUUID(),
		SettingID:               setting.Id,
		Key:                     setting.Key,
		PreviousIsActive:        setting.IsActive,
		PreviousIntervalMinutes: daysToIntervalMinutes(intervalMinutesToDays(setting.IntervalMinutes)),
		NewIsActive:             false,
		NewIntervalMinutes:      daysToIntervalMinutes(minCronIntervalDays),
		ChangedByUserID:         normalizeHistoryActorUserID(actorUserID),
		ChangedByName:           normalizeHistoryActorName(actorName),
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&history).Error; err != nil {
			return err
		}
		if err := tx.Delete(&setting).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *Service) RunPriceScrapeAutoImport(ctx context.Context) (int, error) {
	if s == nil || s.db == nil {
		return 0, fmt.Errorf("service is not initialized")
	}
	rows, err := s.ScrapeFromSources(ctx, nil)
	if err != nil {
		return 0, err
	}
	return len(rows), nil
}

type PriceScrapeCronScheduler struct {
	svc          *Service
	pollInterval time.Duration
	runTimeout   time.Duration
}

func NewPriceScrapeCronScheduler(svc *Service) *PriceScrapeCronScheduler {
	pollSeconds := utils.GetEnv("PRICE_SCRAPE_CRON_POLL_SECONDS", 15).(int)
	if pollSeconds <= 0 {
		pollSeconds = 15
	}

	timeoutMinutes := utils.GetEnv("PRICE_SCRAPE_CRON_TIMEOUT_MINUTES", 6).(int)
	if timeoutMinutes <= 0 {
		timeoutMinutes = 6
	}

	return &PriceScrapeCronScheduler{
		svc:          svc,
		pollInterval: time.Duration(pollSeconds) * time.Second,
		runTimeout:   time.Duration(timeoutMinutes) * time.Minute,
	}
}

func (c *PriceScrapeCronScheduler) Start(ctx context.Context) {
	if c == nil || c.svc == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[price-cron] scheduler started (poll=%s timeout=%s)", c.pollInterval, c.runTimeout))
	go c.loop(ctx)
}

func (c *PriceScrapeCronScheduler) loop(ctx context.Context) {
	ticker := time.NewTicker(c.pollInterval)
	defer ticker.Stop()

	var (
		lastRunAt  time.Time
		lastConfig PriceScrapeCronSetting
		hasConfig  bool
		running    bool
	)

	runCycle := func() {
		if running {
			return
		}

		config, err := c.svc.GetPriceScrapeCronSetting()
		if err != nil {
			logger.WriteLog(logger.LogLevelError, fmt.Sprintf("[price-cron] failed to read setting: %v", err))
			return
		}

		if !hasConfig || config.Enabled != lastConfig.Enabled || config.IntervalDays != lastConfig.IntervalDays {
			logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[price-cron] config updated enabled=%t interval=%d days", config.Enabled, config.IntervalDays))
			lastConfig = config
			hasConfig = true
		}

		if !config.Enabled {
			return
		}

		interval := time.Duration(config.IntervalDays) * 24 * time.Hour
		if !lastRunAt.IsZero() && time.Since(lastRunAt) < interval {
			return
		}

		running = true
		lastRunAt = time.Now()

		runCtx, cancel := context.WithTimeout(ctx, c.runTimeout)
		imported, runErr := c.svc.RunPriceScrapeAutoImport(runCtx)
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
