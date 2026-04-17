package servicelookup

import (
	"context"
	"sort"
	"strings"

	domaindealer "service-songket/internal/domain/dealer"
	domainlookup "service-songket/internal/domain/lookup"
	interfacelocation "service-songket/internal/interfaces/location"
	interfacelookup "service-songket/internal/interfaces/lookup"
)

type Service struct {
	repo            interfacelookup.RepoLookupInterface
	locationService interfacelocation.ServiceLocationInterface
}

func NewLookupService(
	repo interfacelookup.RepoLookupInterface,
	locationService interfacelocation.ServiceLocationInterface,
) interfacelookup.ServiceLookupInterface {
	return &Service{
		repo:            repo,
		locationService: locationService,
	}
}

func (s *Service) GetAll() (map[string]interface{}, error) {
	fcs, err := s.repo.ListFinanceCompanies()
	if err != nil {
		return nil, err
	}
	motors, err := s.repo.ListMotorTypes()
	if err != nil {
		return nil, err
	}
	installments, err := s.repo.ListInstallments()
	if err != nil {
		return nil, err
	}
	jobs, err := s.repo.ListJobs()
	if err != nil {
		return nil, err
	}
	dealers, err := s.repo.ListDealers()
	if err != nil {
		return nil, err
	}
	years, err := s.repo.ListOrderYears()
	if err != nil {
		return nil, err
	}

	dashboardAreas := s.buildDashboardAreaOptions(dealers)
	regencies := make([]string, 0, len(dashboardAreas))
	for _, area := range dashboardAreas {
		if strings.TrimSpace(area.Label) == "" {
			continue
		}
		regencies = append(regencies, area.Label)
	}

	return map[string]interface{}{
		"finance_companies": fcs,
		"motor_types":       motors,
		"installments":      installments,
		"jobs":              jobs,
		"dealers":           dealers,
		"regencies":         regencies,
		"dashboard_areas":   dashboardAreas,
		"dashboard_years":   years,
	}, nil
}

func (s *Service) buildDashboardAreaOptions(dealers []domaindealer.Dealer) []domainlookup.DashboardAreaOption {
	if len(dealers) == 0 {
		return []domainlookup.DashboardAreaOption{}
	}

	provinceSet := map[string]struct{}{}
	for _, dealer := range dealers {
		province := strings.TrimSpace(dealer.Province)
		if province == "" {
			continue
		}
		provinceSet[province] = struct{}{}
	}

	kabupatenCodeToName := map[string]string{}
	if len(provinceSet) > 0 && s.locationService != nil {
		ctx := context.Background()
		for province := range provinceSet {
			items, err := s.locationService.GetCity(ctx, "", province)
			if err != nil {
				continue
			}
			for _, item := range items {
				code := strings.ToLower(strings.TrimSpace(item.Code))
				name := strings.TrimSpace(item.Name)
				if code == "" || name == "" {
					continue
				}
				if _, exists := kabupatenCodeToName[code]; !exists {
					kabupatenCodeToName[code] = name
				}
			}
		}
	}

	optionByValue := map[string]domainlookup.DashboardAreaOption{}
	for _, dealer := range dealers {
		rawRegency := strings.TrimSpace(dealer.Regency)
		if rawRegency == "" {
			continue
		}

		value := strings.ToLower(rawRegency)
		if value == "" {
			continue
		}

		label := rawRegency
		if isNumericAreaCode(rawRegency) {
			mapped := strings.TrimSpace(kabupatenCodeToName[value])
			if mapped == "" {
				continue
			}
			label = mapped
		}
		if strings.EqualFold(label, "all area") {
			continue
		}
		if _, exists := optionByValue[value]; exists {
			continue
		}
		optionByValue[value] = domainlookup.DashboardAreaOption{
			Value: value,
			Label: label,
		}
	}

	options := make([]domainlookup.DashboardAreaOption, 0, len(optionByValue))
	for _, item := range optionByValue {
		options = append(options, item)
	}
	sort.Slice(options, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(options[i].Label))
		right := strings.ToLower(strings.TrimSpace(options[j].Label))
		return left < right
	})

	return options
}
