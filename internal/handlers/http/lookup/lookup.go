package handlerlookup

import (
	"net/http"

	"github.com/gin-gonic/gin"

	interfacelookup "service-songket/internal/interfaces/lookup"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"
)

type LookupHandler struct {
	Service interfacelookup.ServiceLookupInterface
}

func NewLookupHandler(service interfacelookup.ServiceLookupInterface) *LookupHandler {
	return &LookupHandler{Service: service}
}

func (h *LookupHandler) GetAll(ctx *gin.Context) {
	logID := utils.GenerateLogId(ctx)
	data, err := h.Service.GetAll()
	if err != nil {
		res := response.Response(http.StatusInternalServerError, messages.MsgFail, logID, nil)
		res.Error = err.Error()
		ctx.JSON(http.StatusInternalServerError, res)
		return
	}
	res := response.Response(http.StatusOK, "success", logID, data)
	ctx.JSON(http.StatusOK, res)
}
