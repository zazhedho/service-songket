package songket

import (
	"context"
	"net/http"
	"os"
	"strconv"
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

// DELETE /api/songket/orders/:id
func (h *Handler) DeleteOrder(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if id == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "id is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	auth := utils.GetAuthData(ctx)
	userId := utils.InterfaceString(auth["user_id"])
	role := utils.InterfaceString(auth["role"])

	if err := h.svc.DeleteOrder(id, role, userId); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	res := response.Response(http.StatusOK, "order deleted", logId, gin.H{"id": id})
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

// GET /api/songket/quadrants/summary (score by wilayah)
func (h *Handler) QuadrantSummary(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	threshold := utils.GetEnv("CREDIT_ORDER_THRESHOLD", 5).(int)
	data, err := h.svc.CreditCapabilitySummary(int64(threshold))
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/credit/summary
func (h *Handler) CreditSummary(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	threshold := utils.GetEnv("CREDIT_ORDER_THRESHOLD", 5).(int)
	data, err := h.svc.CreditCapabilitySummary(int64(threshold))
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

// GET /api/songket/news/sources
func (h *Handler) ListNewsSources(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	data, err := h.svc.ListNewsSources()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
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

// POST /api/songket/news/scrape
func (h *Handler) ScrapeNews(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		Urls []string `json:"urls"`
	}
	_ = ctx.ShouldBindJSON(&req)

	var (
		data []NewsItem
		err  error
	)
	if len(req.Urls) > 0 {
		data, err = h.svc.ScrapeNewsFromUrls(ctx.Request.Context(), req.Urls)
	} else {
		data, err = h.svc.ScrapeNews(ctx.Request.Context())
	}
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "scraped", logId, data)
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

// GET /api/songket/commodities/prices
func (h *Handler) ListPrices(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	limitStr := ctx.DefaultQuery("limit", "200")
	limit, _ := strconv.Atoi(limitStr)
	data, err := h.svc.ListCommodityPrices(limit)
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// DELETE /api/songket/commodities/prices/:id
func (h *Handler) DeletePrice(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if err := h.svc.DeleteCommodityPrice(id); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, nil)
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
	var req struct {
		Urls []string `json:"urls"`
	}
	_ = ctx.ShouldBindJSON(&req)
	url := os.Getenv("SCRAPE_PANGAN_URL")
	if len(req.Urls) == 0 && url != "" {
		req.Urls = []string{url}
	}
	data, err := h.svc.ScrapeFromSources(context.Background(), req.Urls)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "scraped", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/commodities/prices/scrape-jobs
func (h *Handler) CreateScrapeJob(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req struct {
		Urls []string `json:"urls" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	job, err := h.svc.StartScrapeJob(req.Urls)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "job created", logId, job)
	ctx.JSON(http.StatusCreated, res)
}

// GET /api/songket/commodities/prices/jobs
func (h *Handler) ListScrapeJobs(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "30"))
	data, err := h.svc.ListScrapeJobs(limit)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/songket/commodities/prices/jobs/:id/results
func (h *Handler) ListScrapeResults(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	data, err := h.svc.ListScrapeResults(id)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// POST /api/songket/commodities/prices/jobs/:id/commit
func (h *Handler) CommitScrapeResults(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	var req struct {
		ResultIDs []string `json:"result_ids" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, err := h.svc.CommitScrapeResults(id, req.ResultIDs)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "imported", logId, data)
	ctx.JSON(http.StatusOK, res)
}

// CRUD scrape sources
func (h *Handler) ListScrapeSources(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var sources []ScrapeSource
	if err := h.svc.db.Find(&sources).Error; err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, sources)
	ctx.JSON(http.StatusOK, res)
}

func (h *Handler) CreateScrapeSource(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req ScrapeSource
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	req.Id = utils.CreateUUID()
	if err := h.svc.db.Create(&req).Error; err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, req)
	ctx.JSON(http.StatusCreated, res)
}

func (h *Handler) UpdateScrapeSource(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	var req ScrapeSource
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	req.Id = id
	if err := h.svc.db.Model(&ScrapeSource{}).Where("id = ?", id).Updates(req).Error; err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, req)
	ctx.JSON(http.StatusOK, res)
}

func (h *Handler) DeleteScrapeSource(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	id := ctx.Param("id")
	if err := h.svc.db.Delete(&ScrapeSource{}, "id = ?", id).Error; err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, nil)
	ctx.JSON(http.StatusOK, res)
}

func init() {
	logger.WriteLog(logger.LogLevelDebug, "[songket] handler loaded")
}
