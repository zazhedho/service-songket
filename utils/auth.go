package utils

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
)

func GetAuthData(ctx *gin.Context) map[string]interface{} {
	jwtClaims, _ := ctx.Get(CtxKeyAuthData)
	if jwtClaims != nil {
		return jwtClaims.(map[string]interface{})
	}
	return nil
}

func GetAuthPermissions(ctx *gin.Context) []string {
	authData := GetAuthData(ctx)
	if authData == nil {
		return nil
	}

	raw, ok := authData["permissions"]
	if !ok || raw == nil {
		return nil
	}

	switch typed := raw.(type) {
	case []string:
		return typed
	case []interface{}:
		perms := make([]string, 0, len(typed))
		for _, item := range typed {
			value := strings.TrimSpace(fmt.Sprint(item))
			if value != "" {
				perms = append(perms, value)
			}
		}
		return perms
	default:
		return nil
	}
}

func HasAuthPermission(ctx *gin.Context, resource, action string) bool {
	authData := GetAuthData(ctx)
	if authData == nil {
		return false
	}

	if InterfaceString(authData["role"]) == RoleSuperAdmin {
		return true
	}

	target := strings.TrimSpace(resource) + ":" + strings.TrimSpace(action)
	for _, permission := range GetAuthPermissions(ctx) {
		if strings.TrimSpace(permission) == target {
			return true
		}
	}

	return false
}
