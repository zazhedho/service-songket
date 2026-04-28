package handlerinstallment

import (
	"net/http"

	"service-songket/internal/dto"
	interfaceinstallment "service-songket/internal/interfaces/installment"
	"service-songket/pkg/filter"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"

	"github.com/gin-gonic/gin"
)

type InstallmentHandler struct {
	Service interfaceinstallment.ServiceInstallmentInterface
}

func NewInstallmentHandler(service interfaceinstallment.ServiceInstallmentInterface) *InstallmentHandler {
	return &InstallmentHandler{Service: service}
}

func (h *InstallmentHandler) GetAll(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	reqCtx := ctx.Request.Context()
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	params.Filters = filter.WhitelistFilter(params.Filters, []string{"motor_type_id", "province_code", "regency_code"})

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

func (h *InstallmentHandler) GetByID(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	reqCtx := ctx.Request.Context()
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.GetByID(reqCtx, id)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *InstallmentHandler) Create(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	reqCtx := ctx.Request.Context()
	var req dto.InstallmentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Create(reqCtx, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

func (h *InstallmentHandler) Update(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	reqCtx := ctx.Request.Context()
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}

	var req dto.InstallmentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Update(reqCtx, id, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *InstallmentHandler) Delete(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	reqCtx := ctx.Request.Context()
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	if err := h.Service.Delete(reqCtx, id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"id": id})
	ctx.JSON(http.StatusOK, res)
}
