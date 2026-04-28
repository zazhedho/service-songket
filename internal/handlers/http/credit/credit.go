package handlercredit

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"service-songket/internal/dto"
	interfacecredit "service-songket/internal/interfaces/credit"
	"service-songket/pkg/filter"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type CreditHandler struct {
	Service interfacecredit.ServiceCreditInterface
}

func NewCreditHandler(service interfacecredit.ServiceCreditInterface) *CreditHandler {
	return &CreditHandler{Service: service}
}

func (h *CreditHandler) Upsert(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	reqCtx := ctx.Request.Context()
	var req dto.CreditCapabilityRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Upsert(reqCtx, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "saved", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CreditHandler) GetAll(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	reqCtx := ctx.Request.Context()
	params, err := filter.GetBaseParams(ctx, "updated_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"job_id", "province", "regency", "district"})

	data, total, err := h.Service.List(reqCtx, params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CreditHandler) Worksheet(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	province := strings.TrimSpace(ctx.Query("province"))
	regency := strings.TrimSpace(ctx.Query("regency"))
	jobID := strings.TrimSpace(ctx.Query("job_id"))
	motorTypeID := strings.TrimSpace(ctx.Query("motor_type_id"))
	from := strings.TrimSpace(ctx.Query("from"))
	to := strings.TrimSpace(ctx.Query("to"))

	data, err := h.Service.Worksheet(ctx.Request.Context(), province, regency, jobID, motorTypeID, from, to)
	if err != nil {
		status := http.StatusInternalServerError
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "invalid from date format") ||
			strings.Contains(errMsg, "invalid to date format") ||
			strings.Contains(errMsg, "invalid time range") {
			status = http.StatusBadRequest
		}

		res := response.Response(status, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(status, res)
		return
	}

	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CreditHandler) Summary(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	threshold := utils.GetEnv("CREDIT_ORDER_THRESHOLD", 5).(int)
	data, err := h.Service.Summary(ctx.Request.Context(), int64(threshold))
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}
