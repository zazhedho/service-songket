package servicemastersetting

import (
	"errors"
	domainmastersetting "service-songket/internal/domain/mastersetting"
	"service-songket/internal/dto"
	interfacemastersetting "service-songket/internal/interfaces/mastersetting"
	"testing"

	"gorm.io/gorm"
)

type masterSettingTxMock struct {
	storedSettings  []domainmastersetting.MasterSetting
	updatedSettings []domainmastersetting.MasterSetting
	deletedSettings []domainmastersetting.MasterSetting
	storedHistory   []domainmastersetting.MasterSettingHistory
}

func (m *masterSettingTxMock) Store(setting domainmastersetting.MasterSetting) error {
	m.storedSettings = append(m.storedSettings, setting)
	return nil
}
func (m *masterSettingTxMock) Update(setting domainmastersetting.MasterSetting) error {
	m.updatedSettings = append(m.updatedSettings, setting)
	return nil
}
func (m *masterSettingTxMock) Delete(setting domainmastersetting.MasterSetting) error {
	m.deletedSettings = append(m.deletedSettings, setting)
	return nil
}
func (m *masterSettingTxMock) StoreHistory(history domainmastersetting.MasterSettingHistory) error {
	m.storedHistory = append(m.storedHistory, history)
	return nil
}

type masterSettingRepoMock struct {
	settings map[string]domainmastersetting.MasterSetting
	history  []domainmastersetting.MasterSettingHistory
	tx       *masterSettingTxMock
}

func (m *masterSettingRepoMock) GetByKey(key string) (domainmastersetting.MasterSetting, error) {
	setting, ok := m.settings[key]
	if !ok {
		return domainmastersetting.MasterSetting{}, gorm.ErrRecordNotFound
	}
	return setting, nil
}
func (m *masterSettingRepoMock) Store(setting domainmastersetting.MasterSetting) error  { return nil }
func (m *masterSettingRepoMock) Update(setting domainmastersetting.MasterSetting) error { return nil }
func (m *masterSettingRepoMock) Delete(setting domainmastersetting.MasterSetting) error { return nil }
func (m *masterSettingRepoMock) StoreHistory(history domainmastersetting.MasterSettingHistory) error {
	m.history = append(m.history, history)
	return nil
}
func (m *masterSettingRepoMock) ListHistoryByKey(key string, limit int) ([]domainmastersetting.MasterSettingHistory, error) {
	return append([]domainmastersetting.MasterSettingHistory{}, m.history...), nil
}
func (m *masterSettingRepoMock) Transaction(fn func(tx interfacemastersetting.RepoMasterSettingTxInterface) error) error {
	if m.tx == nil {
		m.tx = &masterSettingTxMock{}
	}
	return fn(m.tx)
}

func TestCreateNewsScrapeCronSettingNormalizesZeroIntervalToInactiveMinimum(t *testing.T) {
	repo := &masterSettingRepoMock{settings: map[string]domainmastersetting.MasterSetting{}}
	service := NewMasterSettingService(repo)

	setting, err := service.CreateNewsScrapeCronSetting(dto.NewsScrapeCronSettingRequest{
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

	_, err := service.UpdateNewsScrapeCronSetting(dto.NewsScrapeCronSettingRequest{
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

	setting, err := service.GetPriceScrapeCronSetting()
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
	err := service.DeletePriceScrapeCronSetting("", "")
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected not found, got %v", err)
	}
}
