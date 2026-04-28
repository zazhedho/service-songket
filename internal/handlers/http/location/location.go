package handlerlocation

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	interfacelocation "service-songket/internal/interfaces/location"
	"service-songket/pkg/logger"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type LocationHandler struct {
	Service interfacelocation.ServiceLocationInterface
}

func NewLocationHandler(service interfacelocation.ServiceLocationInterface) *LocationHandler {
	return &LocationHandler{Service: service}
}

func (h *LocationHandler) GetProvince(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	year := resolveYear(ctx)
	data, err := h.Service.GetProvince(ctx.Request.Context(), year)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("[location] province error: %v", err))
		res := response.Response(http.StatusBadGateway, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadGateway, res)
		return
	}
	res := response.Response(http.StatusOK, messages.MsgSuccess, logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *LocationHandler) GetCity(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	provinceCode := firstQuery(ctx, "province_code", "pro")
	if provinceCode == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = "province_code is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	year := resolveYear(ctx)
	data, err := h.Service.GetCity(ctx.Request.Context(), year, provinceCode)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("[location] city error: %v", err))
		res := response.Response(http.StatusBadGateway, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadGateway, res)
		return
	}
	res := response.Response(http.StatusOK, messages.MsgSuccess, logID, data)
	ctx.JSON(http.StatusOK, res)
}

func (h *LocationHandler) GetDistrict(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	provinceCode := firstQuery(ctx, "province_code", "pro")
	cityCode := firstQuery(ctx, "city_code", "kab")
	if provinceCode == "" || cityCode == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logID, nil)
		res.Error = "province_code and city_code are required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}
	year := resolveYear(ctx)
	data, err := h.Service.GetDistrict(ctx.Request.Context(), year, provinceCode, cityCode)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("[location] district error: %v", err))
		res := response.Response(http.StatusBadGateway, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadGateway, res)
		return
	}
	res := response.Response(http.StatusOK, messages.MsgSuccess, logID, data)
	ctx.JSON(http.StatusOK, res)
}

func resolveYear(ctx *gin.Context) string {
	if ctx == nil {
		return ""
	}
	if y := ctx.Query("year"); y != "" {
		return y
	}
	return ctx.Query("thn")
}

func firstQuery(ctx *gin.Context, keys ...string) string {
	if ctx == nil {
		return ""
	}
	for _, key := range keys {
		if value := strings.TrimSpace(ctx.Query(key)); value != "" {
			return value
		}
	}
	return ""
}
