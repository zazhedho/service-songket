package servicelookup

import (
	"context"
	domaindealer "service-songket/internal/domain/dealer"
	domainfinancecompany "service-songket/internal/domain/financecompany"
	domaininstallment "service-songket/internal/domain/installment"
	domainjob "service-songket/internal/domain/job"
	domainlocation "service-songket/internal/domain/location"
	domainmotor "service-songket/internal/domain/motor"
	"testing"
)

type lookupRepoMock struct {
	dealers []domaindealer.Dealer
}

func (m *lookupRepoMock) ListFinanceCompanies() ([]domainfinancecompany.FinanceCompany, error) {
	return []domainfinancecompany.FinanceCompany{{Id: "fc-1"}}, nil
}
func (m *lookupRepoMock) ListMotorTypes() ([]domainmotor.MotorType, error) {
	return []domainmotor.MotorType{{Id: "motor-1"}}, nil
}
func (m *lookupRepoMock) ListInstallments() ([]domaininstallment.Installment, error) {
	return []domaininstallment.Installment{{Id: "ins-1"}}, nil
}
func (m *lookupRepoMock) ListJobs() ([]domainjob.Job, error) {
	return []domainjob.Job{{Id: "job-1"}}, nil
}
func (m *lookupRepoMock) ListDealers() ([]domaindealer.Dealer, error) {
	return append([]domaindealer.Dealer{}, m.dealers...), nil
}
func (m *lookupRepoMock) ListOrderYears() ([]int, error) { return []int{2025, 2026}, nil }

type locationServiceMock struct {
	cityMap map[string][]domainlocation.LocationItem
}

func (m *locationServiceMock) GetProvince(ctx context.Context, year string) ([]domainlocation.LocationItem, error) {
	return nil, nil
}
func (m *locationServiceMock) GetCity(ctx context.Context, year, provinceCode string) ([]domainlocation.LocationItem, error) {
	return append([]domainlocation.LocationItem{}, m.cityMap[provinceCode]...), nil
}
func (m *locationServiceMock) GetDistrict(ctx context.Context, year, provinceCode, cityCode string) ([]domainlocation.LocationItem, error) {
	return nil, nil
}

func TestBuildDashboardAreaOptionsMapsNumericRegenciesAndSkipsDuplicates(t *testing.T) {
	service := NewLookupService(&lookupRepoMock{}, &locationServiceMock{
		cityMap: map[string][]domainlocation.LocationItem{
			"52": {
				{Code: "5201", Name: "Mataram"},
				{Code: "5203", Name: "Lombok Timur"},
			},
		},
	}).(*Service)

	options := service.buildDashboardAreaOptions([]domaindealer.Dealer{
		{Province: "52", Regency: "5203"},
		{Province: "52", Regency: "5203"},
		{Province: "52", Regency: "Mataram"},
		{Province: "52", Regency: "all area"},
	})

	if len(options) != 2 {
		t.Fatalf("expected 2 dashboard areas, got %d", len(options))
	}
	if options[0].Label != "Lombok Timur" || options[1].Label != "Mataram" {
		t.Fatalf("expected sorted mapped labels, got %+v", options)
	}
}

func TestGetAllIncludesRegenciesDerivedFromDashboardAreas(t *testing.T) {
	service := NewLookupService(&lookupRepoMock{
		dealers: []domaindealer.Dealer{
			{Province: "52", Regency: "5203"},
		},
	}, &locationServiceMock{
		cityMap: map[string][]domainlocation.LocationItem{
			"52": {{Code: "5203", Name: "Lombok Timur"}},
		},
	}).(*Service)

	result, err := service.GetAll()
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}

	regencies := result["regencies"].([]string)
	if len(regencies) != 1 || regencies[0] != "Lombok Timur" {
		t.Fatalf("expected mapped regencies list, got %+v", regencies)
	}
}
