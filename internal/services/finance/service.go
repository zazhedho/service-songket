package servicefinance

import (
	domainfinance "service-songket/internal/domain/finance"
	interfacefinance "service-songket/internal/interfaces/finance"
	"service-songket/internal/songket"
	"service-songket/pkg/filter"

	"gorm.io/gorm"
)

type Service struct {
	legacy *songket.Service
}

func NewFinanceService(db *gorm.DB) interfacefinance.ServiceFinanceInterface {
	return &Service{legacy: songket.NewService(db)}
}

func (s *Service) DealerMetrics(dealerID string, financeCompanyID *string, dateRange domainfinance.DateRange) (map[string]interface{}, error) {
	return s.legacy.DealerMetrics(dealerID, financeCompanyID, songket.DateRange{
		From: dateRange.From,
		To:   dateRange.To,
	})
}

func (s *Service) ListMigrationReport(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	rows, total, err := s.legacy.ListFinanceMigrationReport(params, month, year)
	if err != nil {
		return nil, 0, err
	}
	return mapFinanceMigrationRows(rows), total, nil
}

func (s *Service) ListMigrationReportGroupedByFinance2(params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	rows, total, err := s.legacy.ListFinanceMigrationReportGroupedByFinance2(params, month, year)
	if err != nil {
		return nil, 0, err
	}
	return mapFinanceMigrationRows(rows), total, nil
}

func (s *Service) ListMigrationOrderInDetail(orderID string, params filter.BaseParams, month, year int) ([]domainfinance.FinanceMigrationReportItem, int64, error) {
	rows, total, err := s.legacy.ListFinanceMigrationOrderInDetail(orderID, params, month, year)
	if err != nil {
		return nil, 0, err
	}
	return mapFinanceMigrationRows(rows), total, nil
}

func mapFinanceMigrationRows(rows []songket.FinanceMigrationReportItem) []domainfinance.FinanceMigrationReportItem {
	out := make([]domainfinance.FinanceMigrationReportItem, 0, len(rows))
	for _, row := range rows {
		out = append(out, domainfinance.FinanceMigrationReportItem{
			OrderID:           row.OrderID,
			PoolingNumber:     row.PoolingNumber,
			PoolingAt:         row.PoolingAt,
			ResultAt:          row.ResultAt,
			DealerOrderTotal:  row.DealerOrderTotal,
			TransitionTotal:   row.TransitionTotal,
			DealerName:        row.DealerName,
			DealerProvince:    row.DealerProvince,
			DealerRegency:     row.DealerRegency,
			DealerDistrict:    row.DealerDistrict,
			DealerVillage:     row.DealerVillage,
			DealerAddress:     row.DealerAddress,
			ConsumerName:      row.ConsumerName,
			ConsumerPhone:     row.ConsumerPhone,
			Province:          row.Province,
			Regency:           row.Regency,
			District:          row.District,
			Village:           row.Village,
			Address:           row.Address,
			JobName:           row.JobName,
			NetIncome:         row.NetIncome,
			MotorTypeName:     row.MotorTypeName,
			InstallmentAmount: row.InstallmentAmount,
			OTR:               row.OTR,
			DPGross:           row.DPGross,
			DPPaid:            row.DPPaid,
			DPPct:             row.DPPct,
			Tenor:             row.Tenor,
			OrderResultStatus: row.OrderResultStatus,
			OrderResultNotes:  row.OrderResultNotes,
			Finance1Name:      row.Finance1Name,
			Finance1Status:    row.Finance1Status,
			Finance1Notes:     row.Finance1Notes,
			Finance2Name:      row.Finance2Name,
			Finance2Status:    row.Finance2Status,
			Finance2Notes:     row.Finance2Notes,
			TotalApproveFc2:   row.TotalApproveFc2,
			TotalRejectFc2:    row.TotalRejectFc2,
			OrderCreatedAt:    row.OrderCreatedAt,
			OrderUpdatedAt:    row.OrderUpdatedAt,
			Finance1Decision:  row.Finance1Decision,
			Finance2Decision:  row.Finance2Decision,
		})
	}
	return out
}
