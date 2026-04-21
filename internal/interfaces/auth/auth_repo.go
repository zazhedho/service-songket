package interfaceauth

import "context"

import domainauth "service-songket/internal/domain/auth"

type RepoAuthInterface interface {
	Store(ctx context.Context, m domainauth.Blacklist) error
	GetByToken(ctx context.Context, token string) (domainauth.Blacklist, error)
}
