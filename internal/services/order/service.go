package serviceorder

import (
	"errors"
	"fmt"
	"strings"
	"time"

	domainmotor "service-songket/internal/domain/motor"
	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	interfacedealer "service-songket/internal/interfaces/dealer"
	interfacelocation "service-songket/internal/interfaces/location"
	interfacemotor "service-songket/internal/interfaces/motor"
	interfaceorder "service-songket/internal/interfaces/order"
	sharedsvc "service-songket/internal/services/shared"
	"service-songket/pkg/filter"
	"service-songket/utils"
)

type Service struct {
	repo         interfaceorder.RepoOrderInterface
	dealerRepo   interfacedealer.RepoDealerInterface
	locationRepo interfacelocation.RepoLocationInterface
	motorRepo    interfacemotor.RepoMotorInterface
}

func NewOrderService(
	orderRepo interfaceorder.RepoOrderInterface,
	dealerRepo interfacedealer.RepoDealerInterface,
	locationRepo interfacelocation.RepoLocationInterface,
	motorRepo interfacemotor.RepoMotorInterface,
) interfaceorder.ServiceOrderInterface {
	return &Service{
		repo:         orderRepo,
		dealerRepo:   dealerRepo,
		locationRepo: locationRepo,
		motorRepo:    motorRepo,
	}
}

