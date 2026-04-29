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
	DealerIDs   []string
}

func New(userID, role string, permissions []string, dealerIDs ...[]string) Scope {
	permissionSet := make(map[string]struct{}, len(permissions))
	for _, permission := range permissions {
		trimmed := strings.TrimSpace(permission)
		if trimmed == "" {
			continue
		}
		permissionSet[trimmed] = struct{}{}
	}

	var cleanDealerIDs []string
	if len(dealerIDs) > 0 {
		seen := map[string]struct{}{}
		for _, dealerID := range dealerIDs[0] {
			trimmedID := strings.TrimSpace(dealerID)
			if trimmedID == "" {
				continue
			}
			if _, exists := seen[trimmedID]; exists {
				continue
			}
			seen[trimmedID] = struct{}{}
			cleanDealerIDs = append(cleanDealerIDs, trimmedID)
		}
	}

	return Scope{
		UserID:      strings.TrimSpace(userID),
		Role:        strings.TrimSpace(role),
		Permissions: permissionSet,
		DealerIDs:   cleanDealerIDs,
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

func (s Scope) ScopedDealerIDs(resource, allAction string) []string {
	if s.Has(resource, allAction) {
		return nil
	}
	return cleanIDs(s.DealerIDs)
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

func (s Scope) CanAccessDealer(dealerID string) bool {
	if strings.TrimSpace(s.Role) == utils.RoleSuperAdmin {
		return true
	}
	targetID := strings.TrimSpace(dealerID)
	if targetID == "" {
		return false
	}
	for _, scopedDealerID := range cleanIDs(s.DealerIDs) {
		if scopedDealerID == targetID {
			return true
		}
	}
	return false
}

func cleanIDs(values []string) []string {
	clean := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		clean = append(clean, trimmed)
	}
	return clean
}
