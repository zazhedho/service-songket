package handlermastersetting

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	domainmastersetting "service-songket/internal/domain/mastersetting"
	"service-songket/internal/dto"
	interfacemastersetting "service-songket/internal/interfaces/mastersetting"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type MasterSettingHandler struct {
	Service interfacemastersetting.ServiceMasterSettingInterface
}

func NewMasterSettingHandler(service interfacemastersetting.ServiceMasterSettingInterface) *MasterSettingHandler {
	return &MasterSettingHandler{Service: service}
}

func (h *MasterSettingHandler) GetNewsScrapeCronSetting(ctx *gin.Context) {
	h.respondSetting(ctx, h.Service.GetNewsScrapeCronSetting)
}

func (h *MasterSettingHandler) CreateNewsScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req dto.NewsScrapeCronSettingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	userID, username := authActor(ctx)
	data, err := h.Service.CreateNewsScrapeCronSetting(ctx.Request.Context(), req, userID, username)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

func (h *MasterSettingHandler) UpdateNewsScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req dto.NewsScrapeCronSettingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	userID, username := authActor(ctx)
	data, err := h.Service.UpdateNewsScrapeCronSetting(ctx.Request.Context(), req, userID, username)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *MasterSettingHandler) GetNewsScrapeCronSettingHistory(ctx *gin.Context) {
	h.respondHistory(ctx, h.Service.ListNewsScrapeCronSettingHistory)
}

func (h *MasterSettingHandler) DeleteNewsScrapeCronSetting(ctx *gin.Context) {
	h.deleteSetting(ctx, domainmastersetting.MasterSettingKeyNewsScrapeCron, h.Service.DeleteNewsScrapeCronSetting)
}

func (h *MasterSettingHandler) GetPriceScrapeCronSetting(ctx *gin.Context) {
	h.respondSetting(ctx, h.Service.GetPriceScrapeCronSetting)
}

func (h *MasterSettingHandler) CreatePriceScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req dto.PriceScrapeCronSettingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	userID, username := authActor(ctx)
	data, err := h.Service.CreatePriceScrapeCronSetting(ctx.Request.Context(), req, userID, username)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusCreated, "created", logId, data)
	ctx.JSON(http.StatusCreated, res)
}

func (h *MasterSettingHandler) UpdatePriceScrapeCronSetting(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	var req dto.PriceScrapeCronSettingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, nil, "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	userID, username := authActor(ctx)
	data, err := h.Service.UpdatePriceScrapeCronSetting(ctx.Request.Context(), req, userID, username)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "updated", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *MasterSettingHandler) GetPriceScrapeCronSettingHistory(ctx *gin.Context) {
	h.respondHistory(ctx, h.Service.ListPriceScrapeCronSettingHistory)
}

func (h *MasterSettingHandler) DeletePriceScrapeCronSetting(ctx *gin.Context) {
	h.deleteSetting(ctx, domainmastersetting.MasterSettingKeyPriceScrapeCron, h.Service.DeletePriceScrapeCronSetting)
}

func (h *MasterSettingHandler) respondSetting(ctx *gin.Context, getter func(ctx context.Context) (domainmastersetting.MasterSetting, error)) {
	logId := utils.GenerateLogId(ctx)
	data, err := getter(ctx.Request.Context())
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *MasterSettingHandler) respondHistory(ctx *gin.Context, getter func(ctx context.Context, limit int) ([]domainmastersetting.MasterSettingHistory, error)) {
	logId := utils.GenerateLogId(ctx)
	limit, err := strconv.Atoi(ctx.DefaultQuery("limit", "100"))
	if err != nil {
		limit = 100
	}
	data, err := getter(ctx.Request.Context(), limit)
	if err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logId, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *MasterSettingHandler) deleteSetting(ctx *gin.Context, key string, deleter func(ctx context.Context, actorUserID, actorName string) error) {
	logId := utils.GenerateLogId(ctx)
	userID, username := authActor(ctx)
	if err := deleter(ctx.Request.Context(), userID, username); err != nil {
		res := response.Response(http.StatusBadRequest, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	res := response.Response(http.StatusOK, "deleted", logId, gin.H{"key": key})
	ctx.JSON(http.StatusOK, res)
}

func authActor(ctx *gin.Context) (string, string) {
	auth := utils.GetAuthData(ctx)
	return utils.InterfaceString(auth["user_id"]), utils.InterfaceString(auth["username"])
}
