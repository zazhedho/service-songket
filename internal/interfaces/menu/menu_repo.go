package interfacemenu

import (
	"context"
	domainmenu "service-songket/internal/domain/menu"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoMenuInterface interface {
	interfacegeneric.GenericRepository[domainmenu.MenuItem]

	GetByName(ctx context.Context, name string) (domainmenu.MenuItem, error)
	GetActiveMenus(ctx context.Context) ([]domainmenu.MenuItem, error)
	GetUserMenus(ctx context.Context, userId string) ([]domainmenu.MenuItem, error)
}
