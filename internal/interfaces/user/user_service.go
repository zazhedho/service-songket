package interfaceuser

import (
	"context"
	domainuser "service-songket/internal/domain/user"
	"service-songket/internal/dto"
	"service-songket/pkg/filter"
)

type ServiceUserInterface interface {
	RegisterUser(ctx context.Context, req dto.UserRegister) (domainuser.Users, error)
	AdminCreateUser(ctx context.Context, req dto.AdminCreateUser) (domainuser.Users, error)
	LoginUser(ctx context.Context, req dto.Login, logId string) (string, error)
	LogoutUser(ctx context.Context, token string) error
	GetUserById(ctx context.Context, id string) (domainuser.Users, error)
	GetUserByEmail(ctx context.Context, email string) (domainuser.Users, error)
	GetUserByAuth(ctx context.Context, id string) (map[string]interface{}, error)
	GetAllUsers(ctx context.Context, params filter.BaseParams) ([]domainuser.Users, int64, error)
	Update(ctx context.Context, id string, req dto.UserUpdate) (domainuser.Users, error)
	ChangePassword(ctx context.Context, id string, req dto.ChangePassword) (domainuser.Users, error)
	ForgotPassword(ctx context.Context, req dto.ForgotPasswordRequest) (string, error)
	ResetPassword(ctx context.Context, req dto.ResetPasswordRequest) error
	Delete(ctx context.Context, id string) error
}
