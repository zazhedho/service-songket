package handlerorder

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	domainorder "service-songket/internal/domain/order"
	"service-songket/internal/dto"
	interfaceorder "service-songket/internal/interfaces/order"
	"service-songket/pkg/filter"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type OrderHandler struct {
	Service interfaceorder.ServiceOrderInterface
}

func NewOrderHandler(service interfaceorder.ServiceOrderInterface) *OrderHandler {
	return &OrderHandler{Service: service}
}

func (h *OrderHandler) Create(ctx *gin.Context) {
	var req dto.CreateOrderRequest
	logID := utils.GenerateLogId(ctx)
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	data, err := h.Service.Create(req, userID, role)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusCreated, "order created", logID, data)
	ctx.JSON(http.StatusCreated, res)
}

func (h *OrderHandler) GetAll(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	params, _ := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	params.Filters = filter.WhitelistStringFilter(params.Filters, []string{"dealer_id", "finance_company_id", "status", "from_date", "to_date"})

	fromDate := strings.TrimSpace(ctx.Query("from_date"))
	toDate := strings.TrimSpace(ctx.Query("to_date"))
	if fromDate == "" {
		if v, ok := params.Filters["from_date"]; ok && v != nil {
			fromDate = strings.TrimSpace(fmt.Sprint(v))
		}
	}
	if toDate == "" {
		if v, ok := params.Filters["to_date"]; ok && v != nil {
			toDate = strings.TrimSpace(fmt.Sprint(v))
		}
	}
	if strings.EqualFold(fromDate, "<nil>") {
		fromDate = ""
	}
	if strings.EqualFold(toDate, "<nil>") {
		toDate = ""
	}

	if fromDate != "" {
		if _, err := time.Parse("2006-01-02", fromDate); err != nil {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "from_date must use YYYY-MM-DD format"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
	}
	if toDate != "" {
		if _, err := time.Parse("2006-01-02", toDate); err != nil {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "to_date must use YYYY-MM-DD format"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
	}
	if fromDate != "" && toDate != "" {
		fromParsed, _ := time.Parse("2006-01-02", fromDate)
		toParsed, _ := time.Parse("2006-01-02", toDate)
		if fromParsed.After(toParsed) {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "from_date cannot be after to_date"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
	}
	if fromDate != "" {
		params.Filters["from_date"] = fromDate
	} else {
		delete(params.Filters, "from_date")
	}
	if toDate != "" {
		params.Filters["to_date"] = toDate
	} else {
		delete(params.Filters, "to_date")
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	data, total, err := h.Service.List(params, role, userID)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *OrderHandler) DashboardOrders(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 5)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"dealer_id", "finance_company_id", "status"})

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	data, total, err := h.Service.List(params, role, userID)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *OrderHandler) DashboardSummary(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	req := dto.DashboardSummaryQuery{
		Area:             strings.TrimSpace(ctx.Query("area")),
		DealerID:         strings.TrimSpace(ctx.Query("dealer_id")),
		FinanceCompanyID: strings.TrimSpace(ctx.Query("finance_company_id")),
		ResultStatus:     strings.ToLower(strings.TrimSpace(ctx.Query("result_status"))),
		Analysis:         strings.ToLower(strings.TrimSpace(ctx.Query("analysis"))),
		Date:             strings.TrimSpace(ctx.Query("date")),
		From:             strings.TrimSpace(ctx.Query("from")),
		To:               strings.TrimSpace(ctx.Query("to")),
		Holidays:         strings.TrimSpace(ctx.Query("holidays")),
	}

	if req.ResultStatus != "" {
		switch req.ResultStatus {
		case "approve", "reject", "pending":
		default:
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "result_status must be one of: approve, reject, pending"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
	}

	if req.Analysis != "" {
		switch req.Analysis {
		case "yearly", "monthly", "daily", "custom":
		default:
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "analysis must be one of: yearly, monthly, daily, custom"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
	}

	if rawMonth := strings.TrimSpace(ctx.Query("month")); rawMonth != "" {
		parsedMonth, err := strconv.Atoi(rawMonth)
		if err != nil || parsedMonth < 1 || parsedMonth > 12 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "month must be between 1 and 12"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		req.Month = parsedMonth
	}
	if rawYear := strings.TrimSpace(ctx.Query("year")); rawYear != "" {
		parsedYear, err := strconv.Atoi(rawYear)
		if err != nil || parsedYear < 1 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "year must be a valid positive number"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		req.Year = parsedYear
	}

	var parsedFrom time.Time
	var parsedTo time.Time
	var hasDate bool
	var hasFrom bool
	var hasTo bool

	if req.Date != "" {
		if _, err := time.Parse("2006-01-02", req.Date); err != nil {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "date must use YYYY-MM-DD format"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		hasDate = true
	}
	if req.From != "" {
		parsed, err := time.Parse("2006-01-02", req.From)
		if err != nil {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "from must use YYYY-MM-DD format"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		parsedFrom = parsed
		hasFrom = true
	}
	if req.To != "" {
		parsed, err := time.Parse("2006-01-02", req.To)
		if err != nil {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "to must use YYYY-MM-DD format"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		parsedTo = parsed
		hasTo = true
	}

	if hasFrom && hasTo && parsedFrom.After(parsedTo) {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = "from cannot be after to"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	switch req.Analysis {
	case "yearly":
		if req.Year <= 0 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "year is required for yearly analysis"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
	case "monthly":
		if req.Year <= 0 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "year is required for monthly analysis"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		if req.Month < 1 || req.Month > 12 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "month is required for monthly analysis"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
	case "daily":
		if !hasDate {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "date is required for daily analysis"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
	case "custom":
		if !hasFrom || !hasTo {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
			res.Error = "from and to are required for custom analysis"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	data, err := h.Service.DashboardSummary(req, role, userID)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.Response(http.StatusOK, "success", logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *OrderHandler) Update(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logID)
	if err != nil {
		return
	}

	var req dto.UpdateOrderRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	data, err := h.Service.Update(id, req, role, userID)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "order updated", logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *OrderHandler) Delete(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	if err := h.Service.Delete(id, role, userID); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "order deleted", logID, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}

func (h *OrderHandler) StartExport(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	var req dto.OrderExportRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	job, err := h.Service.StartExport(req, role, userID)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "order export queued", logID, job)
	ctx.JSON(http.StatusOK, res)
}

func (h *OrderHandler) GetExportStatus(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	jobID := strings.TrimSpace(ctx.Param("id"))
	if jobID == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	job, err := h.Service.GetExportJob(jobID, role, userID)
	if err != nil {
		switch {
		case errors.Is(err, domainorder.ErrOrderExportNotFound):
			res := response.Response(http.StatusNotFound, messages.MsgNotFound, logID, nil)
			res.Error = err.Error()
			ctx.JSON(http.StatusNotFound, res)
		case errors.Is(err, domainorder.ErrOrderExportForbidden):
			res := response.Response(http.StatusForbidden, messages.MsgFail, logID, nil)
			res.Error = err.Error()
			ctx.JSON(http.StatusForbidden, res)
		default:
			res := response.Response(http.StatusInternalServerError, messages.MsgFail, logID, nil)
			res.Error = err.Error()
			ctx.JSON(http.StatusInternalServerError, res)
		}
		return
	}

	res := response.Response(http.StatusOK, "success", logID, job)
	ctx.JSON(http.StatusOK, res)
}

func (h *OrderHandler) DownloadExport(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	jobID := strings.TrimSpace(ctx.Param("id"))
	if jobID == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	auth := utils.GetAuthData(ctx)
	userID := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	file, err := h.Service.DownloadExport(jobID, role, userID)
	if err != nil {
		switch {
		case errors.Is(err, domainorder.ErrOrderExportNotFound):
			res := response.Response(http.StatusNotFound, messages.MsgNotFound, logID, nil)
			res.Error = err.Error()
			ctx.JSON(http.StatusNotFound, res)
		case errors.Is(err, domainorder.ErrOrderExportForbidden):
			res := response.Response(http.StatusForbidden, messages.MsgFail, logID, nil)
			res.Error = err.Error()
			ctx.JSON(http.StatusForbidden, res)
		case errors.Is(err, domainorder.ErrOrderExportNotReady), errors.Is(err, domainorder.ErrOrderExportFileGone):
			res := response.Response(http.StatusConflict, messages.MsgFail, logID, nil)
			res.Error = err.Error()
			ctx.JSON(http.StatusConflict, res)
		default:
			res := response.Response(http.StatusInternalServerError, messages.MsgFail, logID, nil)
			res.Error = err.Error()
			ctx.JSON(http.StatusInternalServerError, res)
		}
		return
	}

	safeFileName := strings.ReplaceAll(strings.TrimSpace(file.FileName), "\"", "")
	if safeFileName == "" {
		safeFileName = "order-in-export.xlsx"
	}
	ctx.Header("Content-Type", file.ContentType)
	ctx.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", safeFileName))
	ctx.Data(http.StatusOK, file.ContentType, file.Content)
}
