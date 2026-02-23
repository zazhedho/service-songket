package songket

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"starter-kit/pkg/filter"
	"starter-kit/pkg/logger"
	"starter-kit/pkg/messages"
	"starter-kit/pkg/response"
	"starter-kit/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	svc *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{svc: s}
}

// POST /api/songket/orders
func (h *Handler) CreateOrder(ctx *gin.Context) {
	var req CreateOrderRequest
	logId := utils.GenerateLogId(ctx)
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userId := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	data, err := h.svc.CreateOrder(req, userId, role)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusCreated, "order created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

// GET /api/songket/orders
func (h *Handler) ListOrders(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, _ := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"dealer_id", "finance_company_id", "status"})

	auth := utils.GetAuthData(ctx)
	userId := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	data, total, err := h.svc.ListOrders(params, role, userId)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/dashboard/orders
func (h *Handler) DashboardOrders(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 5)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"dealer_id", "finance_company_id", "status"})

	auth := utils.GetAuthData(ctx)
	userId := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	data, total, err := h.svc.ListOrders(params, role, userId)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// PUT /api/songket/orders/:id
func (h *Handler) UpdateOrder(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}
	var req UpdateOrderRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	auth := utils.GetAuthData(ctx)
	userId := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	data, err := h.svc.UpdateOrder(id, req, role, userId)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "order updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/orders/:id
