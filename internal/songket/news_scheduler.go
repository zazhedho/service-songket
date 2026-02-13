package songket

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"starter-kit/pkg/logger"
	"starter-kit/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NewsScrapeCronSetting struct {
	Enabled         bool
	IntervalMinutes int
}

const (
	minCronIntervalMinutes = 1
	maxCronIntervalMinutes = 43200
)

func defaultNewsScrapeMasterSetting() MasterSetting {
	return MasterSetting{
		Id:              utils.CreateUUID(),
		Key:             MasterSettingKeyNewsScrapeCron,
		IsActive:        true,
		IntervalMinutes: 5,
		Description:     "Auto scrape portal berita",
	}
}

func normalizeCronIntervalMinutes(value int) int {
	if value < minCronIntervalMinutes {
		return minCronIntervalMinutes
	}
	if value > maxCronIntervalMinutes {
		return maxCronIntervalMinutes
	}
	return value
}

func (s *Service) GetNewsScrapeCronMasterSetting() (MasterSetting, error) {
	if s == nil || s.db == nil {
		return MasterSetting{}, fmt.Errorf("service is not initialized")
	}

	var setting MasterSetting
	err := s.db.Where("key = ?", MasterSettingKeyNewsScrapeCron).First(&setting).Error
	if err == nil {
		setting.IntervalMinutes = normalizeCronIntervalMinutes(setting.IntervalMinutes)
		if strings.TrimSpace(setting.Description) == "" {
			setting.Description = "Auto scrape portal berita"
		}
		return setting, nil
	}
	return MasterSetting{}, err
}

