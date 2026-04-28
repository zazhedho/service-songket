package handlerscrapesource

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"service-songket/internal/dto"
	interfacescrapesource "service-songket/internal/interfaces/scrapesource"
	"service-songket/pkg/filter"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type ScrapeSourceHandler struct {
	Service interfacescrapesource.ServiceScrapeSourceInterface
}

func NewScrapeSourceHandler(service interfacescrapesource.ServiceScrapeSourceInterface) *ScrapeSourceHandler {
	return &ScrapeSourceHandler{Service: service}
}

func (h *ScrapeSourceHandler) GetAll(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"type", "category"})

	data, total, err := h.Service.List(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *ScrapeSourceHandler) Create(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	var req dto.ScrapeSourceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Create(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logID, data)
	ctx.JSON(http.StatusCreated, res)
}

func (h *ScrapeSourceHandler) Update(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	id, err := utils.ValidateUUID(ctx, logID)
	if err != nil {
		return
	}
	var req dto.ScrapeSourceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Update(id, req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *ScrapeSourceHandler) Delete(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if err := h.Service.Delete(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logID, nil)
	ctx.JSON(http.StatusOK, res)
}