func (s *Service) Create(req dto.CreateOrderRequest, createdBy string, role string) (domainorder.Order, error) {
	poolingAt, err := parseTimeRequired(req.PoolingAt)
	if err != nil {
		return domainorder.Order{}, err
	}

	var resultAt *time.Time
	if req.ResultAt != nil && strings.TrimSpace(*req.ResultAt) != "" {
		rt, errTime := parseTime(req.ResultAt)
		if errTime != nil {
			return domainorder.Order{}, errTime
		}
		resultAt = &rt
	}

	dealerID := strings.TrimSpace(req.DealerID)
	if dealerID == "" {
		if defaultDealerID := strings.TrimSpace(fmt.Sprint(utils.GetEnv("DEFAULT_DEALER_ID", ""))); defaultDealerID != "" {
			dealerID = defaultDealerID
		}
	}
	if dealerID == "" {
		return domainorder.Order{}, fmt.Errorf("dealer_id is required")
	}

	dealer, err := s.dealerRepo.GetByID(dealerID)
	if err != nil {
		return domainorder.Order{}, fmt.Errorf("dealer not found")
	}

	motor, err := s.motorRepo.GetByID(req.MotorTypeID)
	if err != nil {
		return domainorder.Order{}, fmt.Errorf("motor type not found")
	}
	if err := sharedsvc.ValidateMotorTypeArea(motor, dealer.Province, dealer.Regency); err != nil {
		return domainorder.Order{}, err
	}
	if req.Installment < 0 {
		return domainorder.Order{}, fmt.Errorf("installment must be greater than or equal to 0")
	}

	province := strings.TrimSpace(req.Province)
	if province == "" {
		return domainorder.Order{}, fmt.Errorf("province is required")
	}

	otr := motor.OTR
	dpPct := 0.0
	if otr > 0 {
		dpPct = (req.DPPaid / otr) * 100
	}

	order := domainorder.Order{
		Id:            utils.CreateUUID(),
		PoolingNumber: req.PoolingNumber,
		PoolingAt:     poolingAt,
		ResultAt:      resultAt,
		DealerID:      dealerID,
		ConsumerName:  req.ConsumerName,
		ConsumerPhone: req.ConsumerPhone,
		Province:      province,
		Regency:       req.Regency,
		District:      req.District,
		Village:       req.Village,
		Address:       req.Address,
		JobID:         req.JobID,
		MotorTypeID:   req.MotorTypeID,
		Installment:   req.Installment,
		OTR:           otr,
		DPGross:       req.DPGross,
		DPPaid:        req.DPPaid,
		DPPct:         dpPct,
		Tenor:         req.Tenor,
		ResultStatus:  strings.ToLower(req.ResultStatus),
		ResultNotes:   req.ResultNotes,
		CreatedBy:     createdBy,
	}

	if err := s.repo.Transaction(func(tx interfaceorder.RepoOrderTxInterface) error {
		poolingCount, err := tx.CountByPoolingNumber(order.PoolingNumber, "")
		if err != nil {
			return err
		}
		if poolingCount >= 2 {
			return fmt.Errorf("pooling number already has maximum 2 orders")
		}

		if err := tx.CreateOrder(&order); err != nil {
			return err
		}

		firstAttempt := domainorder.OrderFinanceAttempt{
			Id:               utils.CreateUUID(),
			OrderID:          order.Id,
			FinanceCompanyID: req.FinanceCompanyID,
			AttemptNo:        1,
			Status:           strings.ToLower(req.ResultStatus),
			Notes:            req.ResultNotes,
		}
		if err := tx.CreateAttempt(&firstAttempt); err != nil {
			return err
		}

		if strings.ToLower(req.ResultStatus) == "reject" && req.FinanceCompany2ID != "" && req.ResultStatus2 != "" {
			secondAttempt := domainorder.OrderFinanceAttempt{
				Id:               utils.CreateUUID(),
				OrderID:          order.Id,
				FinanceCompanyID: req.FinanceCompany2ID,
				AttemptNo:        2,
				Status:           strings.ToLower(req.ResultStatus2),
				Notes:            req.ResultNotes2,
			}
			if err := tx.CreateAttempt(&secondAttempt); err != nil {
				return err
			}
		}

		if strings.ToLower(strings.TrimSpace(order.ResultStatus)) == "reject" {
			cloneStatus, cloneNotes := deriveCloneResult(
				order.ResultStatus,
				order.ResultNotes,
				req.ResultStatus2,
				req.ResultNotes2,
			)
			if err := s.duplicateOrderRow(tx, order, cloneStatus, cloneNotes, req.FinanceCompany2ID); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return domainorder.Order{}, err
	}

	return order, nil
}

func (s *Service) List(params filter.BaseParams, role, userID string) ([]domainorder.Order, int64, error) {
	createdBy := ""
	if role == utils.RoleDealer {
		createdBy = userID
	}
	return s.repo.GetAll(params, createdBy)
}

func (s *Service) Update(id string, req dto.UpdateOrderRequest, role, userID string) (domainorder.Order, error) {
	normalizedID, err := sharedsvc.NormalizeRequiredUUID(id, "id")
	if err != nil {
		return domainorder.Order{}, err
	}

	dealerID, err := sharedsvc.NormalizeOptionalUUID(req.DealerID, "dealer_id")
	if err != nil {
		return domainorder.Order{}, err
	}
	if req.DealerID != nil && dealerID == nil {
		return domainorder.Order{}, fmt.Errorf("dealer_id cannot be empty")
	}

	financeCompanyID, err := sharedsvc.NormalizeOptionalUUID(req.FinanceCompanyID, "finance_company_id")
	if err != nil {
		return domainorder.Order{}, err
	}
	if req.FinanceCompanyID != nil && financeCompanyID == nil {
		return domainorder.Order{}, fmt.Errorf("finance_company_id cannot be empty")
	}

	jobID, err := sharedsvc.NormalizeOptionalUUID(req.JobID, "job_id")
	if err != nil {
		return domainorder.Order{}, err
	}
	motorTypeID, err := sharedsvc.NormalizeOptionalUUID(req.MotorTypeID, "motor_type_id")
	if err != nil {
		return domainorder.Order{}, err
	}
	financeCompany2ID, err := sharedsvc.NormalizeOptionalUUID(req.FinanceCompany2ID, "finance_company2_id")
	if err != nil {
		return domainorder.Order{}, err
	}

	order, err := s.repo.GetByIDWithAttempts(normalizedID)
	if err != nil {
		return domainorder.Order{}, err
	}
	previousPrimaryStatus := strings.ToLower(strings.TrimSpace(order.ResultStatus))
	var selectedMotor *domainmotor.MotorType

	if role == utils.RoleDealer && order.CreatedBy != userID {
		return domainorder.Order{}, errors.New("dealer can only edit own orders")
	}

	if req.PoolingNumber != nil {
		order.PoolingNumber = *req.PoolingNumber
	}
	if req.PoolingAt != nil {
		if t, err := parseTime(req.PoolingAt); err != nil {
			return domainorder.Order{}, err
		} else if !t.IsZero() {
			order.PoolingAt = t
		}
	}
	if req.ResultAt != nil {
		if t, err := parseTime(req.ResultAt); err != nil {
			return domainorder.Order{}, err
		} else if !t.IsZero() {
			order.ResultAt = &t
		} else {
			order.ResultAt = nil
		}
	}
	if req.ConsumerName != nil {
		order.ConsumerName = *req.ConsumerName
	}
	if req.ConsumerPhone != nil {
		order.ConsumerPhone = *req.ConsumerPhone
	}
	if req.Province != nil {
		province := strings.TrimSpace(*req.Province)
		if province == "" {
			return domainorder.Order{}, fmt.Errorf("province cannot be empty")
		}
		order.Province = province
	}
	if dealerID != nil {
		order.DealerID = *dealerID
	}
	if req.Regency != nil {
		order.Regency = *req.Regency
	}
	if req.District != nil {
		order.District = *req.District
	}
	if req.Village != nil {
		order.Village = *req.Village
	}
	if req.Address != nil {
		order.Address = *req.Address
	}
	if jobID != nil {
		order.JobID = *jobID
	}
	if motorTypeID != nil {
		order.MotorTypeID = *motorTypeID
		motor, err := s.motorRepo.GetByID(order.MotorTypeID)
		if err != nil {
			return domainorder.Order{}, fmt.Errorf("motor type not found")
		}
		order.OTR = motor.OTR
		selectedMotor = &motor
	}
	if req.Installment != nil {
		if *req.Installment < 0 {
			return domainorder.Order{}, fmt.Errorf("installment must be greater than or equal to 0")
		}
		order.Installment = *req.Installment
	}
	if req.DPGross != nil {
		order.DPGross = *req.DPGross
	}
	if req.DPPaid != nil {
		order.DPPaid = *req.DPPaid
	}
	if order.OTR > 0 {
		order.DPPct = (order.DPPaid / order.OTR) * 100
	}
	if req.Tenor != nil {
		order.Tenor = *req.Tenor
	}
	if req.ResultStatus != nil {
		order.ResultStatus = strings.ToLower(*req.ResultStatus)
	}
	if req.ResultNotes != nil {
		order.ResultNotes = *req.ResultNotes
	}

	primaryRejected := strings.ToLower(order.ResultStatus) == "reject"

	if order.MotorTypeID != "" {
		if selectedMotor == nil {
			motor, err := s.motorRepo.GetByID(order.MotorTypeID)
			if err != nil {
				return domainorder.Order{}, fmt.Errorf("motor type not found")
			}
			selectedMotor = &motor
			if order.OTR <= 0 {
				order.OTR = motor.OTR
			}
		}

		dealer, err := s.dealerRepo.GetByID(order.DealerID)
		if err != nil {
			return domainorder.Order{}, fmt.Errorf("dealer not found")
		}
		if err := sharedsvc.ValidateMotorTypeArea(*selectedMotor, dealer.Province, dealer.Regency); err != nil {
			return domainorder.Order{}, err
		}
	}

	if err := s.repo.Transaction(func(tx interfaceorder.RepoOrderTxInterface) error {
		poolingCount, err := tx.CountByPoolingNumber(order.PoolingNumber, order.Id)
		if err != nil {
			return err
		}
		if poolingCount >= 2 {
			return fmt.Errorf("pooling number already has maximum 2 orders")
		}

		if err := tx.SaveOrder(&order); err != nil {
			return err
		}

		for _, att := range order.Attempts {
			if att.AttemptNo == 1 {
				if financeCompanyID != nil {
					att.FinanceCompanyID = *financeCompanyID
				}
				if req.ResultStatus != nil {
					att.Status = strings.ToLower(*req.ResultStatus)
				}
				if req.ResultNotes != nil {
					att.Notes = *req.ResultNotes
				}
				if err := tx.SaveAttempt(&att); err != nil {
					return err
				}
			}
			if att.AttemptNo == 2 {
				if !primaryRejected {
					if err := tx.DeleteAttempt(&att); err != nil {
						return err
					}
					continue
				}
				if req.FinanceCompany2ID != nil && financeCompany2ID == nil {
					if err := tx.DeleteAttempt(&att); err != nil {
						return err
					}
					continue
				}
				if financeCompany2ID != nil {
					att.FinanceCompanyID = *financeCompany2ID
				}
				if req.ResultStatus2 != nil && *req.ResultStatus2 != "" {
					att.Status = strings.ToLower(*req.ResultStatus2)
				}
				if req.ResultNotes2 != nil {
					att.Notes = *req.ResultNotes2
				}
				if err := tx.SaveAttempt(&att); err != nil {
					return err
				}
			}
			if att.AttemptNo >= 3 {
				if err := tx.DeleteAttempt(&att); err != nil {
					return err
				}
			}
		}

		if primaryRejected && financeCompany2ID != nil && !hasAttempt(order.Attempts, 2) {
			status2 := ""
			if req.ResultStatus2 != nil {
				status2 = strings.ToLower(*req.ResultStatus2)
			}
			newAttempt := domainorder.OrderFinanceAttempt{
				Id:               utils.CreateUUID(),
				OrderID:          order.Id,
				FinanceCompanyID: *financeCompany2ID,
				AttemptNo:        2,
				Status:           status2,
				Notes:            utils.ValueOrDefault(req.ResultNotes2, ""),
			}
			if err := tx.CreateAttempt(&newAttempt); err != nil {
				return err
			}
			order.Attempts = append(order.Attempts, newAttempt)
		}

		currentPrimaryStatus := strings.ToLower(strings.TrimSpace(order.ResultStatus))
		if currentPrimaryStatus == "reject" && previousPrimaryStatus != "reject" {
			secondStatus := ""
			secondNotes := ""
			if req.ResultStatus2 != nil {
				secondStatus = *req.ResultStatus2
			}
			if req.ResultNotes2 != nil {
				secondNotes = *req.ResultNotes2
			}
			if strings.TrimSpace(secondStatus) == "" || strings.TrimSpace(secondNotes) == "" {
				if att, ok := findAttempt(order.Attempts, 2); ok {
					if strings.TrimSpace(secondStatus) == "" {
						secondStatus = att.Status
					}
					if strings.TrimSpace(secondNotes) == "" {
						secondNotes = att.Notes
					}
				}
			}

			secondFinanceCompanyID := ""
			if financeCompany2ID != nil {
				secondFinanceCompanyID = *financeCompany2ID
			} else if att, ok := findAttempt(order.Attempts, 2); ok {
				secondFinanceCompanyID = att.FinanceCompanyID
			}

			cloneStatus, cloneNotes := deriveCloneResult(order.ResultStatus, order.ResultNotes, secondStatus, secondNotes)
			if err := s.duplicateOrderRow(tx, order, cloneStatus, cloneNotes, secondFinanceCompanyID); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return domainorder.Order{}, err
	}

	return order, nil
}

func (s *Service) Delete(id string, role, userID string) error {
	order, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	if role == utils.RoleDealer && order.CreatedBy != userID {
		return fmt.Errorf("not allowed")
	}
	if role != utils.RoleDealer && role != utils.RoleMainDealer && role != utils.RoleAdmin && role != utils.RoleSuperAdmin {
		return fmt.Errorf("not allowed")
	}

	return s.repo.Delete(id)
}

func (s *Service) duplicateOrderRow(tx interfaceorder.RepoOrderTxInterface, source domainorder.Order, cloneStatus, cloneNotes, financeCompanyID string) error {
	poolingCount, err := tx.CountByPoolingNumber(source.PoolingNumber, "")
	if err != nil {
		return err
	}
	if poolingCount >= 2 {
		return nil
	}

	status := strings.ToLower(strings.TrimSpace(cloneStatus))
	if status == "" {
		status = strings.ToLower(strings.TrimSpace(source.ResultStatus))
	}

	duplicateOrder := domainorder.Order{
		Id:            utils.CreateUUID(),
		PoolingNumber: source.PoolingNumber,
		PoolingAt:     source.PoolingAt,
		ResultAt:      source.ResultAt,
		DealerID:      source.DealerID,
		ConsumerName:  source.ConsumerName,
		ConsumerPhone: source.ConsumerPhone,
		Province:      source.Province,
		Regency:       source.Regency,
		District:      source.District,
		Village:       source.Village,
		Address:       source.Address,
		JobID:         source.JobID,
		MotorTypeID:   source.MotorTypeID,
		Installment:   source.Installment,
		OTR:           source.OTR,
		DPGross:       source.DPGross,
		DPPaid:        source.DPPaid,
		DPPct:         source.DPPct,
		Tenor:         source.Tenor,
		ResultStatus:  status,
		ResultNotes:   strings.TrimSpace(cloneNotes),
		CreatedBy:     source.CreatedBy,
	}
	if err := tx.CreateOrder(&duplicateOrder); err != nil {
		return err
	}

	financeID := strings.TrimSpace(financeCompanyID)
	if financeID == "" {
		return nil
	}

	duplicateAttempt := domainorder.OrderFinanceAttempt{
		Id:               utils.CreateUUID(),
		OrderID:          duplicateOrder.Id,
		FinanceCompanyID: financeID,
		AttemptNo:        1,
		Status:           status,
		Notes:            strings.TrimSpace(cloneNotes),
	}
	return tx.CreateAttempt(&duplicateAttempt)
}
