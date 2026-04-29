package repositoryscope

import (
	"context"
	"fmt"
	"strings"

	"service-songket/internal/authscope"

	"gorm.io/gorm"
)

func ApplyOrderAccessScope(ctx context.Context, query *gorm.DB, alias, resource, allAction string) *gorm.DB {
	scope := authscope.FromContext(ctx)
	if scope.Has(resource, allAction) {
		return query
	}

	prefix := strings.TrimSpace(alias)
	if prefix == "" {
		prefix = "orders"
	}

	if dealerIDs := scope.ScopedDealerIDs(resource, allAction); len(dealerIDs) > 0 {
		return query.Where(fmt.Sprintf("%s.dealer_id IN ?", prefix), dealerIDs)
	}

	if ownerID := strings.TrimSpace(scope.UserID); ownerID != "" {
		return query.Where(fmt.Sprintf("%s.created_by = ?", prefix), ownerID)
	}

	return query.Where("1 = 0")
}
