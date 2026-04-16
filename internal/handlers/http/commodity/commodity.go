package handlercommodity

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"service-songket/internal/dto"
	interfacecommodity "service-songket/internal/interfaces/commodity"
	"service-songket/pkg/filter"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type CommodityHandler struct {
	Service interfacecommodity.ServiceCommodityInterface
}

func NewCommodityHandler(service interfacecommodity.ServiceCommodityInterface) *CommodityHandler {
	return &CommodityHandler{Service: service}
}

func (h *CommodityHandler) Upsert(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req dto.CommodityRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.Upsert(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "saved", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CommodityHandler) AddPrice(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req dto.CommodityPriceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.AddPrice(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "saved", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CommodityHandler) LatestPrices(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.Service.LatestPrices()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CommodityHandler) DashboardPrices(ctx *gin.Context) {
	h.listPrices(ctx, 5)
}

func (h *CommodityHandler) ListPrices(ctx *gin.Context) {
	h.listPrices(ctx, 20)
}

func (h *CommodityHandler) listPrices(ctx *gin.Context, limit int) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "collected_at", "desc", limit)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"commodity_id"})

	data, total, err := h.Service.ListPrices(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CommodityHandler) ListCommodities(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.Service.ListCommodities()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CommodityHandler) DeletePrice(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	if err := h.Service.DeletePrice(ctx.Param("id")); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, nil)
	ctx.JSON(http.StatusOK, res)
}

func (h *CommodityHandler) ScrapePrices(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		Urls []string `json:"urls"`
	}
	_ = ctx.ShouldBindJSON(&req)

	data, err := h.Service.Scrape(ctx.Request.Context(), req.Urls)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "scraped", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CommodityHandler) CreateScrapeJob(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		Urls []string `json:"urls"`
	}
	_ = ctx.ShouldBindJSON(&req)

	job, err := h.Service.CreateScrapeJob(req.Urls)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "job created", logId, job)
	ctx.JSON(http.StatusCreated, res)
}

func (h *CommodityHandler) ListScrapeJobs(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"status"})

	data, total, err := h.Service.ListScrapeJobs(params)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CommodityHandler) ListScrapeResults(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "scraped_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"source_url"})

	data, total, err := h.Service.ListScrapeResults(ctx.Param("id"), params)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *CommodityHandler) CommitScrapeResults(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		ResultIDs []string `json:"result_ids" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.CommitScrapeResults(ctx.Param("id"), req.ResultIDs)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "imported", logId, data)
	ctx.JSON(http.StatusOK, res)
}
