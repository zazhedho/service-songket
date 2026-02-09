package middlewares

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	interfaceauth "starter-kit/internal/interfaces/auth"
	interfacemenu "starter-kit/internal/interfaces/menu"
	interfacepermission "starter-kit/internal/interfaces/permission"
	"starter-kit/pkg/logger"
	"starter-kit/pkg/messages"
	"starter-kit/pkg/response"
	"starter-kit/utils"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Middleware struct {
	BlacklistRepo  interfaceauth.RepoAuthInterface
	PermissionRepo interfacepermission.RepoPermissionInterface
	MenuRepo       interfacemenu.RepoMenuInterface
}

func NewMiddleware(blacklistRepo interfaceauth.RepoAuthInterface, permissionRepo interfacepermission.RepoPermissionInterface, menuRepo ...interfacemenu.RepoMenuInterface) *Middleware {
	var repoMenu interfacemenu.RepoMenuInterface
	if len(menuRepo) > 0 {
		repoMenu = menuRepo[0]
	}

	return &Middleware{
		BlacklistRepo:  blacklistRepo,
		PermissionRepo: permissionRepo,
		MenuRepo:       repoMenu,
	}
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

		_, err = m.BlacklistRepo.GetByToken(tokenString)
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
		ctx.Set("userId", utils.InterfaceString(dataJWT["user_id"]))

		ctx.Next()
	}
}

func (m *Middleware) RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var (
			logId     uuid.UUID
			logPrefix string
		)

		logId = utils.GenerateLogId(ctx)
		logPrefix = "[RoleMiddleware]"

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

		if userRole == utils.RoleSuperAdmin {
			ctx.Next()
			return
		}

		isAllowed := slices.Contains(allowedRoles, userRole)
		if !isAllowed {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; User with role '%s' tried to access a restricted route;", logPrefix, userRole))
			res := response.Response(http.StatusForbidden, messages.MsgDenied, logId, nil)
			res.Error = response.Errors{Code: http.StatusForbidden, Message: messages.AccessDenied}
			ctx.AbortWithStatusJSON(http.StatusForbidden, res)
			return
		}

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
		permissions, err := m.PermissionRepo.GetUserPermissions(userId)
		if err != nil {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Failed to get user permissions: %s", logPrefix, err.Error()))
			res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
			res.Error = "failed to check permissions"
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, res)
			return
		}

		hasPermission := false
		for _, perm := range permissions {
			if perm.Resource == resource && perm.Action == action {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; User '%s' lacks permission '%s:%s'", logPrefix, userId, resource, action))
			res := response.Response(http.StatusForbidden, messages.MsgDenied, logId, nil)
			res.Error = response.Errors{Code: http.StatusForbidden, Message: messages.AccessDenied}
			ctx.AbortWithStatusJSON(http.StatusForbidden, res)
			return
		}

		ctx.Next()
	}
}

func (m *Middleware) MenuAccessMiddleware(menuPaths ...string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		if len(menuPaths) == 0 || m.MenuRepo == nil {
			ctx.Next()
			return
		}

		var (
			logId     uuid.UUID
			logPrefix string
		)

		logId = utils.GenerateLogId(ctx)
		logPrefix = "[MenuAccessMiddleware]"

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
		if userRole == utils.RoleSuperAdmin {
			ctx.Next()
			return
		}

		userId := utils.InterfaceString(dataJWT["user_id"])
		if strings.TrimSpace(userId) == "" {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; user_id missing in token", logPrefix))
			res := response.Response(http.StatusForbidden, messages.MsgDenied, logId, nil)
			res.Error = "invalid user id"
			ctx.AbortWithStatusJSON(http.StatusForbidden, res)
			return
		}

		menus, err := m.MenuRepo.GetUserMenus(userId)
		if err != nil {
			logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; Failed to get user menus: %s", logPrefix, err.Error()))
			res := response.Response(http.StatusInternalServerError, messages.MsgFail, logId, nil)
			res.Error = "failed to check menu access"
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, res)
			return
		}

		availablePaths := make(map[string]struct{}, len(menus))
		for _, menu := range menus {
			p := strings.TrimSpace(menu.Path)
			if p == "" {
				continue
			}
			availablePaths[p] = struct{}{}
		}

		for _, required := range menuPaths {
			required = strings.TrimSpace(required)
			if required == "" {
				continue
			}
			if _, ok := availablePaths[required]; ok {
				ctx.Next()
				return
			}
		}

		logger.WriteLogWithContext(ctx, logger.LogLevelError, fmt.Sprintf("%s; User '%s' does not have menu access for paths %v", logPrefix, userId, menuPaths))
		res := response.Response(http.StatusForbidden, messages.MsgDenied, logId, nil)
		res.Error = response.Errors{Code: http.StatusForbidden, Message: messages.AccessDenied}
		ctx.AbortWithStatusJSON(http.StatusForbidden, res)
	}
}
