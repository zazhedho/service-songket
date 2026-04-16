package handlerquadrant

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"service-songket/internal/dto"
	interfacequadrant "service-songket/internal/interfaces/quadrant"
	"service-songket/pkg/filter"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type QuadrantHandler struct {
	Service interfacequadrant.ServiceQuadrantInterface
}

func NewQuadrantHandler(service interfacequadrant.ServiceQuadrantInterface) *QuadrantHandler {
	return &QuadrantHandler{Service: service}
}

func (h *QuadrantHandler) Summary(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	year := 0
	month := 0

	if yearRaw := strings.TrimSpace(ctx.Query("year")); yearRaw != "" {
		parsed, err := strconv.Atoi(yearRaw)
		if err != nil || parsed <= 0 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
			res.Error = "year must be a valid positive number"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		year = parsed
	}
	if monthRaw := strings.TrimSpace(ctx.Query("month")); monthRaw != "" {
		parsed, err := strconv.Atoi(monthRaw)
		if err != nil || parsed < 1 || parsed > 12 {
			res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
			res.Error = "month must be between 1 and 12"
			ctx.JSON(http.StatusBadRequest, res)
			return
		}
		month = parsed
	}
	if month > 0 && year <= 0 {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "year is required when month is provided"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Summary(year, month)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *QuadrantHandler) Recompute(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req dto.QuadrantComputeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Recompute(req)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.Response(http.StatusOK, "recomputed", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *QuadrantHandler) GetAll(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "computed_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"job_id", "regency", "quadrant", "credit_score"})

	data, total, err := h.Service.List(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}
