package handlerfinance

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	domainfinance "service-songket/internal/domain/finance"
	interfacefinance "service-songket/internal/interfaces/finance"
	"service-songket/pkg/filter"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type FinanceHandler struct {
	Service interfacefinance.ServiceFinanceInterface
}

func NewFinanceHandler(service interfacefinance.ServiceFinanceInterface) *FinanceHandler {
	return &FinanceHandler{Service: service}
}

func (h *FinanceHandler) FinanceMigrationReport(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "pooling_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistStringFilter(params.Filters, []string{"order_id", "dealer_id", "finance_1_company_id", "finance_2_company_id"})
	if v, ok := params.Filters["order_id"]; ok {
		orderID := strings.TrimSpace(fmt.Sprint(v))
		if orderID != "" {
			if _, parseErr := uuid.Parse(orderID); parseErr != nil {
				res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
				res.Error = "order_id must be a valid UUID"
				ctx.JSON(http.StatusBadRequest, res)
				return
			}
		}
	}

	month, year, ok := parseFinanceMonthYear(ctx, logID)
	if !ok {
		return
	}

	var data []domainfinance.FinanceMigrationReportItem
	var total int64
	if _, hasOrderIDFilter := params.Filters["order_id"]; hasOrderIDFilter {
		data, total, err = h.Service.ListMigrationReport(params, month, year)
	} else {
		data, total, err = h.Service.ListMigrationReportGroupedByFinance2(params, month, year)
	}
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *FinanceHandler) FinanceMigrationOrderInDetail(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	orderID, err := utils.ValidateUUID(ctx, logID)
	if err != nil {
		return
	}

	params, err := filter.GetBaseParams(ctx, "pooling_at", "desc", 10)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistStringFilter(params.Filters, []string{"finance_1_company_id"})

	month, year, ok := parseFinanceMonthYear(ctx, logID)
	if !ok {
		return
	}

	data, total, err := h.Service.ListMigrationOrderInDetail(orderID, params, month, year)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *FinanceHandler) DealerMetrics(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	fc := ctx.Query("finance_company_id")
	var fcPtr *string
	if fc != "" {
		fcPtr = &fc
	}
	dateRange := domainfinance.DateRange{}
	if from := ctx.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			dateRange.From = t
		}
	}
	if to := ctx.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			dateRange.To = t
		}
	}

	data, err := h.Service.DealerMetrics(id, fcPtr, dateRange)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logID, data)
	ctx.JSON(http.StatusOK, res)
}

func parseFinanceMonthYear(ctx *gin.Context, logID uuid.UUID) (int, int, bool) {
	month := 0
	if rawMonth := strings.TrimSpace(ctx.Query("month")); rawMonth != "" {
		parsedMonth, convErr := strconv.Atoi(rawMonth)
		if convErr != nil || parsedMonth < 1 || parsedMonth > 12 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "month must be between 1 and 12"
			ctx.JSON(http.StatusBadRequest, res)
			return 0, 0, false
		}
		month = parsedMonth
	}

	year := 0
	if rawYear := strings.TrimSpace(ctx.Query("year")); rawYear != "" {
		parsedYear, convErr := strconv.Atoi(rawYear)
		if convErr != nil || parsedYear < 1 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "year must be a valid positive number"
			ctx.JSON(http.StatusBadRequest, res)
			return 0, 0, false
		}
		year = parsedYear
	}

	return month, year, true
}