func (h *Handler) DeleteOrder(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	auth := utils.GetAuthData(ctx)
	userId := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	if err := h.svc.DeleteOrder(id, role, userId); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "order deleted", logId, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/finance/dealers
func (h *Handler) Dealers(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "name", "asc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"province", "regency", "district"})

	data, total, err := h.svc.ListDealers(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/finance/companies
func (h *Handler) FinanceCompanies(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "name", "asc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"province", "regency", "district"})

	data, total, err := h.svc.ListFinanceCompanies(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/finance/report/migrations
func (h *Handler) FinanceMigrationReport(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "pooling_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistStringFilter(params.Filters, []string{"order_id", "dealer_id", "finance_1_company_id", "finance_2_company_id"})
	if v, ok := params.Filters["order_id"]; ok {
		orderID := strings.TrimSpace(fmt.Sprint(v))
		if orderID != "" {
			if _, parseErr := uuid.Parse(orderID); parseErr != nil {
				res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
				res.Error = "order_id must be a valid UUID"
				ctx.JSON(http.StatusBadRequest, res)
				return
			}
		}
	}

	month := 0
	if rawMonth := strings.TrimSpace(ctx.Query("month")); rawMonth != "" {
		parsedMonth, convErr := strconv.Atoi(rawMonth)
		if convErr != nil || parsedMonth < 1 || parsedMonth > 12 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
			res.Error = "month must be between 1 and 12"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		month = parsedMonth
	}

	year := 0
	if rawYear := strings.TrimSpace(ctx.Query("year")); rawYear != "" {
		parsedYear, convErr := strconv.Atoi(rawYear)
		if convErr != nil || parsedYear < 1 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
			res.Error = "year must be a valid positive number"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		year = parsedYear
	}

	var data []FinanceMigrationReportItem
	var total int64
	if _, hasOrderIDFilter := params.Filters["order_id"]; hasOrderIDFilter {
		data, total, err = h.svc.ListFinanceMigrationReport(params, month, year)
	} else {
		data, total, err = h.svc.ListFinanceMigrationReportGroupedByFinance2(params, month, year)
	}
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/finance/report/migrations/:id/order-ins
func (h *Handler) FinanceMigrationOrderInDetail(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	orderID, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}

	params, err := filter.GetBaseParams(ctx, "pooling_at", "desc", 10)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistStringFilter(params.Filters, []string{"finance_1_company_id"})

	month := 0
	if rawMonth := strings.TrimSpace(ctx.Query("month")); rawMonth != "" {
		parsedMonth, convErr := strconv.Atoi(rawMonth)
		if convErr != nil || parsedMonth < 1 || parsedMonth > 12 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
			res.Error = "month must be between 1 and 12"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		month = parsedMonth
	}

	year := 0
	if rawYear := strings.TrimSpace(ctx.Query("year")); rawYear != "" {
		parsedYear, convErr := strconv.Atoi(rawYear)
		if convErr != nil || parsedYear < 1 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
			res.Error = "year must be a valid positive number"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		year = parsedYear
	}

	data, total, err := h.svc.ListFinanceMigrationOrderInDetail(orderID, params, month, year)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/finance/dealers
func (h *Handler) CreateDealer(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req DealerRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.CreateDealer(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "created", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// PUT /api/songket/finance/dealers/:id
func (h *Handler) UpdateDealer(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}
	var req DealerRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.UpdateDealer(id, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/finance/dealers/:id
func (h *Handler) DeleteDealer(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	if err := h.svc.DeleteDealer(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/finance/companies
func (h *Handler) CreateFinanceCompany(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req FinanceCompanyRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.CreateFinanceCompany(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "created", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// PUT /api/songket/finance/companies/:id
func (h *Handler) UpdateFinanceCompany(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}
	var req FinanceCompanyRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.UpdateFinanceCompany(id, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/finance/companies/:id
func (h *Handler) DeleteFinanceCompany(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	if err := h.svc.DeleteFinanceCompany(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/motor-types
func (h *Handler) ListMotorTypes(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"province_code", "regency_code"})

	data, total, err := h.svc.ListMotorTypes(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/motor-types/:id
func (h *Handler) GetMotorTypeByID(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.GetMotorTypeByID(id)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/motor-types
func (h *Handler) CreateMotorType(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req MotorTypeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.CreateMotorType(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

// PUT /api/songket/motor-types/:id
func (h *Handler) UpdateMotorType(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}
	var req MotorTypeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.UpdateMotorType(id, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/motor-types/:id
func (h *Handler) DeleteMotorType(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	if err := h.svc.DeleteMotorType(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/installments
func (h *Handler) ListInstallments(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"motor_type_id", "province_code", "regency_code"})

	data, total, err := h.svc.ListInstallments(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/installments/:id
func (h *Handler) GetInstallmentByID(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.GetInstallmentByID(id)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/installments
func (h *Handler) CreateInstallment(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req InstallmentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.CreateInstallment(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

// PUT /api/songket/installments/:id
func (h *Handler) UpdateInstallment(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}
	var req InstallmentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.UpdateInstallment(id, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/installments/:id
func (h *Handler) DeleteInstallment(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	if err := h.svc.DeleteInstallment(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/master-settings/news-scrape-cron
func (h *Handler) GetNewsScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.svc.GetNewsScrapeCronMasterSetting()
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/master-settings/news-scrape-cron
func (h *Handler) CreateNewsScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req NewsScrapeCronSettingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	username := utils.InterfaceString(auth["username"])

	data, err := h.svc.CreateNewsScrapeCronMasterSetting(req, userID, username)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

// PUT /api/songket/master-settings/news-scrape-cron
func (h *Handler) UpdateNewsScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req NewsScrapeCronSettingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	username := utils.InterfaceString(auth["username"])

	data, err := h.svc.UpdateNewsScrapeCronMasterSetting(req, userID, username)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/master-settings/news-scrape-cron/history
func (h *Handler) GetNewsScrapeCronSettingHistory(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	limitRaw := ctx.DefaultQuery("limit", "100")
	limit, err := strconv.Atoi(limitRaw)
	if err != nil {
		limit = 100
	}

	data, err := h.svc.ListNewsScrapeCronSettingHistory(limit)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/master-settings/news-scrape-cron
func (h *Handler) DeleteNewsScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	username := utils.InterfaceString(auth["username"])

	if err := h.svc.DeleteNewsScrapeCronMasterSetting(userID, username); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"key": MasterSettingKeyNewsScrapeCron})
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/master-settings/prices-scrape-cron
func (h *Handler) GetPriceScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.svc.GetPriceScrapeCronMasterSetting()
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/master-settings/prices-scrape-cron
func (h *Handler) CreatePriceScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req PriceScrapeCronSettingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	username := utils.InterfaceString(auth["username"])

	data, err := h.svc.CreatePriceScrapeCronMasterSetting(req, userID, username)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

// PUT /api/songket/master-settings/prices-scrape-cron
func (h *Handler) UpdatePriceScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req PriceScrapeCronSettingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	username := utils.InterfaceString(auth["username"])

	data, err := h.svc.UpdatePriceScrapeCronMasterSetting(req, userID, username)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/master-settings/prices-scrape-cron/history
func (h *Handler) GetPriceScrapeCronSettingHistory(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	limitRaw := ctx.DefaultQuery("limit", "100")
	limit, err := strconv.Atoi(limitRaw)
	if err != nil {
		limit = 100
	}

	data, err := h.svc.ListPriceScrapeCronSettingHistory(limit)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/master-settings/prices-scrape-cron
func (h *Handler) DeletePriceScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	username := utils.InterfaceString(auth["username"])

	if err := h.svc.DeletePriceScrapeCronMasterSetting(userID, username); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"key": MasterSettingKeyPriceScrapeCron})
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/jobs
func (h *Handler) ListJobs(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "name", "asc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"name"})

	data, total, err := h.svc.ListJobs(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/jobs/:id
func (h *Handler) GetJobByID(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.GetJobByID(id)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/jobs
func (h *Handler) CreateJob(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req JobRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.CreateJob(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

// PUT /api/songket/jobs/:id
func (h *Handler) UpdateJob(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}
	var req JobRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.UpdateJob(id, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/jobs/:id
func (h *Handler) DeleteJob(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	if err := h.svc.DeleteJob(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/net-income
func (h *Handler) ListNetIncomes(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"job_id"})

	data, total, err := h.svc.ListNetIncomes(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/net-income/:id
func (h *Handler) GetNetIncomeByID(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.GetNetIncomeByID(id)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/net-income
func (h *Handler) CreateNetIncome(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req NetIncomeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.CreateNetIncome(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

// PUT /api/songket/net-income/:id
func (h *Handler) UpdateNetIncome(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}
	var req NetIncomeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.UpdateNetIncome(id, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/net-income/:id
func (h *Handler) DeleteNetIncome(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	if err := h.svc.DeleteNetIncome(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/finance/dealers/:id/metrics
func (h *Handler) DealerMetrics(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	fc := ctx.Query("finance_company_id")
	var fcPtr *string
	if fc != "" {
		fcPtr = &fc
	}
	dr := DateRange{}
	if from := ctx.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			dr.From = t
		}
	}
	if to := ctx.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			dr.To = t
		}
	}

	data, err := h.svc.DealerMetrics(id, fcPtr, dr)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/credit
func (h *Handler) UpsertCredit(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req CreditCapabilityRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.UpsertCreditCapability(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "saved", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/credit
func (h *Handler) ListCredit(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "updated_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"job_id", "province", "regency", "district"})

	data, total, err := h.svc.ListCreditCapabilities(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/credit/worksheet
func (h *Handler) CreditWorksheet(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	province := strings.TrimSpace(ctx.Query("province"))
	regency := strings.TrimSpace(ctx.Query("regency"))

	data, err := h.svc.CreditCapabilityWorksheet(province, regency)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/quadrants/summary (order-in% vs credit capability)
func (h *Handler) QuadrantSummary(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.svc.QuadrantSummaryFlow()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/credit/summary
func (h *Handler) CreditSummary(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	threshold := utils.GetEnv("CREDIT_ORDER_THRESHOLD", 5).(int)
	data, err := h.svc.CreditCapabilitySummary(int64(threshold))
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/quadrants/recompute
func (h *Handler) RecomputeQuadrants(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req QuadrantComputeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.RecomputeQuadrants(req)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "recomputed", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/quadrants
func (h *Handler) ListQuadrants(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "computed_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"job_id", "regency", "quadrant", "credit_score"})

	data, total, err := h.svc.ListQuadrants(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/news/sources
func (h *Handler) UpsertNewsSource(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req NewsSourceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.UpsertNewsSource(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "saved", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/news/sources
func (h *Handler) ListNewsSources(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"category"})

	data, total, err := h.svc.ListNewsSources(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/news/latest
func (h *Handler) LatestNews(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	category := ctx.Query("category")
	data, err := h.svc.LatestNews(category)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/dashboard/news-items
func (h *Handler) DashboardNewsItems(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	category := ctx.Query("category")
	params, err := filter.GetBaseParams(ctx, "published_at", "desc", 5)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"source_id", "source_name"})

	data, total, err := h.svc.ListNewsItems(category, params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/news/items
func (h *Handler) ListNewsItems(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	category := ctx.Query("category")
	params, err := filter.GetBaseParams(ctx, "published_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"source_id", "source_name"})

	data, total, err := h.svc.ListNewsItems(category, params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/news/items/:id
func (h *Handler) DeleteNewsItem(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if err := h.svc.DeleteNewsItem(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, nil)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/news/scrape
func (h *Handler) ScrapeNews(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		Urls []string `json:"urls"`
	}
	_ = ctx.ShouldBindJSON(&req)

	var (
		data []NewsScrapedArticle
		err  error
	)
	if len(req.Urls) > 0 {
		data, err = h.svc.ScrapeNewsFromUrls(ctx.Request.Context(), req.Urls)
	} else {
		data, err = h.svc.ScrapeNews(ctx.Request.Context())
	}
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "scraped", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/news/import
func (h *Handler) ImportNews(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		Items []NewsScrapedArticle `json:"items" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	if len(req.Items) == 0 {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "items is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.svc.ImportScrapedNews(req.Items)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "imported", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/commodities
func (h *Handler) UpsertCommodity(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req CommodityRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.UpsertCommodity(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "saved", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/commodities/price
func (h *Handler) AddPrice(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req CommodityPriceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	data, err := h.svc.AddCommodityPrice(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "saved", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/commodities/prices/latest
func (h *Handler) LatestPrices(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.svc.LatestCommodityPrices()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/dashboard/prices
func (h *Handler) DashboardPrices(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "collected_at", "desc", 5)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"commodity_id"})

	data, total, err := h.svc.ListCommodityPrices(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/commodities
func (h *Handler) ListCommodities(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.svc.ListCommodities()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/commodities/prices
func (h *Handler) ListPrices(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "collected_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"commodity_id"})

	data, total, err := h.svc.ListCommodityPrices(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/commodities/prices/:id
func (h *Handler) DeletePrice(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if err := h.svc.DeleteCommodityPrice(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, nil)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/lookups
func (h *Handler) Lookups(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.svc.Lookups()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/commodities/prices/scrape
func (h *Handler) ScrapePrices(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		Urls []string `json:"urls"`
	}
	_ = ctx.ShouldBindJSON(&req)
	url := os.Getenv("SCRAPE_PANGAN_URL")
	if len(req.Urls) == 0 && url != "" {
		req.Urls = []string{url}
	}
	data, err := h.svc.ScrapeFromSources(context.Background(), req.Urls)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "scraped", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/commodities/prices/scrape-jobs
func (h *Handler) CreateScrapeJob(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		Urls []string `json:"urls"`
	}
	_ = ctx.ShouldBindJSON(&req)
	job, err := h.svc.StartScrapeJob(req.Urls, "prices")
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "job created", logId, job)
	ctx.JSON(http.StatusCreated, res)
}

// GET /api/songket/commodities/prices/jobs
func (h *Handler) ListScrapeJobs(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"status"})

	data, total, err := h.svc.ListScrapeJobs(params)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/commodities/prices/jobs/:id/results
func (h *Handler) ListScrapeResults(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	params, err := filter.GetBaseParams(ctx, "scraped_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"source_url"})

	data, total, err := h.svc.ListScrapeResults(id, params)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/commodities/prices/jobs/:id/commit
func (h *Handler) CommitScrapeResults(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	var req struct {
		ResultIDs []string `json:"result_ids" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.svc.CommitScrapeResults(id, req.ResultIDs)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "imported", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// CRUD scrape sources
func (h *Handler) ListScrapeSources(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"type", "category"})

	sources, total, err := h.svc.ListScrapeSources(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, sources)
	ctx.JSON(http.StatusOK, res)
}

func (h *Handler) CreateScrapeSource(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req ScrapeSource
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	if req.Type == "" {
		req.Type = "prices"
	}
	req.Id = utils.CreateUUID()
	if req.IsActive {
		_ = h.svc.db.Model(&ScrapeSource{}).Where("type = ?", req.Type).Update("is_active", false)
	}
	if err := h.svc.db.Create(&req).Error; err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, req)
	ctx.JSON(http.StatusCreated, res)
}

func (h *Handler) UpdateScrapeSource(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}
	var req ScrapeSource
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	req.Id = id
	if req.Type == "" {
		req.Type = "prices"
	}
	if req.IsActive {
		_ = h.svc.db.Model(&ScrapeSource{}).Where("type = ? AND id <> ?", req.Type, id).Update("is_active", false)
	}
	if err := h.svc.db.Model(&ScrapeSource{}).Where("id = ?", id).Updates(req).Error; err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, req)
	ctx.JSON(http.StatusOK, res)
}

func (h *Handler) DeleteScrapeSource(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if err := h.svc.db.Delete(&ScrapeSource{}, "id = ?", id).Error; err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, nil)
	ctx.JSON(http.StatusOK, res)
}

func init() {
	logger.WriteLog(logger.LogLevelDebug, "[songket] handler loaded")
}
