package master

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"starter-kit/pkg/logger"
	"starter-kit/pkg/messages"
	"starter-kit/pkg/response"
	"starter-kit/utils"
)

type Handler struct {
	svc *WilayahService
}

func NewHandler(s *WilayahService) *Handler {
	return &Handler{svc: s}
}

// GET /api/master/provinsi
func (h *Handler) GetProvinsi(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	year := resolveYear(ctx)

	data, err := h.svc.GetProvinsi(ctx.Request.Context(), year)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("[master] provinsi error: %v", err))
		res := response.Response(http.StatusBadGateway, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadGateway, res)
		return
	}

	res := response.Response(http.StatusOK, messages.MsgSuccess, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/master/kabupaten?pro=31
func (h *Handler) GetKabupaten(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	pro := ctx.Query("pro")
	if pro == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "parameter 'pro' (kode provinsi) is required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	year := resolveYear(ctx)
	data, err := h.svc.GetKabupaten(ctx.Request.Context(), year, pro)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("[master] kabupaten error: %v", err))
		res := response.Response(http.StatusBadGateway, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadGateway, res)
		return
	}

	res := response.Response(http.StatusOK, messages.MsgSuccess, logId, data)
	ctx.JSON(http.StatusOK, res)
}

// GET /api/master/kecamatan?pro=31&kab=73
func (h *Handler) GetKecamatan(ctx *gin.Context) {
	logId := utils.GenerateLogId(ctx)
	pro := ctx.Query("pro")
	kab := ctx.Query("kab")
	if pro == "" || kab == "" {
		res := response.Response(http.StatusBadRequest, messages.InvalidRequest, logId, nil)
		res.Error = "parameters 'pro' (kode provinsi) and 'kab' (kode kabupaten/kota) are required"
		ctx.JSON(http.StatusBadRequest, res)
		return
	}

	year := resolveYear(ctx)
	data, err := h.svc.GetKecamatan(ctx.Request.Context(), year, pro, kab)
	if err != nil {
		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("[master] kecamatan error: %v", err))
		res := response.Response(http.StatusBadGateway, messages.MsgFail, logId, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusBadGateway, res)
		return
	}

	res := response.Response(http.StatusOK, messages.MsgSuccess, logId, data)
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
