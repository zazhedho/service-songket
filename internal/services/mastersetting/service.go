package servicemastersetting

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"

	domainmastersetting "service-songket/internal/domain/mastersetting"
	"service-songket/internal/dto"
	interfacemastersetting "service-songket/internal/interfaces/mastersetting"
	"service-songket/utils"
)

const (
	minCronIntervalMinutes = 1
	maxCronIntervalMinutes = 43200
	minCronIntervalDays    = 1
	maxCronIntervalDays    = 31
	minutesPerDay          = 24 * 60
)

type Service struct {
	repo interfacemastersetting.RepoMasterSettingInterface
}

func NewMasterSettingService(repo interfacemastersetting.RepoMasterSettingInterface) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetNewsScrapeCronSetting(ctx context.Context) (domainmastersetting.MasterSetting, error) {
	setting, err := s.repo.GetByKey(ctx, domainmastersetting.MasterSettingKeyNewsScrapeCron)
	if err != nil {
		return domainmastersetting.MasterSetting{}, err
	}
	setting.IntervalMinutes = normalizeCronIntervalMinutes(setting.IntervalMinutes)
	if strings.TrimSpace(setting.Description) == "" {
		setting.Description = "Auto scrape portal berita"
	}
	return setting, nil
}

func (s *Service) CreateNewsScrapeCronSetting(ctx context.Context, req dto.NewsScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error) {
	if _, err := s.repo.GetByKey(ctx, domainmastersetting.MasterSettingKeyNewsScrapeCron); err == nil {
		return domainmastersetting.MasterSetting{}, fmt.Errorf("news scrape cron setting already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return domainmastersetting.MasterSetting{}, err
	}

	nextInterval := req.IntervalMinutes
	nextIsActive := req.IsActive
	if nextInterval <= 0 {
		nextInterval = minCronIntervalMinutes
		nextIsActive = false
	}
	setting := domainmastersetting.MasterSetting{
		Id:              utils.CreateUUID(),
		Key:             domainmastersetting.MasterSettingKeyNewsScrapeCron,
		IsActive:        nextIsActive,
		IntervalMinutes: normalizeCronIntervalMinutes(nextInterval),
		Description:     "Auto scrape portal berita",
	}
	history := domainmastersetting.MasterSettingHistory{
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

	if err := s.repo.Transaction(ctx, func(tx interfacemastersetting.RepoMasterSettingTxInterface) error {
		if err := tx.Store(ctx, setting); err != nil {
			return err
		}
		return tx.StoreHistory(ctx, history)
	}); err != nil {
		return domainmastersetting.MasterSetting{}, err
	}
	return setting, nil
}

func (s *Service) UpdateNewsScrapeCronSetting(ctx context.Context, req dto.NewsScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error) {
	nextInterval := req.IntervalMinutes
	nextIsActive := req.IsActive
	if nextInterval <= 0 {
		nextInterval = minCronIntervalMinutes
		nextIsActive = false
	}

	setting, err := s.GetNewsScrapeCronSetting(ctx)
	if err != nil {
		return domainmastersetting.MasterSetting{}, err
	}
	previousActive := setting.IsActive
	previousInterval := normalizeCronIntervalMinutes(setting.IntervalMinutes)
	setting.IsActive = nextIsActive
	setting.IntervalMinutes = normalizeCronIntervalMinutes(nextInterval)
	if strings.TrimSpace(setting.Description) == "" {
		setting.Description = "Auto scrape portal berita"
	}

	history := domainmastersetting.MasterSettingHistory{
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

	if err := s.repo.Transaction(ctx, func(tx interfacemastersetting.RepoMasterSettingTxInterface) error {
		if err := tx.Update(ctx, setting); err != nil {
			return err
		}
		if previousActive != setting.IsActive || previousInterval != setting.IntervalMinutes {
			return tx.StoreHistory(ctx, history)
		}
		return nil
	}); err != nil {
		return domainmastersetting.MasterSetting{}, err
	}
	return setting, nil
}

func (s *Service) ListNewsScrapeCronSettingHistory(ctx context.Context, limit int) ([]domainmastersetting.MasterSettingHistory, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}
	return s.repo.ListHistoryByKey(ctx, domainmastersetting.MasterSettingKeyNewsScrapeCron, limit)
}

func (s *Service) DeleteNewsScrapeCronSetting(ctx context.Context, actorUserID, actorName string) error {
	setting, err := s.repo.GetByKey(ctx, domainmastersetting.MasterSettingKeyNewsScrapeCron)
	if err != nil {
		return err
	}
	history := domainmastersetting.MasterSettingHistory{
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
	return s.repo.Transaction(ctx, func(tx interfacemastersetting.RepoMasterSettingTxInterface) error {
		if err := tx.StoreHistory(ctx, history); err != nil {
			return err
		}
		return tx.Delete(ctx, setting.Id)
	})
}

func (s *Service) GetPriceScrapeCronSetting(ctx context.Context) (domainmastersetting.MasterSetting, error) {
	setting, err := s.repo.GetByKey(ctx, domainmastersetting.MasterSettingKeyPriceScrapeCron)
	if err != nil {
		return domainmastersetting.MasterSetting{}, err
	}
	setting.IntervalMinutes = daysToIntervalMinutes(intervalMinutesToDays(setting.IntervalMinutes))
	if strings.TrimSpace(setting.Description) == "" {
		setting.Description = "Auto scrape harga pangan"
	}
	return setting, nil
}

func (s *Service) CreatePriceScrapeCronSetting(ctx context.Context, req dto.PriceScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error) {
	if _, err := s.repo.GetByKey(ctx, domainmastersetting.MasterSettingKeyPriceScrapeCron); err == nil {
		return domainmastersetting.MasterSetting{}, fmt.Errorf("commodity price scrape cron setting already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return domainmastersetting.MasterSetting{}, err
	}

	nextDays := req.IntervalDays
	nextIsActive := req.IsActive
	if nextDays <= 0 {
		nextDays = minCronIntervalDays
		nextIsActive = false
	}
	intervalMinutes := daysToIntervalMinutes(normalizeCronIntervalDays(nextDays))
	setting := domainmastersetting.MasterSetting{
		Id:              utils.CreateUUID(),
		Key:             domainmastersetting.MasterSettingKeyPriceScrapeCron,
		IsActive:        nextIsActive,
		IntervalMinutes: intervalMinutes,
		Description:     "Auto scrape harga pangan",
	}
	history := domainmastersetting.MasterSettingHistory{
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
	if err := s.repo.Transaction(ctx, func(tx interfacemastersetting.RepoMasterSettingTxInterface) error {
		if err := tx.Store(ctx, setting); err != nil {
			return err
		}
		return tx.StoreHistory(ctx, history)
	}); err != nil {
		return domainmastersetting.MasterSetting{}, err
	}
	return setting, nil
}

func (s *Service) UpdatePriceScrapeCronSetting(ctx context.Context, req dto.PriceScrapeCronSettingRequest, actorUserID, actorName string) (domainmastersetting.MasterSetting, error) {
	nextDays := req.IntervalDays
	nextIsActive := req.IsActive
	if nextDays <= 0 {
		nextDays = minCronIntervalDays
		nextIsActive = false
	}
	intervalMinutes := daysToIntervalMinutes(normalizeCronIntervalDays(nextDays))

	setting, err := s.GetPriceScrapeCronSetting(ctx)
	if err != nil {
		return domainmastersetting.MasterSetting{}, err
	}
	previousActive := setting.IsActive
	previousMinutes := daysToIntervalMinutes(intervalMinutesToDays(setting.IntervalMinutes))
	setting.IsActive = nextIsActive
	setting.IntervalMinutes = intervalMinutes
	if strings.TrimSpace(setting.Description) == "" {
		setting.Description = "Auto scrape harga pangan"
	}
	history := domainmastersetting.MasterSettingHistory{
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
	if err := s.repo.Transaction(ctx, func(tx interfacemastersetting.RepoMasterSettingTxInterface) error {
		if err := tx.Update(ctx, setting); err != nil {
			return err
		}
		if previousActive != setting.IsActive || previousMinutes != setting.IntervalMinutes {
			return tx.StoreHistory(ctx, history)
		}
		return nil
	}); err != nil {
		return domainmastersetting.MasterSetting{}, err
	}
	return setting, nil
}

func (s *Service) ListPriceScrapeCronSettingHistory(ctx context.Context, limit int) ([]domainmastersetting.MasterSettingHistory, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}
	return s.repo.ListHistoryByKey(ctx, domainmastersetting.MasterSettingKeyPriceScrapeCron, limit)
}

func (s *Service) DeletePriceScrapeCronSetting(ctx context.Context, actorUserID, actorName string) error {
	setting, err := s.repo.GetByKey(ctx, domainmastersetting.MasterSettingKeyPriceScrapeCron)
	if err != nil {
		return err
	}
	history := domainmastersetting.MasterSettingHistory{
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
	return s.repo.Transaction(ctx, func(tx interfacemastersetting.RepoMasterSettingTxInterface) error {
		if err := tx.StoreHistory(ctx, history); err != nil {
			return err
		}
		return tx.Delete(ctx, setting.Id)
	})
}
