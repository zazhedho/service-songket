package handlernews

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	domainnews "service-songket/internal/domain/news"
	"service-songket/internal/dto"
	interfacenews "service-songket/internal/interfaces/news"
	"service-songket/pkg/filter"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type NewsHandler struct {
	Service interfacenews.ServiceNewsInterface
}

func NewNewsHandler(service interfacenews.ServiceNewsInterface) *NewsHandler {
	return &NewsHandler{Service: service}
}

func (h *NewsHandler) UpsertSource(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req dto.NewsSourceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.Service.UpsertSource(req)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "saved", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *NewsHandler) ListSources(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "created_at", "desc", 20)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"category"})

	data, total, err := h.Service.ListSources(params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *NewsHandler) Latest(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.Service.Latest(strings.TrimSpace(ctx.Query("category")))
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *NewsHandler) DashboardItems(ctx *gin.Context) {
	h.listItems(ctx, 5)
}

func (h *NewsHandler) ListItems(ctx *gin.Context) {
	h.listItems(ctx, 20)
}

func (h *NewsHandler) listItems(ctx *gin.Context, limit int) {
	logId := utils.GenerateLogId(ctx)
	params, err := filter.GetBaseParams(ctx, "published_at", "desc", limit)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	params.Filters = filter.WhitelistFilter(params.Filters, []string{"source_id", "source_name"})

	data, total, err := h.Service.ListItems(strings.TrimSpace(ctx.Query("category")), params)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *NewsHandler) DeleteItem(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	if err := h.Service.DeleteItem(ctx.Param("id")); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, nil)
	ctx.JSON(http.StatusOK, res)
}

func (h *NewsHandler) Scrape(ctx *gin.Context) {
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

func (h *NewsHandler) Import(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		Items []domainnews.NewsScrapedArticle `json:"items" binding:"required"`
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

	data, err := h.Service.Import(req.Items)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "imported", logId, data)
	ctx.JSON(http.StatusOK, res)
}
