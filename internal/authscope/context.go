package authscope

import (
	"context"
	"strings"

	"service-songket/utils"
)

type contextKey string

const scopeContextKey contextKey = "auth_scope"

type Scope struct {
	UserID      string
	Role        string
	Permissions map[string]struct{}
}

func New(userID, role string, permissions []string) Scope {
	permissionSet := make(map[string]struct{}, len(permissions))
	for _, permission := range permissions {
		trimmed := strings.TrimSpace(permission)
		if trimmed == "" {
			continue
		}
		permissionSet[trimmed] = struct{}{}
	}

	return Scope{
		UserID:      strings.TrimSpace(userID),
		Role:        strings.TrimSpace(role),
		Permissions: permissionSet,
	}
}

func WithContext(ctx context.Context, scope Scope) context.Context {
	return context.WithValue(ctx, scopeContextKey, scope)
}

func FromContext(ctx context.Context) Scope {
	if ctx == nil {
		return Scope{}
	}
	scope, _ := ctx.Value(scopeContextKey).(Scope)
	if scope.Permissions == nil {
		scope.Permissions = map[string]struct{}{}
	}
	return scope
}

func (s Scope) Has(resource, action string) bool {
	if strings.TrimSpace(s.Role) == utils.RoleSuperAdmin {
		return true
	}
	_, ok := s.Permissions[strings.TrimSpace(resource)+":"+strings.TrimSpace(action)]
	return ok
}

func (s Scope) ScopedUserID(resource, allAction string) string {
	if s.Has(resource, allAction) {
		return ""
	}
	return strings.TrimSpace(s.UserID)
}

func (s Scope) CanAccessOwner(ownerID string) bool {
	if strings.TrimSpace(s.Role) == utils.RoleSuperAdmin {
		return true
	}
	currentUserID := strings.TrimSpace(s.UserID)
	if currentUserID == "" {
		return false
	}
	return currentUserID == strings.TrimSpace(ownerID)
}