func (s *Service) CreateNewsScrapeCronMasterSetting(req NewsScrapeCronSettingRequest, actorUserID string, actorName string) (MasterSetting, error) {
	if s == nil || s.db == nil {
		return MasterSetting{}, fmt.Errorf("service is not initialized")
	}

	var existing MasterSetting
	err := s.db.Where("key = ?", MasterSettingKeyNewsScrapeCron).First(&existing).Error
	if err == nil {
		return MasterSetting{}, fmt.Errorf("news scrape cron setting already exists")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return MasterSetting{}, err
	}

	nextInterval := req.IntervalMinutes
	nextIsActive := req.IsActive
	if nextInterval <= 0 {
		nextInterval = minCronIntervalMinutes
		nextIsActive = false
	}
	interval := normalizeCronIntervalMinutes(nextInterval)

	setting := MasterSetting{
		Id:              utils.CreateUUID(),
		Key:             MasterSettingKeyNewsScrapeCron,
		IsActive:        nextIsActive,
		IntervalMinutes: interval,
		Description:     "Auto scrape portal berita",
	}

	history := MasterSettingHistory{
		Id:                      utils.CreateUUID(),
		SettingID:               setting.Id,
		Key:                     setting.Key,
		PreviousIsActive:        false,
		PreviousIntervalMinutes: minCronIntervalMinutes,
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

func (s *Service) GetNewsScrapeCronSetting() (NewsScrapeCronSetting, error) {
	if s == nil || s.db == nil {
		return NewsScrapeCronSetting{}, fmt.Errorf("service is not initialized")
	}

	setting, err := s.GetNewsScrapeCronMasterSetting()
	if err != nil {
		return NewsScrapeCronSetting{}, err
	}

	return NewsScrapeCronSetting{
		Enabled:         setting.IsActive,
		IntervalMinutes: normalizeCronIntervalMinutes(setting.IntervalMinutes),
	}, nil
}

func normalizeHistoryActorUserID(actorUserID string) *string {
	trimmed := strings.TrimSpace(actorUserID)
	if trimmed == "" {
		return nil
	}
	if _, err := uuid.Parse(trimmed); err != nil {
		return nil
	}
	return &trimmed
}

func normalizeHistoryActorName(actorName string) string {
	trimmed := strings.TrimSpace(actorName)
	if trimmed == "" {
		return "-"
	}
	return trimmed
}

func (s *Service) UpdateNewsScrapeCronMasterSetting(req NewsScrapeCronSettingRequest, actorUserID string, actorName string) (MasterSetting, error) {
	if s == nil || s.db == nil {
		return MasterSetting{}, fmt.Errorf("service is not initialized")
	}
	nextInterval := req.IntervalMinutes
	nextIsActive := req.IsActive
	if nextInterval <= 0 {
		nextInterval = minCronIntervalMinutes
		nextIsActive = false
	}
	interval := normalizeCronIntervalMinutes(nextInterval)

	setting, err := s.GetNewsScrapeCronMasterSetting()
	if err != nil {
		return MasterSetting{}, err
	}

	previousActive := setting.IsActive
	previousInterval := normalizeCronIntervalMinutes(setting.IntervalMinutes)

	setting.IsActive = nextIsActive
	setting.IntervalMinutes = interval
	if strings.TrimSpace(setting.Description) == "" {
		setting.Description = "Auto scrape portal berita"
	}

	history := MasterSettingHistory{
		Id:                      utils.CreateUUID(),
		SettingID:               setting.Id,
		Key:                     setting.Key,
		PreviousIsActive:        previousActive,
		PreviousIntervalMinutes: previousInterval,
		NewIsActive:             setting.IsActive,
		NewIntervalMinutes:      setting.IntervalMinutes,
		ChangedByUserID:         normalizeHistoryActorUserID(actorUserID),
		ChangedByName:           normalizeHistoryActorName(actorName),
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&setting).Error; err != nil {
			return err
		}
		if previousActive != setting.IsActive || previousInterval != setting.IntervalMinutes {
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

func (s *Service) ListNewsScrapeCronSettingHistory(limit int) ([]MasterSettingHistory, error) {
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
		Where("key = ?", MasterSettingKeyNewsScrapeCron).
		Order("created_at DESC").
		Limit(limit).
		Find(&histories).Error; err != nil {
		return nil, err
	}
	return histories, nil
}

func (s *Service) DeleteNewsScrapeCronMasterSetting(actorUserID string, actorName string) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("service is not initialized")
	}

	var setting MasterSetting
	if err := s.db.Where("key = ?", MasterSettingKeyNewsScrapeCron).First(&setting).Error; err != nil {
		return err
	}

	history := MasterSettingHistory{
		Id:                      utils.CreateUUID(),
		SettingID:               setting.Id,
		Key:                     setting.Key,
		PreviousIsActive:        setting.IsActive,
		PreviousIntervalMinutes: normalizeCronIntervalMinutes(setting.IntervalMinutes),
		NewIsActive:             false,
		NewIntervalMinutes:      minCronIntervalMinutes,
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

func (s *Service) RunNewsScrapeAutoImport(ctx context.Context) (int, int, error) {
	rows, err := s.ScrapeNews(ctx)
	if err != nil {
		return 0, 0, err
	}
	if len(rows) == 0 {
		return 0, 0, nil
	}

	saved, err := s.ImportScrapedNews(rows)
	if err != nil {
		if errors.Is(err, errNewsAlreadyAdded) {
			return 0, len(rows), nil
		}
		return 0, 0, err
	}

	imported := len(saved)
	skipped := 0
	if len(rows) > imported {
		skipped = len(rows) - imported
	}

	return imported, skipped, nil
}

type NewsScrapeCronScheduler struct {
	svc          *Service
	pollInterval time.Duration
	runTimeout   time.Duration
}

func NewNewsScrapeCronScheduler(svc *Service) *NewsScrapeCronScheduler {
	pollSeconds := utils.GetEnv("NEWS_SCRAPE_CRON_POLL_SECONDS", 15).(int)
	if pollSeconds <= 0 {
		pollSeconds = 15
	}

	timeoutMinutes := utils.GetEnv("NEWS_SCRAPE_CRON_TIMEOUT_MINUTES", 4).(int)
	if timeoutMinutes <= 0 {
		timeoutMinutes = 4
	}

	return &NewsScrapeCronScheduler{
		svc:          svc,
		pollInterval: time.Duration(pollSeconds) * time.Second,
		runTimeout:   time.Duration(timeoutMinutes) * time.Minute,
	}
}

func (c *NewsScrapeCronScheduler) Start(ctx context.Context) {
	if c == nil || c.svc == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[news-cron] scheduler started (poll=%s timeout=%s)", c.pollInterval, c.runTimeout))
	go c.loop(ctx)
}

func (c *NewsScrapeCronScheduler) loop(ctx context.Context) {
	ticker := time.NewTicker(c.pollInterval)
	defer ticker.Stop()

	var (
		lastRunAt  time.Time
		lastConfig NewsScrapeCronSetting
		hasConfig  bool
		running    bool
	)

	runCycle := func() {
		if running {
			return
		}

		config, err := c.svc.GetNewsScrapeCronSetting()
		if err != nil {
			logger.WriteLog(logger.LogLevelError, fmt.Sprintf("[news-cron] failed to read setting: %v", err))
			return
		}

		if !hasConfig || config.Enabled != lastConfig.Enabled || config.IntervalMinutes != lastConfig.IntervalMinutes {
			logger.WriteLog(logger.LogLevelInfo, fmt.Sprintf("[news-cron] config updated enabled=%t interval=%d minutes", config.Enabled, config.IntervalMinutes))
			lastConfig = config
			hasConfig = true
		}

		if !config.Enabled {
			return
		}

		interval := time.Duration(config.IntervalMinutes) * time.Minute
		if !lastRunAt.IsZero() && time.Since(lastRunAt) < interval {
			return
		}

		running = true
		lastRunAt = time.Now()

		runCtx, cancel := context.WithTimeout(ctx, c.runTimeout)
		imported, skipped, runErr := c.svc.RunNewsScrapeAutoImport(runCtx)
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
