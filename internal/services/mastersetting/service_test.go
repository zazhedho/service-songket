package servicemastersetting

import (
	"context"
	"errors"
	domainmastersetting "service-songket/internal/domain/mastersetting"
	"service-songket/internal/dto"
	interfacemastersetting "service-songket/internal/interfaces/mastersetting"
	"service-songket/pkg/filter"
	"testing"

	"gorm.io/gorm"
)

type masterSettingTxMock struct {
	storedSettings  []domainmastersetting.MasterSetting
	updatedSettings []domainmastersetting.MasterSetting
	deletedSettings []domainmastersetting.MasterSetting
	storedHistory   []domainmastersetting.MasterSettingHistory
}

func (m *masterSettingTxMock) Store(_ context.Context, setting domainmastersetting.MasterSetting) error {
	m.storedSettings = append(m.storedSettings, setting)
	return nil
}
func (m *masterSettingTxMock) GetByID(_ context.Context, id string) (domainmastersetting.MasterSetting, error) {
	for _, setting := range m.storedSettings {
		if setting.Id == id {
			return setting, nil
		}
	}
	for _, setting := range m.updatedSettings {
		if setting.Id == id {
			return setting, nil
		}
	}
	return domainmastersetting.MasterSetting{}, gorm.ErrRecordNotFound
}
func (m *masterSettingTxMock) GetAll(_ context.Context, _ filter.BaseParams) ([]domainmastersetting.MasterSetting, int64, error) {
	return nil, 0, nil
}
func (m *masterSettingTxMock) Update(_ context.Context, setting domainmastersetting.MasterSetting) error {
	m.updatedSettings = append(m.updatedSettings, setting)
	return nil
}
func (m *masterSettingTxMock) Delete(_ context.Context, id string) error {
	m.deletedSettings = append(m.deletedSettings, domainmastersetting.MasterSetting{Id: id})
	return nil
}
func (m *masterSettingTxMock) StoreHistory(_ context.Context, history domainmastersetting.MasterSettingHistory) error {
	m.storedHistory = append(m.storedHistory, history)
	return nil
}

type masterSettingRepoMock struct {
	settings map[string]domainmastersetting.MasterSetting
	history  []domainmastersetting.MasterSettingHistory
	tx       *masterSettingTxMock
}

func (m *masterSettingRepoMock) GetByKey(_ context.Context, key string) (domainmastersetting.MasterSetting, error) {
	setting, ok := m.settings[key]
	if !ok {
		return domainmastersetting.MasterSetting{}, gorm.ErrRecordNotFound
	}
	return setting, nil
}
func (m *masterSettingRepoMock) Store(_ context.Context, setting domainmastersetting.MasterSetting) error {
	m.settings[setting.Key] = setting
	return nil
}
func (m *masterSettingRepoMock) GetByID(_ context.Context, id string) (domainmastersetting.MasterSetting, error) {
	for _, setting := range m.settings {
		if setting.Id == id {
			return setting, nil
		}
	}
	return domainmastersetting.MasterSetting{}, gorm.ErrRecordNotFound
}
func (m *masterSettingRepoMock) GetAll(_ context.Context, _ filter.BaseParams) ([]domainmastersetting.MasterSetting, int64, error) {
	return nil, 0, nil
}
func (m *masterSettingRepoMock) Update(_ context.Context, setting domainmastersetting.MasterSetting) error {
	m.settings[setting.Key] = setting
	return nil
}
func (m *masterSettingRepoMock) Delete(_ context.Context, id string) error {
	for key, setting := range m.settings {
		if setting.Id == id {
			delete(m.settings, key)
			break
		}
	}
	return nil
}
func (m *masterSettingRepoMock) StoreHistory(_ context.Context, history domainmastersetting.MasterSettingHistory) error {
	m.history = append(m.history, history)
	return nil
}
func (m *masterSettingRepoMock) ListHistoryByKey(_ context.Context, key string, limit int) ([]domainmastersetting.MasterSettingHistory, error) {
	return append([]domainmastersetting.MasterSettingHistory{}, m.history...), nil
}
func (m *masterSettingRepoMock) Transaction(_ context.Context, fn func(tx interfacemastersetting.RepoMasterSettingTxInterface) error) error {
	if m.tx == nil {
		m.tx = &masterSettingTxMock{}
	}
	return fn(m.tx)
}

func TestCreateNewsScrapeCronSettingNormalizesZeroIntervalToInactiveMinimum(t *testing.T) {
	repo := &masterSettingRepoMock{settings: map[string]domainmastersetting.MasterSetting{}}
	service := NewMasterSettingService(repo)

	setting, err := service.CreateNewsScrapeCronSetting(context.Background(), dto.NewsScrapeCronSettingRequest{
		IsActive:        true,
		IntervalMinutes: 0,
	}, "", "")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if setting.IsActive {
		t.Fatal("expected setting to be forced inactive when interval is zero")
	}
	if setting.IntervalMinutes != 1 {
		t.Fatalf("expected minimum interval 1, got %d", setting.IntervalMinutes)
	}
	if repo.tx == nil || len(repo.tx.storedHistory) != 1 {
		t.Fatalf("expected one history entry, got %+v", repo.tx)
	}
}

func TestUpdateNewsScrapeCronSettingSkipsHistoryWhenNoEffectiveChange(t *testing.T) {
	repo := &masterSettingRepoMock{
		settings: map[string]domainmastersetting.MasterSetting{
			domainmastersetting.MasterSettingKeyNewsScrapeCron: {
				Id:              "setting-1",
				Key:             domainmastersetting.MasterSettingKeyNewsScrapeCron,
				IsActive:        false,
				IntervalMinutes: 1,
			},
		},
	}
	service := NewMasterSettingService(repo)

	_, err := service.UpdateNewsScrapeCronSetting(context.Background(), dto.NewsScrapeCronSettingRequest{
		IsActive:        false,
		IntervalMinutes: 1,
	}, "11111111-1111-1111-1111-111111111111", "Admin")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if repo.tx == nil || len(repo.tx.storedHistory) != 0 {
		t.Fatalf("expected no history entry for no-op update, got %+v", repo.tx)
	}
}

func TestGetPriceScrapeCronSettingConvertsMinutesToRoundedDays(t *testing.T) {
	repo := &masterSettingRepoMock{
		settings: map[string]domainmastersetting.MasterSetting{
			domainmastersetting.MasterSettingKeyPriceScrapeCron: {
				Id:              "setting-1",
				Key:             domainmastersetting.MasterSettingKeyPriceScrapeCron,
				IntervalMinutes: 1500,
			},
		},
	}
	service := NewMasterSettingService(repo)

	setting, err := service.GetPriceScrapeCronSetting(context.Background())
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if setting.IntervalMinutes != 2*24*60 {
		t.Fatalf("expected rounded 2 days in minutes, got %d", setting.IntervalMinutes)
	}
}

func TestNormalizeHistoryActorUserIDRejectsInvalidUUID(t *testing.T) {
	if got := normalizeHistoryActorUserID("not-a-uuid"); got != nil {
		t.Fatalf("expected nil for invalid uuid, got %v", *got)
	}
}

func TestDeletePriceScrapeCronSettingReturnsNotFound(t *testing.T) {
	service := NewMasterSettingService(&masterSettingRepoMock{settings: map[string]domainmastersetting.MasterSetting{}})
	err := service.DeletePriceScrapeCronSetting(context.Background(), "", "")
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected not found, got %v", err)
	}
}
