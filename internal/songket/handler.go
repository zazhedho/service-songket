package songket

import (
	"context"
	"net/http"
	"os"
	"time"

	"starter-kit/pkg/filter"
	"starter-kit/pkg/logger"
	"starter-kit/pkg/messages"
	"starter-kit/pkg/response"
	"starter-kit/utils"

	"github.com/gin-gonic/gin"
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

// PUT /api/songket/orders/:id
func (h *Handler) UpdateOrder(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
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

// GET /api/songket/finance/dealers
func (h *Handler) Dealers(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.svc.ListDealers()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
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
	data, err := h.svc.ListCreditCapabilities()
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
	data, err := h.svc.ListQuadrants()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
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
	url := os.Getenv("SCRAPE_PANGAN_URL")
	data, err := h.svc.ScrapePanelHarga(context.Background(), url)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "scraped", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func init() {
	logger.WriteLog(logger.LogLevelDebug, "[songket] handler loaded")
}
