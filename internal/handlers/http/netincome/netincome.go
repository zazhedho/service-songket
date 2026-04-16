package handlernetincome

import (
	"net/http"

	"service-songket/internal/dto"
	interfacenetincome "service-songket/internal/interfaces/netincome"
	"service-songket/pkg/filter"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"

	"github.com/gin-gonic/gin"
)

type NetIncomeHandler struct {
	Service interfacenetincome.ServiceNetIncomeInterface
}

func NewNetIncomeHandler(service interfacenetincome.ServiceNetIncomeInterface) *NetIncomeHandler {
	return &NetIncomeHandler{Service: service}
}

func (h *NetIncomeHandler) GetAll(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"job_id"})

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

func (h *NetIncomeHandler) GetByID(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.GetByID(id)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *NetIncomeHandler) Create(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req dto.NetIncomeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Create(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

func (h *NetIncomeHandler) Update(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}

	var req dto.NetIncomeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Update(id, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *NetIncomeHandler) Delete(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	if err := h.Service.Delete(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}
