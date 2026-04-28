package handlermenu

import (
	"fmt"
	"net/http"
	"reflect"
	"service-songket/internal/dto"
	interfacemenu "service-songket/internal/interfaces/menu"
	"service-songket/pkg/filter"
	"service-songket/pkg/logger"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"

	"github.com/gin-gonic/gin"
)

type MenuHandler struct {
	Service interfacemenu.ServiceMenuInterface
}

func NewMenuHandler(s interfacemenu.ServiceMenuInterface) *MenuHandler {
	return &MenuHandler{Service: s}
}

func (h *MenuHandler) GetByID(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	logPrefix := "[MenuHandler][GetByID]"
	reqCtx := ctx.Request.Context()
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}

	data, err := h.Service.GetByID(reqCtx, id)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Service.GetByID; Error: %+v", logPrefix, err))
		res := response.Response(http.StatusNotFound, "Menu not found", logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusNotFound, res)
		return
	}

	res := response.Response(http.StatusOK, "Get menu successfully", logId, data)
	logger.WriteLogWithContext(ctx, logger.LogLevelDebug, fmt.Sprintf("%s; Response: %+v;", logPrefix, utils.JsonEncode(data)))
	ctx.JSON(http.StatusOK, res)
}

func (h *MenuHandler) GetAll(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	logPrefix := "[MenuHandler][GetAll]"
	reqCtx := ctx.Request.Context()

	params, err := filter.GetBaseParams(ctx, "order_index", "asc", 100)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; GetBaseParams; Error: %+v", logPrefix, err))
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	data, total, err := h.Service.GetAll(reqCtx, params)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Service.GetAll; Error: %+v", logPrefix, err))
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.PaginationResponse(http.StatusOK, int(total), params.Page, params.Limit, logId, data)
	logger.WriteLogWithContext(ctx, logger.LogLevelDebug, fmt.Sprintf("%s; Response: %+v;", logPrefix, utils.JsonEncode(data)))
	ctx.JSON(http.StatusOK, res)
}

func (h *MenuHandler) GetActiveMenus(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	logPrefix := "[MenuHandler][GetActiveMenus]"
	reqCtx := ctx.Request.Context()

	data, err := h.Service.GetActiveMenus(reqCtx)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Service.GetActiveMenus; Error: %+v", logPrefix, err))
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.Response(http.StatusOK, "Get active menus successfully", logId, data)
	logger.WriteLogWithContext(ctx, logger.LogLevelDebug, fmt.Sprintf("%s; Response: %+v;", logPrefix, utils.JsonEncode(data)))
	ctx.JSON(http.StatusOK, res)
}

func (h *MenuHandler) GetUserMenus(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	logPrefix := "[MenuHandler][GetUserMenus]"

	userId, exists := ctx.Get("userId")
	if !exists {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; User ID not found in context", logPrefix))

		authData := utils.GetAuthData(ctx)
		if authData != nil {
			if userIdFromAuth := utils.InterfaceString(authData["user_id"]); userIdFromAuth != "" {
				userId = userIdFromAuth
			} else {
				res := response.Response(http.StatusUnauthorized, "Unauthorized", logId, nil)
				ctx.JSON(http.StatusUnauthorized, res)
				return
			}
		} else {
			res := response.Response(http.StatusUnauthorized, "Unauthorized", logId, nil)
			ctx.JSON(http.StatusUnauthorized, res)
			return
		}
	}

	data, err := h.Service.GetUserMenus(ctx.Request.Context(), userId.(string))
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Service.GetUserMenus; Error: %+v", logPrefix, err))
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.Response(http.StatusOK, "Get user menus successfully", logId, data)
	logger.WriteLogWithContext(ctx, logger.LogLevelDebug, fmt.Sprintf("%s; Response: %+v;", logPrefix, utils.JsonEncode(data)))
	ctx.JSON(http.StatusOK, res)
}

func (h *MenuHandler) Update(ctx *gin.Context) {
	var req dto.MenuUpdate
	logId := utils.GenerateLogId(ctx)
	logPrefix := "[MenuHandler][Update]"
	reqCtx := ctx.Request.Context()
	id, err := utils.ValidateUUID(ctx, logId)
	if err != nil {
		return
	}

	if err := ctx.BindJSON(&req); err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; BindJSON ERROR: %s;", logPrefix, err.Error()))
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = utils.ValidateError(err, reflect.TypeOf(req), "json")
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	logger.WriteLogWithContext(ctx, logger.LogLevelDebug, fmt.Sprintf("%s; Request: %+v;", logPrefix, utils.JsonEncode(req)))

	data, err := h.Service.Update(reqCtx, id, req)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Service.Update; Error: %+v", logPrefix, err))
		res := response.Response(http.StatusInternalServerError, err.Error(), logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}

	res := response.Response(http.StatusOK, "Menu updated successfully", logId, data)
	logger.WriteLogWithContext(ctx, logger.LogLevelDebug, fmt.Sprintf("%s; Response: %+v;", logPrefix, utils.JsonEncode(data)))
	ctx.JSON(http.StatusOK, res)
}
