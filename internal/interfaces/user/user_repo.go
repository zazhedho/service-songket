package interfaceuser

import (
	"context"
	domainuser "service-songket/internal/domain/user"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoUserInterface interface {
	interfacegeneric.GenericRepository[domainuser.Users]

	GetByEmail(ctx context.Context, email string) (domainuser.Users, error)
	GetByPhone(ctx context.Context, phone string) (domainuser.Users, error)
	ListUserDealerIDs(ctx context.Context, userID string) ([]string, error)
	ListUserDealers(ctx context.Context, userID string) ([]domainuser.UserDealerAccess, error)
	SetUserDealerIDs(ctx context.Context, userID string, dealerIDs []string) error
}
