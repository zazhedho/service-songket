package middlewares

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"service-songket/internal/authscope"
	interfaceauth "service-songket/internal/interfaces/auth"
	interfacepermission "service-songket/internal/interfaces/permission"
	"service-songket/pkg/logger"
	"service-songket/pkg/messages"
	"service-songket/pkg/response"
	"service-songket/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Middleware struct {
	BlacklistRepo  interfaceauth.RepoAuthInterface
	PermissionRepo interfacepermission.RepoPermissionInterface
	DealerAccess   DealerAccessProvider
}

type PermissionCheck struct {
	Resource string
	Action   string
}

type DealerAccessProvider interface {
	ListUserDealerIDs(ctx context.Context, userID string) ([]string, error)
}

func NewMiddleware(blacklistRepo interfaceauth.RepoAuthInterface, permissionRepo interfacepermission.RepoPermissionInterface, dealerAccess ...DealerAccessProvider) *Middleware {
	middleware := &Middleware{
		BlacklistRepo:  blacklistRepo,
		PermissionRepo: permissionRepo,
	}
	if len(dealerAccess) > 0 {
		middleware.DealerAccess = dealerAccess[0]
	}
	return middleware
}

func (m *Middleware) userDealerIDs(ctx context.Context, userID string) []string {
	if m.DealerAccess == nil {
		return nil
	}
	dealerIDs, err := m.DealerAccess.ListUserDealerIDs(ctx, userID)
	if err != nil {
		return nil
	}
	return dealerIDs
}

func (m *Middleware) AuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var (
			err       error
			logId     uuid.UUID
			logPrefix string
		)

		logId = utils.GenerateLogId(ctx)
		logPrefix = "[AuthMiddleware]"

		tokenString, dataJWT, err := utils.JwtClaims(ctx)
		if err != nil {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Invalid Token: %s; Error: %s;", logPrefix, tokenString, err.Error()))
			res := response.Response(http.StatusUnauthorized, messages.MsgFail, logId, nil)
			res.Error = err.Error()
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, res)
			return
		}
		logPrefix += fmt.Sprintf("[%s][%s]", utils.InterfaceString(dataJWT["jti"]), utils.InterfaceString(dataJWT["user_id"]))

		_, err = m.BlacklistRepo.GetByToken(ctx.Request.Context(), tokenString)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; blacklistRepo.GetByToken; Error: %+v", logPrefix, err))
			res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
			res.Error = err.Error()
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, res)
			return
		}

		if !errors.Is(err, gorm.ErrRecordNotFound) {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Invalid Token: %s; Error: token is blacklisted;", logPrefix, tokenString))
			res := response.Response(http.StatusUnauthorized, messages.MsgFail, logId, nil)
			res.Error = "Please login and try again"
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, res)
			return
		}

		ctx.Set(utils.CtxKeyAuthData, dataJWT)
		ctx.Set("token", tokenString)
		userID := utils.InterfaceString(dataJWT["user_id"])
		dealerIDs := m.userDealerIDs(ctx.Request.Context(), userID)
		ctx.Set("userId", userID)
		ctx.Set("dealer_ids", dealerIDs)
		ctx.Request = ctx.Request.WithContext(authscope.WithContext(ctx.Request.Context(), authscope.New(
			userID,
			utils.InterfaceString(dataJWT["role"]),
			nil,
			dealerIDs,
		)))

		ctx.Next()
	}
}

func (m *Middleware) PermissionMiddleware(resource, action string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var (
			logId     uuid.UUID
			logPrefix string
		)

		logId = utils.GenerateLogId(ctx)
		logPrefix = "[PermissionMiddleware]"

		authData, exists := ctx.Get(utils.CtxKeyAuthData)
		if !exists {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; AuthData not found", logPrefix))
			res := response.Response(http.StatusForbidden, messages.MsgDenied, logId, nil)
			res.Error = "auth data not found"
			ctx.AbortWithStatusJSON(http.StatusForbidden, res)
			return
		}
		dataJWT := authData.(map[string]interface{})

		userRole, ok := dataJWT["role"].(string)
		if !ok {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; there is no role user", logPrefix))
			res := response.Response(http.StatusForbidden, messages.MsgDenied, logId, nil)
			res.Error = "there is no role user"
			ctx.AbortWithStatusJSON(http.StatusForbidden, res)
			return
		}

		// Superadmin bypasses all permission checks
		if userRole == utils.RoleSuperAdmin {
			ctx.Next()
			return
		}

		userId := utils.InterfaceString(dataJWT["user_id"])
		permissions, err := m.PermissionRepo.GetUserPermissions(ctx.Request.Context(), userId)
		if err != nil {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Failed to get user permissions: %s", logPrefix, err.Error()))
			res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
			res.Error = "failed to check permissions"
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, res)
			return
		}

		hasPermission := false
		permissionKeys := make([]string, 0, len(permissions))
		for _, perm := range permissions {
			permissionKeys = append(permissionKeys, fmt.Sprintf("%s:%s", perm.Resource, perm.Action))
			if perm.Resource == resource && perm.Action == action {
				hasPermission = true
			}
		}

		dataJWT["permissions"] = permissionKeys
		ctx.Set(utils.CtxKeyAuthData, dataJWT)
		ctx.Set("permissions", permissionKeys)
		dealerIDs := m.userDealerIDs(ctx.Request.Context(), userId)
		ctx.Set("dealer_ids", dealerIDs)
		ctx.Request = ctx.Request.WithContext(authscope.WithContext(ctx.Request.Context(), authscope.New(
			utils.InterfaceString(dataJWT["user_id"]),
			utils.InterfaceString(dataJWT["role"]),
			permissionKeys,
			dealerIDs,
		)))

		if !hasPermission {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; User '%s' lacks required permissions", logPrefix, userId))
			res := response.Response(http.StatusForbidden, messages.MsgDenied, logId, nil)
			res.Error = response.Errors{Code: http.StatusForbidden, Message: messages.AccessDenied}
			ctx.AbortWithStatusJSON(http.StatusForbidden, res)
			return
		}

		ctx.Next()
	}
}
